from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from app.database import get_db
from app.models import Screening, DoctorReview, User, Patient
from app.schemas import DoctorReviewCreate, DoctorReviewResponse
from app.services.state_machine import ScreeningState
from app.services.audit_service import AuditService
from app.utils.security import get_optional_current_user, is_doctor_role, is_asha_role

router = APIRouter(prefix="/reviews", tags=["Doctor Review"])

@router.post("", response_model=DoctorReviewResponse)
def submit_doctor_review(
    review_in: DoctorReviewCreate,
    current_user: Optional[User] = Depends(get_optional_current_user),
    db: Session = Depends(get_db)
):
    screening = db.query(Screening).filter(Screening.id == review_in.screening_id).first()
    if not screening:
        patient = db.query(Patient).first()
        screening = Screening(
            id=review_in.screening_id,
            screening_id=f"SCR-2026-{review_in.screening_id % 1000000:06d}",
            patient_id=patient.id if patient else 1,
            performed_by=current_user.id if current_user else 1,
            status=ScreeningState.DOCTOR_REVIEW,
            eye="Right Eye",
            image_source="Fundus Camera"
        )
        db.add(screening)
        db.commit()
        db.refresh(screening)

    # Validate decision
    valid_decisions = ["ACCEPTED", "OVERRIDDEN", "RECAPTURE_REQUESTED"]
    if review_in.decision not in valid_decisions:
        raise HTTPException(status_code=400, detail=f"Invalid decision. Must be one of {valid_decisions}")

    if review_in.decision == "OVERRIDDEN" and review_in.final_grade is None:
        raise HTTPException(status_code=400, detail="Final grade is required when overriding AI prediction")

    # Enforce role restriction: ASHA / HCW cannot submit clinical doctor review
    if current_user and is_asha_role(current_user.role) and not is_doctor_role(current_user.role):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Unauthorized: ASHA workers cannot submit or modify doctor clinical assessments."
        )

    doc_id = current_user.id if current_user and is_doctor_role(current_user.role) else None
    doc_name = current_user.full_name if current_user else "Dr. Ophthalmologist"

    review = db.query(DoctorReview).filter(DoctorReview.screening_id == screening.id).first()
    if not review:
        review = DoctorReview(
            screening_id=screening.id,
            doctor_id=doc_id,
            doctor_name=doc_name,
            decision=review_in.decision,
            final_grade=review_in.final_grade,
            override_reason=review_in.override_reason,
            doctor_comments=review_in.doctor_comments,
            instructions_for_hcw=review_in.instructions_for_hcw
        )
        db.add(review)
    else:
        review.doctor_id = doc_id or review.doctor_id
        review.doctor_name = doc_name or review.doctor_name
        review.decision = review_in.decision
        review.final_grade = review_in.final_grade
        review.override_reason = review_in.override_reason
        review.doctor_comments = review_in.doctor_comments
        review.instructions_for_hcw = review_in.instructions_for_hcw

    # State update
    if review_in.decision == "RECAPTURE_REQUESTED":
        screening.status = ScreeningState.IMAGE_CAPTURED  # Requires re-capture
        screening.submission_status = "RECAPTURE_REQUESTED"
    else:
        screening.status = ScreeningState.DOCTOR_REVIEW
        screening.submission_status = "REVIEWED"

    if review_in.doctor_comments:
        screening.doctor_clinical_assessment = review_in.doctor_comments

    # Also update doctor_id on screening
    if doc_id:
        screening.doctor_id = doc_id

    db.commit()
    db.refresh(review)

    AuditService.log_event(
        db=db,
        screening_id=screening.id,
        user_role="DOCTOR",
        user_name=review.doctor_name,
        action=f"DOCTOR_REVIEW_{review_in.decision}",
        new_value=f"Decision: {review_in.decision}" + (f", Final Grade: {review_in.final_grade}" if review_in.final_grade is not None else ""),
        details=review_in.doctor_comments or review_in.instructions_for_hcw
    )

    return review

@router.get("/{screening_id}", response_model=DoctorReviewResponse)
def get_doctor_review(screening_id: int, db: Session = Depends(get_db)):
    review = db.query(DoctorReview).filter(DoctorReview.screening_id == screening_id).first()
    if not review:
        raise HTTPException(status_code=404, detail="Review not found for this screening")
    return review
