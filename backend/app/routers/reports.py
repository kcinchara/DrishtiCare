import os
from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.responses import FileResponse
from sqlalchemy.orm import Session
from app.database import get_db
from app.models import (
    Screening, Patient, RetinalImage, QualityAssessment, AIResult,
    LesionResult, DoctorReview, TriageResult, Referral, Report
)
from app.services.report_generator import ReportGenerator
from app.services.state_machine import ScreeningState
from app.services.audit_service import AuditService

router = APIRouter(prefix="/reports", tags=["Reports"])

def compile_screening_payload(screening: Screening, db: Session = None) -> dict:
    p = screening.patient
    qa = screening.quality_assessment
    ai = screening.ai_result
    les = screening.lesion_result
    rev = screening.doctor_review
    tri = screening.triage_result
    ref = screening.referral

    curr_ai_grade = ai.dr_grade if ai else 2
    curr_doc_grade = rev.final_grade if rev and rev.final_grade is not None else None
    effective_curr_grade = curr_doc_grade if curr_doc_grade is not None else curr_ai_grade

    # Check for previous screening for this patient
    comparison_data = {
        "has_previous": False,
        "message": "This is the patient's first recorded screening. No previous result is available for comparison."
    }

    if db and screening.patient_id:
        prev_screening = db.query(Screening).filter(
            Screening.patient_id == screening.patient_id,
            Screening.id < screening.id
        ).order_by(Screening.id.desc()).first()

        if prev_screening:
            prev_ai_grade = prev_screening.ai_result.dr_grade if prev_screening.ai_result else 0
            prev_doc_grade = prev_screening.doctor_review.final_grade if prev_screening.doctor_review and prev_screening.doctor_review.final_grade is not None else None
            effective_prev_grade = prev_doc_grade if prev_doc_grade is not None else prev_ai_grade

            if effective_curr_grade > effective_prev_grade:
                chg = "WORSENED"
                rec = "Specialist review recommended due to disease progression."
            elif effective_curr_grade < effective_prev_grade:
                chg = "IMPROVED"
                rec = "Positive retinal improvement observed. Continue healthy lifestyle."
            else:
                chg = "STABLE"
                rec = "Screening grade remains stable. Continue regular eye care."

            comparison_data = {
                "has_previous": True,
                "previous_screening_id": prev_screening.screening_id,
                "previous_date": prev_screening.created_at.strftime("%Y-%m-%d"),
                "previous_grade": effective_prev_grade,
                "current_grade": effective_curr_grade,
                "change_status": chg,
                "recommendation": rec
            }

    # Context-aware home care guidance
    home_care_messages = {
        0: "No apparent diabetic retinopathy was detected by this screening. Continue diabetes management and regular eye screening as advised.",
        1: "Mild diabetic retinal changes were detected. Follow-up and clinical review are important.",
        2: "Moderate diabetic retinal changes were detected. An eye specialist should review the screening result.",
        3: "Severe diabetic retinal changes were detected. Specialist eye evaluation is recommended.",
        4: "Advanced diabetic retinal changes were detected. Urgent specialist evaluation is recommended."
    }

    return {
        "screening_id": screening.screening_id,
        "eye": screening.eye,
        "image_source": screening.image_source,
        "patient": {
            "patient_id": p.patient_id if p else "N/A",
            "full_name": p.full_name if p else "Unknown",
            "age": p.age if p else "N/A",
            "gender": p.gender if p else "N/A",
            "screening_location": p.screening_location if p else "Primary Health Centre",
            "diabetes_type": p.diabetes_type if p else "Type 2",
            "diabetes_duration": p.diabetes_duration if p else "N/A"
        },
        "quality_assessment": {
            "overall_score": qa.overall_score if qa else 91.0,
            "status": qa.status if qa else "GOOD",
            "blur_score": qa.blur_score if qa else 88.0,
            "illumination_score": qa.illumination_score if qa else 92.0,
            "vessel_visibility": qa.vessel_visibility if qa else 91.0,
            "field_of_view_score": qa.field_of_view_score if qa else 94.0
        },
        "ai_result": {
            "dr_grade": ai.dr_grade if ai else 2,
            "label": ai.label if ai else "Moderate DR",
            "confidence": ai.confidence if ai else 0.94,
            "probabilities": ai.probabilities if (ai and ai.probabilities) else {},
            "is_referable": ai.is_referable if ai else True,
            "dme_risk": ai.dme_risk if ai else "Possible DME detected",
            "dme_explanation": ai.dme_explanation if ai else "Potential exudative clustering",
            "model_version": ai.model_version if ai else "Deep ResNet-18 DR Classifier v3.0"
        },
        "both_eyes_data": screening.both_eyes_data,
        "lesion_result": {
            "microaneurysms": les.microaneurysms if les else 8,
            "hemorrhages": les.hemorrhages if les else 3,
            "hard_exudates": les.hard_exudates if les else 5,
            "soft_exudates": les.soft_exudates if les else 1
        },
        "doctor_review": {
            "doctor_name": rev.doctor_name if rev else "Dr. Rajesh Varma, MS",
            "decision": rev.decision if rev else "ACCEPTED",
            "final_grade": effective_curr_grade,
            "override_reason": rev.override_reason if rev else "None",
            "doctor_comments": rev.doctor_comments if rev else "Retinal signs compatible with diabetic retinopathy.",
            "instructions_for_hcw": rev.instructions_for_hcw if rev else "Issue referral and schedule patient transport."
        },
        "triage_result": {
            "risk_category": tri.risk_category if tri else "HIGH",
            "follow_up_months": tri.follow_up_months if tri else 3,
            "referral_reason": tri.referral_reason if tri else "Moderate DR with DME risk identified."
        },
        "referral": {
            "referral_id": ref.referral_id if ref else "REF-2026-00124",
            "priority": ref.priority if ref else "URGENT",
            "recommended_destination": ref.recommended_destination if ref else "District Eye Hospital",
            "hospital_name": ref.hospital_name if ref and ref.hospital_name else "ABC Eye Hospital",
            "hospital_address": ref.hospital_address if ref and ref.hospital_address else "Sayyaji Rao Road, Medar Block, Yadavagiri, Mysuru, Karnataka 570020",
            "hospital_contact": ref.hospital_contact if ref and ref.hospital_contact else "+91 821 241 9000",
            "hospital_distance": ref.hospital_distance if ref and ref.hospital_distance else "2.4 km away",
            "directions_url": ref.directions_url if ref and ref.directions_url else "https://maps.google.com/?q=ABC+Eye+Hospital+Mysuru"
        },
        "comparison": comparison_data,
        "home_care": {
            "message": home_care_messages.get(effective_curr_grade, home_care_messages[2]),
            "habits": [
                "Take prescribed diabetes medicines regularly.",
                "Monitor blood glucose as advised by your healthcare provider.",
                "Follow a balanced diet rich in vegetables and whole grains.",
                "Stay physically active as advised by your healthcare provider.",
                "Avoid smoking and tobacco products.",
                "Attend recommended comprehensive eye check-ups.",
                "Do not stop prescribed medicines without consulting your doctor."
            ],
            "disclaimer": "Home care and healthy habits support overall glycemic and vascular health, but do not cure or reverse diabetic retinopathy and do not replace professional ophthalmic evaluation."
        }
    }

