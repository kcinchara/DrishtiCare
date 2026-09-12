import os
import shutil
import random
import cv2
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form, status
from sqlalchemy.orm import Session, joinedload
from app.config import settings
from app.database import get_db
from app.models import (
    Screening, Patient, RetinalImage, QualityAssessment, Enhancement,
    AIResult, LesionResult, VesselResult, Explanation, DoctorReview, TriageResult, Referral, Report, User,
    ScreeningComparison
)
from app.schemas import (
    ScreeningCreate, ScreeningUpdate, ScreeningDetailResponse, RetinalImageResponse
)
from app.services.state_machine import ScreeningStateMachine, ScreeningState
from app.services.audit_service import AuditService
from app.utils.sample_generator import generate_synthetic_fundus
from app.ai.quality.fundus_validator import validate_fundus_image
from app.ai.orchestrator import orchestrator
from app.utils.security import get_current_user, is_doctor_role, is_admin_role, is_asha_role

router = APIRouter(prefix="/screenings", tags=["Screenings"])

def generate_screening_id(db: Session) -> str:
    count = db.query(Screening).count() + 1
    return f"SCR-2026-{count:06d}"

def generate_comparison_id(db: Session) -> str:
    count = db.query(ScreeningComparison).count() + 1
    return f"CMP-2026-{count:05d}"


