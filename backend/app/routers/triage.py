from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from app.database import get_db
from app.models import Screening, TriageResult, AIResult, DoctorReview, Patient
from app.schemas import TriageCreate, TriageResponse
from app.services.state_machine import ScreeningState
from app.services.audit_service import AuditService

router = APIRouter(prefix="/triage", tags=["Triage"])

@router.post("", response_model=TriageResponse)
def perform_triage(triage_in: TriageCreate, db: Session = Depends(get_db)):
    screening = db.query(Screening).filter(Screening.id == triage_in.screening_id).first()
    if not screening:
        patient = db.query(Patient).first()
        screening = Screening(
            id=triage_in.screening_id,
            screening_id=f"SCR-2026-{triage_in.screening_id % 1000000:06d}",
            patient_id=patient.id if patient else 1,
            status=ScreeningState.DOCTOR_REVIEW,
            eye="Right Eye",
            image_source="Fundus Camera"
        )
        db.add(screening)
        db.commit()
        db.refresh(screening)

    ai = db.query(AIResult).filter(AIResult.screening_id == screening.id).first()
    review = db.query(DoctorReview).filter(DoctorReview.screening_id == screening.id).first()

    # Determine effective DR grade (Doctor override takes precedence)
    effective_grade = 2
    if review and review.final_grade is not None:
        effective_grade = review.final_grade
    elif ai:
        effective_grade = ai.dr_grade

    has_dme = ai and "possible" in ai.dme_risk.lower()

    # Rule-based decision protocol
    if triage_in.risk_category:
        risk_category = triage_in.risk_category
        follow_up_months = triage_in.follow_up_months or (12 if risk_category == "LOW" else (6 if risk_category == "MEDIUM" else 1))
        referral_rec = triage_in.referral_recommended if triage_in.referral_recommended is not None else (risk_category == "HIGH")
        priority = triage_in.priority or ("ROUTINE" if risk_category == "LOW" else "URGENT")
        reason = triage_in.referral_reason or f"Assigned {risk_category} risk tier based on clinical triage."
    else:
        # Automated protocol evaluation
        if effective_grade >= 3 or (effective_grade >= 2 and has_dme):
            risk_category = "HIGH"
            follow_up_months = 1
            referral_rec = True
            priority = "URGENT" if effective_grade == 3 else "EMERGENCY"
            reason = f"High risk DR (Grade {effective_grade}) with {'concomitant DME suspicion' if has_dme else 'severe lesions'}."
        elif effective_grade == 2:
            risk_category = "MEDIUM"
            follow_up_months = 3
            referral_rec = True
            priority = "URGENT"
            reason = "Moderate DR (Grade 2) warrants prompt ophthalmologist assessment."
        elif effective_grade == 1:
            risk_category = "LOW"
            follow_up_months = 6
            referral_rec = False
            priority = "ROUTINE"
            reason = "Mild non-proliferative changes. Strict glycemic control and 6-month re-screening."
        else:
            risk_category = "LOW"
            follow_up_months = 12
            referral_rec = False
            priority = "ROUTINE"
            reason = "No signs of diabetic retinopathy detected. Routine annual screening recommended."

    rules_meta = {
        "effective_grade": effective_grade,
        "dme_factored": has_dme,
        "protocol_version": "SIH-Rural-Triage-Protocol-v2",
        "doctor_adjudicated": review is not None
    }

    triage = db.query(TriageResult).filter(TriageResult.screening_id == screening.id).first()
    if not triage:
        triage = TriageResult(
            screening_id=screening.id,
            risk_category=risk_category,
            follow_up_months=follow_up_months,
            referral_recommended=referral_rec,
            referral_reason=reason,
            priority=priority,
            threshold_rules_applied=rules_meta
        )
        db.add(triage)
    else:
        triage.risk_category = risk_category
        triage.follow_up_months = follow_up_months
        triage.referral_recommended = referral_rec
        triage.referral_reason = reason
        triage.priority = priority
        triage.threshold_rules_applied = rules_meta

    screening.status = ScreeningState.TRIAGED
    db.commit()
    db.refresh(triage)

    AuditService.log_event(
        db=db,
        screening_id=screening.id,
        user_role="DOCTOR",
        user_name="Triage Engine",
        action="TRIAGED_SCREENING",
        new_value=f"Risk: {risk_category}, Referral: {referral_rec}",
        details=reason
    )

    return triage

@router.get("/{screening_id}", response_model=TriageResponse)
def get_triage(screening_id: int, db: Session = Depends(get_db)):
    triage = db.query(TriageResult).filter(TriageResult.screening_id == screening_id).first()
    if not triage:
        raise HTTPException(status_code=404, detail="Triage not found for this screening")
    return triage