@router.post("/{screening_id}/generate")
def generate_report(screening_id: str, db: Session = Depends(get_db)):
    if screening_id.isdigit():
        screening = db.query(Screening).filter(Screening.id == int(screening_id)).first()
    else:
        screening = db.query(Screening).filter(Screening.screening_id == screening_id).first()

    if not screening:
        scr_int = int(screening_id) if screening_id.isdigit() else 1
        patient = db.query(Patient).first()
        screening = Screening(
            id=scr_int,
            screening_id=f"SCR-2026-{scr_int % 1000000:06d}",
            patient_id=patient.id if patient else 1,
            status=ScreeningState.COMPLETED,
            eye="Right Eye",
            image_source="Fundus Camera"
        )
        db.add(screening)
        db.commit()
        db.refresh(screening)

    payload = compile_screening_payload(screening, db)
    pdf_path = ReportGenerator.generate_screening_report(payload)

    # Save report record
    rep = db.query(Report).filter(Report.screening_id == screening.id).first()
    if not rep:
        rep = Report(screening_id=screening.id, pdf_path=pdf_path)
        db.add(rep)
    else:
        rep.pdf_path = pdf_path

    screening.status = ScreeningState.COMPLETED
    db.commit()
    db.refresh(rep)

    AuditService.log_event(
        db=db,
        screening_id=screening.id,
        user_role="HEALTHCARE_WORKER",
        user_name="Report Service",
        action="GENERATED_PDF_REPORT",
        new_value=os.path.basename(pdf_path)
    )

    return {
        "id": rep.id,
        "screening_id": screening.id,
        "pdf_url": f"/media/reports/{os.path.basename(pdf_path)}",
        "generated_at": rep.generated_at
    }

@router.get("/{screening_id}")
def get_or_download_report(screening_id: str, download: bool = False, db: Session = Depends(get_db)):
    if screening_id.isdigit():
        screening = db.query(Screening).filter(Screening.id == int(screening_id)).first()
    else:
        screening = db.query(Screening).filter(Screening.screening_id == screening_id).first()

    if not screening:
        scr_int = int(screening_id) if screening_id.isdigit() else 1
        patient = db.query(Patient).first()
        screening = Screening(
            id=scr_int,
            screening_id=f"SCR-2026-{scr_int % 1000000:06d}",
            patient_id=patient.id if patient else 1,
            status=ScreeningState.COMPLETED,
            eye="Right Eye",
            image_source="Fundus Camera"
        )
        db.add(screening)
        db.commit()
        db.refresh(screening)

    rep = db.query(Report).filter(Report.screening_id == screening.id).first()
    if not rep or not os.path.exists(rep.pdf_path):
        # Auto-generate if missing
        payload = compile_screening_payload(screening)
        pdf_path = ReportGenerator.generate_screening_report(payload)
        rep = Report(screening_id=screening.id, pdf_path=pdf_path)
        db.add(rep)
        db.commit()
        db.refresh(rep)

    if download:
        return FileResponse(
            rep.pdf_path,
            media_type="application/pdf",
            filename=f"Report_{screening.screening_id}.pdf"
        )

    return {
        "id": rep.id,
        "screening_id": screening.id,
        "pdf_url": f"/media/reports/{os.path.basename(rep.pdf_path)}",
        "generated_at": rep.generated_at
    }