@router.post("", status_code=status.HTTP_201_CREATED)
def create_screening(
    screening_in: ScreeningCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    patient = db.query(Patient).filter(Patient.id == screening_in.patient_id).first()
    if not patient:
        raise HTTPException(status_code=404, detail="Patient not found")

    scr_id = generate_screening_id(db)
    screening = Screening(
        screening_id=scr_id,
        patient_id=screening_in.patient_id,
        performed_by=current_user.id,
        doctor_id=screening_in.doctor_id or patient.assigned_doctor_id,
        hospital_id=current_user.hospital_id or patient.hospital_id or "HOSP-001",
        status=ScreeningState.PATIENT_REGISTERED,
        eye=screening_in.eye,
        image_source=screening_in.image_source,
        notes=screening_in.notes
    )
    db.add(screening)
    db.commit()
    db.refresh(screening)

    AuditService.log_event(
        db=db,
        screening_id=screening.id,
        user_role="HEALTHCARE_WORKER",
        user_name="System",
        action="CREATED_SCREENING",
        new_value=screening.screening_id,
        details=f"Initiated screening for Patient {patient.patient_id}"
    )

    return {
        "id": screening.id,
        "screening_id": screening.screening_id,
        "patient_id": screening.patient_id,
        "status": screening.status,
        "eye": screening.eye,
        "image_source": screening.image_source,
        "notes": screening.notes,
        "created_at": screening.created_at
    }

@router.get("")
def list_screenings(
    skip: int = 0,
    limit: int = 100,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    query = db.query(Screening).options(
        joinedload(Screening.patient),
        joinedload(Screening.retinal_image),
        joinedload(Screening.ai_result),
        joinedload(Screening.doctor_review),
        joinedload(Screening.triage_result),
        joinedload(Screening.referral)
    )

    if is_admin_role(current_user.role):
        pass
    elif is_doctor_role(current_user.role):
        query = query.filter(
            (Screening.doctor_id == current_user.id) |
            (Screening.hospital_id == current_user.hospital_id) |
            (Screening.performed_by == current_user.id) |
            (Screening.submission_status.in_(["SUBMITTED_TO_DOCTOR", "REVIEWED"])) |
            (Screening.status.in_([ScreeningState.DOCTOR_REVIEW, ScreeningState.RESULT_READY, ScreeningState.TRIAGED, ScreeningState.COMPLETED]))
        )
    else:
        query = query.filter(Screening.performed_by == current_user.id)

    screenings = query.order_by(Screening.id.desc()).offset(skip).limit(limit).all()

    result = []
    for s in screenings:
        ai = s.ai_result
        rev = s.doctor_review
        tri = s.triage_result
        ref = s.referral
        img_url = f"/media/uploads/{s.retinal_image.filename}" if s.retinal_image else None
        result.append({
            "id": s.id,
            "screening_id": s.screening_id,
            "patient_id": s.patient_id,
            "patient_code": s.patient.patient_id if s.patient else "N/A",
            "patient_name": s.patient.full_name if s.patient else "N/A",
            "date": s.created_at.strftime("%Y-%m-%d"),
            "eye": s.eye,
            "status": s.status,
            "submission_status": getattr(s, "submission_status", "DRAFT") or "DRAFT",
            "image_url": img_url,
            "dr_grade": f"Level {ai.dr_grade}" if ai else "Pending",
            "dr_label": ai.label if ai else "Pending Analysis",
            "confidence": ai.confidence if ai else None,
            "dme_risk": ai.dme_risk if ai else "Low",
            "referable": ai.is_referable if ai else False,
            "doctor_decision": rev.decision if rev else "Pending Review",
            "doctor_clinical_assessment": getattr(s, "doctor_clinical_assessment", None),
            "doctor_final_grade": rev.final_grade if rev else None,
            "triage_risk": tri.risk_category if tri else ("HIGH" if ai and ai.is_referable else "LOW"),
            "referral_id": ref.referral_id if ref else None
        })
    return result

@router.get("/{screening_id}")
def get_screening_detail(
    screening_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    if screening_id.isdigit():
        screening = db.query(Screening).filter(Screening.id == int(screening_id)).first()
    else:
        screening = db.query(Screening).filter(Screening.screening_id == screening_id).first()

    if not screening:
        raise HTTPException(status_code=404, detail="Screening not found")

    # Strict user isolation check
    if not (is_admin_role(current_user.role) or is_doctor_role(current_user.role)):
        if screening.performed_by and screening.performed_by != current_user.id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Unauthorized: You do not have permission to view this screening record."
            )

    # Serialize with all related objects
    return {
        "id": screening.id,
        "screening_id": screening.screening_id,
        "patient_id": screening.patient_id,
        "status": screening.status,
        "submission_status": getattr(screening, 'submission_status', 'DRAFT') or 'DRAFT',
        "doctor_clinical_assessment": getattr(screening, 'doctor_clinical_assessment', None),
        "both_eyes_data": getattr(screening, 'both_eyes_data', None) or {},
        "eye": screening.eye,
        "image_source": screening.image_source,
        "notes": screening.notes,
        "created_at": screening.created_at,
        "updated_at": screening.updated_at,
        "patient": {
            "id": screening.patient.id,
            "patient_id": screening.patient.patient_id,
            "full_name": screening.patient.full_name,
            "age": screening.patient.age,
            "gender": screening.patient.gender,
            "diabetes_duration": screening.patient.diabetes_duration,
            "diabetes_type": screening.patient.diabetes_type,
            "language": screening.patient.language,
            "screening_location": screening.patient.screening_location,
            "contact_number": screening.patient.contact_number,
            "previous_dr_history": screening.patient.previous_dr_history,
            "previous_eye_exam": screening.patient.previous_eye_exam,
            "last_screening_date": screening.patient.last_screening_date,
            "blood_glucose": screening.patient.blood_glucose,
            "hba1c": screening.patient.hba1c,
            "treatment_info": screening.patient.treatment_info,
            "created_at": screening.patient.created_at
        } if screening.patient else None,
        "retinal_image": {
            "id": screening.retinal_image.id,
            "original_path": screening.retinal_image.original_path,
            "filename": screening.retinal_image.filename,
            "url": f"/media/uploads/{screening.retinal_image.filename}",
            "width": screening.retinal_image.width,
            "height": screening.retinal_image.height,
            "file_size": screening.retinal_image.file_size,
            "created_at": screening.retinal_image.created_at
        } if screening.retinal_image else None,
        "quality_assessment": {
            "overall_score": screening.quality_assessment.overall_score,
            "status": screening.quality_assessment.status,
            "blur_score": screening.quality_assessment.blur_score,
            "illumination_score": screening.quality_assessment.illumination_score,
            "glare_score": screening.quality_assessment.glare_score,
            "field_of_view_score": screening.quality_assessment.field_of_view_score,
            "vessel_visibility": screening.quality_assessment.vessel_visibility,
            "retinal_coverage_score": screening.quality_assessment.retinal_coverage_score,
            "recommendation": screening.quality_assessment.recommendation,
            "reasons": screening.quality_assessment.reasons or []
        } if screening.quality_assessment else None,
        "enhancement": {
            "enhanced_path": screening.enhancement.enhanced_path,
            "url": f"/media/enhanced/{os.path.basename(screening.enhancement.enhanced_path)}",
            "clahe_applied": screening.enhancement.clahe_applied,
            "illumination_normalized": screening.enhancement.illumination_normalized,
            "noise_reduced": screening.enhancement.noise_reduced,
            "contrast_enhanced": screening.enhancement.contrast_enhanced,
            "quality_status": screening.enhancement.quality_status
        } if screening.enhancement else None,
        "ai_result": {
            "dr_grade": screening.ai_result.dr_grade,
            "label": screening.ai_result.label,
            "confidence": screening.ai_result.confidence,
            "probabilities": screening.ai_result.probabilities or {},
            "model_version": screening.ai_result.model_version,
            "is_referable": screening.ai_result.is_referable,
            "dme_risk": screening.ai_result.dme_risk,
            "dme_confidence": screening.ai_result.dme_confidence,
            "dme_explanation": screening.ai_result.dme_explanation
        } if screening.ai_result else None,
        "lesion_result": {
            "microaneurysms": screening.lesion_result.microaneurysms,
            "hemorrhages": screening.lesion_result.hemorrhages,
            "hard_exudates": screening.lesion_result.hard_exudates,
            "soft_exudates": screening.lesion_result.soft_exudates,
            "url": f"/media/explanations/{os.path.basename(screening.lesion_result.lesion_map_path)}" if screening.lesion_result.lesion_map_path else None,
            "detections": screening.lesion_result.detections or [],
            "confidence": screening.lesion_result.confidence
        } if screening.lesion_result else None,
        "vessel_result": {
            "vessel_visibility": screening.vessel_result.vessel_visibility,
            "mask_url": f"/media/explanations/{os.path.basename(screening.vessel_result.mask_path)}" if screening.vessel_result.mask_path else None,
            "overlay_url": f"/media/explanations/{os.path.basename(screening.vessel_result.overlay_path)}" if screening.vessel_result.overlay_path else None
        } if screening.vessel_result else None,
        "explanation": {
            "gradcam_url": f"/media/explanations/{os.path.basename(screening.explanation.gradcam_path)}" if screening.explanation.gradcam_path else None,
            "overlay_url": f"/media/explanations/{os.path.basename(screening.explanation.overlay_path)}" if screening.explanation.overlay_path else None,
            "combined_url": f"/media/explanations/{os.path.basename(screening.explanation.combined_path)}" if screening.explanation.combined_path else None,
            "reasoning_summary": screening.explanation.reasoning_summary
        } if screening.explanation else None,
        "doctor_review": {
            "id": screening.doctor_review.id,
            "doctor_name": screening.doctor_review.doctor_name,
            "decision": screening.doctor_review.decision,
            "final_grade": screening.doctor_review.final_grade,
            "override_reason": screening.doctor_review.override_reason,
            "doctor_comments": screening.doctor_review.doctor_comments,
            "instructions_for_hcw": screening.doctor_review.instructions_for_hcw,
            "created_at": screening.doctor_review.created_at
        } if screening.doctor_review else None,
        "triage_result": {
            "id": screening.triage_result.id,
            "risk_category": screening.triage_result.risk_category,
            "follow_up_months": screening.triage_result.follow_up_months,
            "referral_recommended": screening.triage_result.referral_recommended,
            "referral_reason": screening.triage_result.referral_reason,
            "priority": screening.triage_result.priority,
            "threshold_rules_applied": screening.triage_result.threshold_rules_applied or {}
        } if screening.triage_result else None,
        "referral": {
            "id": screening.referral.id,
            "referral_id": screening.referral.referral_id,
            "priority": screening.referral.priority,
            "reason": screening.referral.reason,
            "recommended_destination": screening.referral.recommended_destination,
            "hospital_name": getattr(screening.referral, 'hospital_name', None) or screening.referral.recommended_destination or "ABC Eye Hospital",
            "hospital_address": getattr(screening.referral, 'hospital_address', None) or "Sayyaji Rao Road, Medar Block, Yadavagiri, Mysuru, Karnataka 570020",
            "hospital_contact": getattr(screening.referral, 'hospital_contact', None) or "+91 821 241 9300",
            "hospital_distance": getattr(screening.referral, 'hospital_distance', None) or "2.4 km away",
            "directions_url": getattr(screening.referral, 'directions_url', None) or "https://www.google.com/maps/search/?api=1&query=ABC+Eye+Hospital+Mysuru",
            "doctor_comments": screening.referral.doctor_comments,
            "status": screening.referral.status,
            "created_at": screening.referral.created_at
        } if screening.referral else None,
        "report": {
            "pdf_url": f"/media/reports/{os.path.basename(screening.report.pdf_path)}" if screening.report else None,
            "generated_at": screening.report.generated_at if screening.report else None
        } if screening.report else None
    }

@router.get("/{screening_id}/comparison")
def get_screening_comparison(
    screening_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    if screening_id.isdigit():
        screening = db.query(Screening).filter(Screening.id == int(screening_id)).first()
    else:
        screening = db.query(Screening).filter(Screening.screening_id == screening_id).first()

    if not screening:
        raise HTTPException(status_code=404, detail="Screening not found")

    # Access control check
    if current_user.role not in ("ADMIN", "DOCTOR", "OPHTHALMOLOGIST"):
        if screening.performed_by and screening.performed_by != current_user.id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Unauthorized to access this screening record."
            )

    # Find the most recent previous screening for the same patient
    previous_screening = (
        db.query(Screening)
        .filter(
            Screening.patient_id == screening.patient_id,
            Screening.id < screening.id
        )
        .order_by(Screening.id.desc())
        .first()
    )

    if not previous_screening:
        return {
            "has_previous": False,
            "message": "This is the patient's first recorded screening. No previous result is available for comparison.",
            "patient_id": screening.patient.patient_id if screening.patient else "N/A",
            "patient_name": screening.patient.full_name if screening.patient else "N/A",
            "current_screening": {
                "id": screening.id,
                "screening_id": screening.screening_id,
                "date": screening.created_at.strftime("%Y-%m-%d"),
                "dr_grade": screening.ai_result.dr_grade if screening.ai_result else 0,
                "dr_label": screening.ai_result.label if screening.ai_result else "No DR",
                "doctor_grade": screening.doctor_review.final_grade if screening.doctor_review and screening.doctor_review.final_grade is not None else None,
                "image_url": f"/media/uploads/{screening.retinal_image.filename}" if screening.retinal_image else None
            }
        }

    # Extract previous and current grades (prioritizing doctor confirmed assessment if present)
    prev_ai_grade = previous_screening.ai_result.dr_grade if previous_screening.ai_result else 0
    prev_doc_grade = previous_screening.doctor_review.final_grade if previous_screening.doctor_review and previous_screening.doctor_review.final_grade is not None else None
    effective_prev_grade = prev_doc_grade if prev_doc_grade is not None else prev_ai_grade

    curr_ai_grade = screening.ai_result.dr_grade if screening.ai_result else 0
    curr_doc_grade = screening.doctor_review.final_grade if screening.doctor_review and screening.doctor_review.final_grade is not None else None
    effective_curr_grade = curr_doc_grade if curr_doc_grade is not None else curr_ai_grade

    if effective_curr_grade > effective_prev_grade:
        change_status = "WORSENED"
        rec = "⚠️ Specialist ophthalmology consultation recommended due to increased diabetic retinal severity."
    elif effective_curr_grade < effective_prev_grade:
        change_status = "IMPROVED"
        rec = "✓ Positive improvement noted in retinal vascular signs. Continue prescribed diabetes management and regular eye screening."
    else:
        change_status = "STABLE"
        rec = "Retinal microvascular condition appears stable compared to the previous screening. Continue regular monitoring."

    # Compare lesion findings
    prev_lesions = previous_screening.lesion_result
    curr_lesions = screening.lesion_result
    findings_diff = {
        "microaneurysms": {
            "previous": prev_lesions.microaneurysms if prev_lesions else 0,
            "current": curr_lesions.microaneurysms if curr_lesions else 0
        },
        "hemorrhages": {
            "previous": prev_lesions.hemorrhages if prev_lesions else 0,
            "current": curr_lesions.hemorrhages if curr_lesions else 0
        },
        "hard_exudates": {
            "previous": prev_lesions.hard_exudates if prev_lesions else 0,
            "current": curr_lesions.hard_exudates if curr_lesions else 0
        },
        "dme_risk": {
            "previous": previous_screening.ai_result.dme_risk if previous_screening.ai_result else "Low",
            "current": screening.ai_result.dme_risk if screening.ai_result else "Low"
        }
    }

    summary = (
        f"Screening grade changed from DR {effective_prev_grade} to DR {effective_curr_grade} "
        f"({change_status.lower()}). "
    )
    if change_status == "WORSENED":
        summary += "Higher severity of diabetic retinal lesions detected compared to the earlier screening."
    elif change_status == "IMPROVED":
        summary += "Reduced severity or lesion count observed relative to previous examination."
    else:
        summary += "No significant progression or change in retinopathy grade observed."

    # Look for existing comparison record or create one
    comparison = db.query(ScreeningComparison).filter(
        ScreeningComparison.current_screening_id == screening.id
    ).first()

    if not comparison:
        comp_id = generate_comparison_id(db)
        comparison = ScreeningComparison(
            comparison_id=comp_id,
            patient_id=screening.patient_id,
            previous_screening_id=previous_screening.id,
            current_screening_id=screening.id,
            previous_grade=effective_prev_grade,
            current_grade=effective_curr_grade,
            change_status=change_status,
            comparison_summary=summary,
            doctor_previous_grade=prev_doc_grade,
            doctor_current_grade=curr_doc_grade,
            findings_diff=findings_diff
        )
        db.add(comparison)
        db.commit()
        db.refresh(comparison)
    else:
        comparison.previous_grade = effective_prev_grade
        comparison.current_grade = effective_curr_grade
        comparison.change_status = change_status
        comparison.comparison_summary = summary
        comparison.doctor_previous_grade = prev_doc_grade
        comparison.doctor_current_grade = curr_doc_grade
        comparison.findings_diff = findings_diff
        db.commit()
        db.refresh(comparison)

    return {
        "has_previous": True,
        "comparison_id": comparison.comparison_id,
        "patient_id": screening.patient.patient_id if screening.patient else "N/A",
        "patient_name": screening.patient.full_name if screening.patient else "N/A",
        "previous_screening": {
            "id": previous_screening.id,
            "screening_id": previous_screening.screening_id,
            "date": previous_screening.created_at.strftime("%Y-%m-%d"),
            "dr_grade": effective_prev_grade,
            "ai_grade": prev_ai_grade,
            "doctor_grade": prev_doc_grade,
            "dr_label": previous_screening.ai_result.label if previous_screening.ai_result else f"DR {effective_prev_grade}",
            "findings": {
                "microaneurysms": prev_lesions.microaneurysms if prev_lesions else 0,
                "hemorrhages": prev_lesions.hemorrhages if prev_lesions else 0,
                "hard_exudates": prev_lesions.hard_exudates if prev_lesions else 0,
            },
            "image_url": f"/media/uploads/{previous_screening.retinal_image.filename}" if previous_screening.retinal_image else None
        },
        "current_screening": {
            "id": screening.id,
            "screening_id": screening.screening_id,
            "date": screening.created_at.strftime("%Y-%m-%d"),
            "dr_grade": effective_curr_grade,
            "ai_grade": curr_ai_grade,
            "doctor_grade": curr_doc_grade,
            "dr_label": screening.ai_result.label if screening.ai_result else f"DR {effective_curr_grade}",
            "findings": {
                "microaneurysms": curr_lesions.microaneurysms if curr_lesions else 0,
                "hemorrhages": curr_lesions.hemorrhages if curr_lesions else 0,
                "hard_exudates": curr_lesions.hard_exudates if curr_lesions else 0,
            },
            "image_url": f"/media/uploads/{screening.retinal_image.filename}" if screening.retinal_image else None
        },
        "previous_grade": effective_prev_grade,
        "current_grade": effective_curr_grade,
        "change_status": change_status,
        "comparison_summary": summary,
        "recommendation": rec,
        "findings_diff": findings_diff,
        "created_at": comparison.created_at
    }


@router.put("/{screening_id}")
def update_screening(screening_id: str, update_in: ScreeningUpdate, db: Session = Depends(get_db)):
    if screening_id.isdigit():
        screening = db.query(Screening).filter(Screening.id == int(screening_id)).first()
    else:
        screening = db.query(Screening).filter(Screening.screening_id == screening_id).first()

    if not screening:
        raise HTTPException(status_code=404, detail="Screening not found")

    if update_in.status:
        # Validate state machine transition
        ScreeningStateMachine.validate_transition(screening.status, update_in.status)
        old_status = screening.status
        screening.status = update_in.status
        AuditService.log_event(
            db=db,
            screening_id=screening.id,
            user_role="HEALTHCARE_WORKER",
            user_name="System",
            action="STATE_TRANSITION",
            previous_value=old_status,
            new_value=update_in.status
        )

    if update_in.eye:
        screening.eye = update_in.eye
    if update_in.image_source:
        screening.image_source = update_in.image_source
    if update_in.notes is not None:
        screening.notes = update_in.notes

    db.commit()
    db.refresh(screening)
    return screening

@router.post("/{screening_id}/image")
async def upload_screening_image(
    screening_id: str,
    file: Optional[UploadFile] = File(None),
    use_demo_sample: Optional[bool] = Form(False),
    sample_grade: Optional[int] = Form(2),
    eye: Optional[str] = Form(None),
    image_source: Optional[str] = Form(None),
    db: Session = Depends(get_db)
):
    if screening_id.isdigit():
        screening = db.query(Screening).filter(Screening.id == int(screening_id)).first()
    else:
        screening = db.query(Screening).filter(Screening.screening_id == screening_id).first()

    if not screening:
        raise HTTPException(status_code=404, detail="Screening not found")

    if eye:
        screening.eye = eye
    if image_source:
        screening.image_source = image_source

    if use_demo_sample or file is None:
        # Generate or link synthetic authentic fundus sample
        filename = f"{screening.screening_id}_fundus_g{sample_grade}.jpg"
        filepath = generate_synthetic_fundus(grade=sample_grade, filename=filename, force_recreate=True)
        file_size = os.path.getsize(filepath)
        width, height = 512, 512
        mime_type = "image/jpeg"
    else:
        # Validate uploaded file type
        valid_extensions = [".jpg", ".jpeg", ".png"]
        ext = os.path.splitext(file.filename)[1].lower()
        if ext not in valid_extensions:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Unsupported image format. Allowed formats: JPG, JPEG, PNG."
            )

        filename = f"{screening.screening_id}_{int(random.randint(1000, 9999))}{ext}"
        dest_path = settings.UPLOAD_DIR / filename

        with open(dest_path, "wb") as buffer:
            shutil.copyfileobj(file.file, buffer)

        filepath = str(dest_path)
        file_size = os.path.getsize(filepath)

        # Validate image dimensions and inspect with OpenCV
        img_check = cv2.imread(filepath)
        if img_check is None:
            os.remove(filepath)
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Corrupt or unreadable image file."
            )

        height, width, _ = img_check.shape
        if width < 200 or height < 200:
            os.remove(filepath)
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Image resolution is too low (< 200x200). Please upload a valid retinal fundus image."
            )

        # Validate that uploaded image is a genuine retinal fundus photograph
        is_fundus, fundus_err = validate_fundus_image(img_check)
        if not is_fundus:
            os.remove(filepath)
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="This image does not appear to be a retinal fundus photograph. Please upload a clear fundus image of the eye."
            )

        mime_type = file.content_type or "image/jpeg"

    # Remove existing retinal image if present
    if screening.retinal_image:
        db.delete(screening.retinal_image)
        db.commit()

    retinal_img = RetinalImage(
        screening_id=screening.id,
        original_path=filepath,
        filename=filename,
        mime_type=mime_type,
        file_size=file_size,
        width=width,
        height=height,
        is_retinal_confirmed=True
    )
    db.add(retinal_img)
    
    # Transition screening state to IMAGE_CAPTURED
    screening.status = ScreeningState.IMAGE_CAPTURED
    db.commit()
    db.refresh(screening)

    AuditService.log_event(
        db=db,
        screening_id=screening.id,
        user_role="HEALTHCARE_WORKER",
        user_name="Healthcare Worker",
        action="UPLOADED_RETINAL_IMAGE",
        new_value=filename,
        details=f"Resolution: {width}x{height}, Source: {screening.image_source}"
    )

    return {
        "message": "Retinal image successfully stored",
        "retinal_image": {
            "id": retinal_img.id,
            "filename": filename,
            "url": f"/media/uploads/{filename}",
            "width": width,
            "height": height,
            "file_size": file_size
        },
        "screening_status": screening.status
    }

@router.delete("/{screening_id}/image")
def delete_screening_image(screening_id: str, db: Session = Depends(get_db)):
    if screening_id.isdigit():
        screening = db.query(Screening).filter(Screening.id == int(screening_id)).first()
    else:
        screening = db.query(Screening).filter(Screening.screening_id == screening_id).first()

    if not screening or not screening.retinal_image:
        raise HTTPException(status_code=404, detail="No retinal image found for this screening")

    db.delete(screening.retinal_image)
    screening.status = ScreeningState.PATIENT_REGISTERED
    db.commit()
    return {"message": "Retinal image removed"}

@router.post("/{screening_id}/submit-to-doctor")
def submit_screening_to_doctor(
    screening_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    if screening_id.isdigit():
        screening = db.query(Screening).filter(Screening.id == int(screening_id)).first()
    else:
        screening = db.query(Screening).filter(Screening.screening_id == screening_id).first()

    if not screening:
        raise HTTPException(status_code=404, detail="Screening not found")

    if not screening.ai_result or not screening.retinal_image:
        raise HTTPException(
            status_code=400,
            detail="Screening stages incomplete. Retinal image and AI analysis must be completed prior to doctor submission."
        )

    screening.submission_status = "SUBMITTED_TO_DOCTOR"
    screening.status = ScreeningState.DOCTOR_REVIEW

    db.commit()
    db.refresh(screening)

    AuditService.log_event(
        db=db,
        screening_id=screening.id,
        user_role=current_user.role,
        user_name=current_user.full_name,
        action="SUBMITTED_TO_DOCTOR",
        new_value="SUBMITTED_TO_DOCTOR",
        details="ASHA worker submitted complete screening report for ophthalmologist review."
    )

    return {
        "success": True,
        "message": "Screening successfully sent for doctor review.",
        "screening_id": screening.screening_id,
        "submission_status": screening.submission_status,
        "status": screening.status
    }

@router.post("/{screening_id}/both-eyes/upload")
async def upload_both_eyes_images(
    screening_id: str,
    file_left: Optional[UploadFile] = File(None),
    file_right: Optional[UploadFile] = File(None),
    left_sample_grade: Optional[int] = Form(None),
    right_sample_grade: Optional[int] = Form(None),
    db: Session = Depends(get_db)
):
    if screening_id.isdigit():
        screening = db.query(Screening).filter(Screening.id == int(screening_id)).first()
    else:
        screening = db.query(Screening).filter(Screening.screening_id == screening_id).first()

    if not screening:
        raise HTTPException(status_code=404, detail="Screening not found")

    both_data = dict(screening.both_eyes_data or {})

    # Process Left Eye
    if file_left:
        ext = os.path.splitext(file_left.filename)[1].lower()
        if ext not in [".jpg", ".jpeg", ".png"]:
            raise HTTPException(status_code=400, detail="Invalid format for Left Eye. Allowed formats: JPG, JPEG, PNG.")
        fname_left = f"{screening.screening_id}_OS_{int(random.randint(1000, 9999))}{ext}"
        path_left = settings.UPLOAD_DIR / fname_left
        with open(path_left, "wb") as f:
            shutil.copyfileobj(file_left.file, f)
        img_l = cv2.imread(str(path_left))
        if img_l is None:
            os.remove(str(path_left))
            raise HTTPException(status_code=400, detail="Corrupt Left Eye image file.")
        is_f, _ = validate_fundus_image(img_l)
        if not is_f:
            os.remove(str(path_left))
            raise HTTPException(status_code=400, detail="Image quality is insufficient for reliable screening. Please upload a clear fundus image of the left eye.")
        both_data["left_eye"] = {
            "path": str(path_left),
            "filename": fname_left,
            "url": f"/media/uploads/{fname_left}",
            "width": img_l.shape[1],
            "height": img_l.shape[0]
        }
    elif left_sample_grade is not None:
        fname_left = f"{screening.screening_id}_OS_fundus_g{left_sample_grade}.jpg"
        path_left = generate_synthetic_fundus(grade=left_sample_grade, filename=fname_left)
        both_data["left_eye"] = {
            "path": path_left,
            "filename": fname_left,
            "url": f"/media/uploads/{fname_left}",
            "width": 512,
            "height": 512
        }

    # Process Right Eye
    if file_right:
        ext = os.path.splitext(file_right.filename)[1].lower()
        if ext not in [".jpg", ".jpeg", ".png"]:
            raise HTTPException(status_code=400, detail="Invalid format for Right Eye. Allowed formats: JPG, JPEG, PNG.")
        fname_right = f"{screening.screening_id}_OD_{int(random.randint(1000, 9999))}{ext}"
        path_right = settings.UPLOAD_DIR / fname_right
        with open(path_right, "wb") as f:
            shutil.copyfileobj(file_right.file, f)
        img_r = cv2.imread(str(path_right))
        if img_r is None:
            os.remove(str(path_right))
            raise HTTPException(status_code=400, detail="Corrupt Right Eye image file.")
        is_f, _ = validate_fundus_image(img_r)
        if not is_f:
            os.remove(str(path_right))
            raise HTTPException(status_code=400, detail="Image quality is insufficient for reliable screening. Please upload a clear fundus image of the right eye.")
        both_data["right_eye"] = {
            "path": str(path_right),
            "filename": fname_right,
            "url": f"/media/uploads/{fname_right}",
            "width": img_r.shape[1],
            "height": img_r.shape[0]
        }
    elif right_sample_grade is not None:
        fname_right = f"{screening.screening_id}_OD_fundus_g{right_sample_grade}.jpg"
        path_right = generate_synthetic_fundus(grade=right_sample_grade, filename=fname_right)
        both_data["right_eye"] = {
            "path": path_right,
            "filename": fname_right,
            "url": f"/media/uploads/{fname_right}",
            "width": 512,
            "height": 512
        }

    # Also keep standard RetinalImage updated with right eye (or left eye) for compatibility
    primary_eye = both_data.get("right_eye") or both_data.get("left_eye")
    if primary_eye:
        if screening.retinal_image:
            screening.retinal_image.original_path = primary_eye["path"]
            screening.retinal_image.filename = primary_eye["filename"]
            screening.retinal_image.width = primary_eye["width"]
            screening.retinal_image.height = primary_eye["height"]
        else:
            retinal_img = RetinalImage(
                screening_id=screening.id,
                original_path=primary_eye["path"],
                filename=primary_eye["filename"],
                mime_type="image/jpeg",
                file_size=os.path.getsize(primary_eye["path"]) if os.path.exists(primary_eye["path"]) else 0,
                width=primary_eye["width"],
                height=primary_eye["height"],
                is_retinal_confirmed=True
            )
            db.add(retinal_img)

    screening.both_eyes_data = both_data
    screening.eye = "Both Eyes"
    screening.status = ScreeningState.IMAGE_CAPTURED
    db.commit()
    db.refresh(screening)

    return {
        "message": "Both eyes images successfully stored",
        "both_eyes_data": both_data,
        "screening_status": screening.status
    }

@router.post("/{screening_id}/both-eyes/analyze")
def analyze_both_eyes(
    screening_id: str,
    db: Session = Depends(get_db)
):
    if screening_id.isdigit():
        screening = db.query(Screening).filter(Screening.id == int(screening_id)).first()
    else:
        screening = db.query(Screening).filter(Screening.screening_id == screening_id).first()

    if not screening or not screening.both_eyes_data:
        raise HTTPException(status_code=400, detail="No both-eyes image data found for this screening")

    both_data = dict(screening.both_eyes_data)
    results = {}

    for eye_key, eye_name in [("left_eye", "Left Eye (OS)"), ("right_eye", "Right Eye (OD)")]:
        if eye_key in both_data and "path" in both_data[eye_key]:
            eye_path = both_data[eye_key]["path"]
            if os.path.exists(eye_path):
                pipeline_out = orchestrator.run_full_pipeline(
                    eye_path,
                    f"{screening.screening_id}_{eye_key}"
                )
                results[eye_key] = {
                    "eye_name": eye_name,
                    "quality_score": pipeline_out["quality"]["overall_score"],
                    "quality_status": pipeline_out["quality"]["status"],
                    "grade": pipeline_out["dr_classification"]["grade"],
                    "label": pipeline_out["dr_classification"]["label"],
                    "confidence": pipeline_out["dr_classification"]["confidence"],
                    "probabilities": pipeline_out["dr_classification"]["probabilities"],
                    "is_referable": pipeline_out["dr_classification"]["is_referable"],
                    "dme_risk": pipeline_out["dme_risk"]["risk"],
                    "lesions": pipeline_out["lesions"],
                    "vessels": pipeline_out["vessels"],
                    "explainability": pipeline_out["explainability"]
                }

    left_grade = results.get("left_eye", {}).get("grade", 0)
    right_grade = results.get("right_eye", {}).get("grade", 0)
    overall_grade = max(left_grade, right_grade)
    overall_label = results.get("right_eye", {}).get("label") if right_grade >= left_grade else results.get("left_eye", {}).get("label", "No DR")

    both_data["analysis"] = {
        "results": results,
        "overall_grade": overall_grade,
        "overall_label": overall_label,
        "overall_referable": (overall_grade >= 2)
    }
    screening.both_eyes_data = both_data
    screening.status = ScreeningState.RESULT_READY

    # Update AIResult record
    ai = db.query(AIResult).filter(AIResult.screening_id == screening.id).first()
    primary_res = results.get("right_eye") or results.get("left_eye")
    if primary_res:
        if not ai:
            ai = AIResult(
                screening_id=screening.id,
                dr_grade=overall_grade,
                label=overall_label,
                confidence=primary_res["confidence"],
                probabilities=primary_res.get("probabilities", {}),
                model_version="Deep ResNet-18 Dual-Eye Classifier v3.0",
                is_demo=False,
                is_referable=(overall_grade >= 2),
                dme_risk=primary_res["dme_risk"]
            )
            db.add(ai)
        else:
            ai.dr_grade = overall_grade
            ai.label = overall_label
            ai.confidence = primary_res["confidence"]
            ai.probabilities = primary_res.get("probabilities", {})
            ai.is_referable = (overall_grade >= 2)
            ai.dme_risk = primary_res["dme_risk"]

    db.commit()
    db.refresh(screening)

    return {
        "message": "Both eyes analysis complete",
        "both_eyes_data": screening.both_eyes_data,
        "overall_grade": overall_grade,
        "overall_label": overall_label,
        "screening_status": screening.status
    }
