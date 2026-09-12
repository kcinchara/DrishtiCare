import random
import os
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session, joinedload
from app.database import get_db
from app.models import Patient, User, Screening
from app.schemas import (
    PatientCreate, PatientUpdate, PatientResponse,
    PatientHistoryResponse, PatientHistoryTimelineItem
)
from app.services.audit_service import AuditService
from app.utils.security import get_current_user, is_doctor_role, is_admin_role

router = APIRouter(prefix="/patients", tags=["Patients"])

def generate_patient_id(db: Session) -> str:
    count = db.query(Patient).count() + 1
    return f"PAT-DR-{count:04d}"

@router.post("", response_model=PatientResponse, status_code=status.HTTP_201_CREATED)
def create_patient(
    patient_in: PatientCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    pid = patient_in.patient_id or generate_patient_id(db)
    
    # Check if patient_id already exists
    existing = db.query(Patient).filter(Patient.patient_id == pid).first()
    if existing:
        count = db.query(Patient).count() + 1
        pid = f"PAT-DR-{count:04d}-{random.randint(10, 99)}"

    hospital_id = patient_in.hospital_id or current_user.hospital_id or "HOSP-001"

    db_patient = Patient(
        patient_id=pid,
        owner_user_id=current_user.id,
        hospital_id=hospital_id,
        assigned_doctor_id=patient_in.assigned_doctor_id,
        full_name=patient_in.full_name,
        age=patient_in.age,
        gender=patient_in.gender,
        diabetes_duration=patient_in.diabetes_duration,
        diabetes_type=patient_in.diabetes_type,
        language=patient_in.language,
        screening_location=patient_in.screening_location,
        contact_number=patient_in.contact_number,
        previous_dr_history=patient_in.previous_dr_history,
        previous_eye_exam=patient_in.previous_eye_exam,
        last_screening_date=patient_in.last_screening_date,
        blood_glucose=patient_in.blood_glucose,
        hba1c=patient_in.hba1c,
        treatment_info=patient_in.treatment_info,
        medical_history=patient_in.medical_history,
        current_medications=patient_in.current_medications,
        risk_factors=patient_in.risk_factors
    )
    db.add(db_patient)
    db.commit()
    db.refresh(db_patient)

    AuditService.log_event(
        db=db,
        screening_id=None,
        user_role=current_user.role,
        user_name=current_user.full_name,
        action="REGISTERED_PATIENT",
        new_value=db_patient.patient_id,
        details=f"Patient {db_patient.full_name}, Age {db_patient.age}, Owner User ID {current_user.id}"
    )

    return db_patient

@router.get("", response_model=List[PatientResponse])
def list_patients(
    search: Optional[str] = Query(None, description="Search by Patient ID, Name, or Phone"),
    skip: int = 0,
    limit: int = 100,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    query = db.query(Patient)

    # Strict user isolation by role:
    if is_admin_role(current_user.role):
        pass  # Admin can see all records
    elif is_doctor_role(current_user.role):
        query = query.filter(
            (Patient.assigned_doctor_id == current_user.id) |
            (Patient.hospital_id == current_user.hospital_id) |
            (Patient.owner_user_id == current_user.id)
        )
    else:
        # ASHA / Healthcare Worker sees their own registered patients or patients within their PHC/hospital
        if current_user.hospital_id:
            query = query.filter(
                (Patient.owner_user_id == current_user.id) |
                (Patient.hospital_id == current_user.hospital_id)
            )
        else:
            query = query.filter(Patient.owner_user_id == current_user.id)

    if search:
        search_term = f"%{search.strip()}%"
        query = query.filter(
            (Patient.patient_id.ilike(search_term)) |
            (Patient.full_name.ilike(search_term)) |
            (Patient.contact_number.ilike(search_term))
        )

    return query.order_by(Patient.id.desc()).offset(skip).limit(limit).all()

@router.get("/{patient_id}/history", response_model=PatientHistoryResponse)
def get_patient_history(
    patient_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    if patient_id.isdigit():
        patient = db.query(Patient).filter(Patient.id == int(patient_id)).first()
    else:
        patient = db.query(Patient).filter(Patient.patient_id == patient_id).first()

    if not patient:
        raise HTTPException(status_code=404, detail="Patient not found")

    # Access control
    if not (is_admin_role(current_user.role) or is_doctor_role(current_user.role)):
        same_hospital = current_user.hospital_id and patient.hospital_id == current_user.hospital_id
        if patient.owner_user_id != current_user.id and not same_hospital:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Unauthorized: You do not have permission to view this patient's history."
            )

    # Fetch all screenings for this patient in chronological order
    screenings = (
        db.query(Screening)
        .filter(Screening.patient_id == patient.id)
        .options(
            joinedload(Screening.ai_result),
            joinedload(Screening.doctor_review),
            joinedload(Screening.triage_result),
            joinedload(Screening.referral),
            joinedload(Screening.retinal_image),
        )
        .order_by(Screening.created_at.asc())
        .all()
    )

    timeline_items: List[PatientHistoryTimelineItem] = []
    prev_grade: Optional[int] = None

    for s in screenings:
        ai = s.ai_result
        rev = s.doctor_review
        tri = s.triage_result
        ref = s.referral
        img = s.retinal_image

        ai_grade = ai.dr_grade if ai else 0
        doc_grade = rev.final_grade if rev and rev.final_grade is not None else None
        # Effective grade prioritizes doctor assessment
        effective_grade = doc_grade if doc_grade is not None else ai_grade

        change_status = None
        if prev_grade is not None:
            if effective_grade > prev_grade:
                change_status = "WORSENED"
            elif effective_grade < prev_grade:
                change_status = "IMPROVED"
            else:
                change_status = "STABLE"

        image_url = f"/media/uploads/{img.filename}" if img else None

        timeline_items.append(
            PatientHistoryTimelineItem(
                id=s.id,
                screening_id=s.screening_id,
                date=s.created_at.strftime("%Y-%m-%d"),
                eye=s.eye,
                dr_grade=effective_grade,
                dr_label=ai.label if ai else f"DR {effective_grade}",
                confidence=ai.confidence if ai else 0.0,
                is_referable=ai.is_referable if ai else (effective_grade >= 2),
                dme_risk=ai.dme_risk if ai else "Low",
                doctor_decision=rev.decision if rev else "Pending Review",
                doctor_final_grade=doc_grade,
                doctor_comments=rev.doctor_comments if rev else None,
                triage_risk=tri.risk_category if tri else ("HIGH" if effective_grade >= 2 else "LOW"),
                referral_id=ref.referral_id if ref else None,
                image_url=image_url,
                change_status=change_status,
                previous_grade=prev_grade
            )
        )
        prev_grade = effective_grade

    # Determine overall trajectory (first to last)
    overall_trajectory = "STABLE"
    if len(timeline_items) >= 2:
        first_g = timeline_items[0].dr_grade
        last_g = timeline_items[-1].dr_grade
        if last_g > first_g:
            overall_trajectory = "WORSENED"
        elif last_g < first_g:
            overall_trajectory = "IMPROVED"
        else:
            overall_trajectory = "STABLE"

    latest_item = timeline_items[-1] if timeline_items else None

    return PatientHistoryResponse(
        patient=PatientResponse.model_validate(patient),
        screenings=list(reversed(timeline_items)),  # Most recent first for display
        total_screenings=len(timeline_items),
        latest_screening=latest_item,
        overall_trajectory=overall_trajectory
    )

@router.get("/{patient_id}", response_model=PatientResponse)
def get_patient(
    patient_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    if patient_id.isdigit():
        patient = db.query(Patient).filter(Patient.id == int(patient_id)).first()
    else:
        patient = db.query(Patient).filter(Patient.patient_id == patient_id).first()
        
    if not patient:
        raise HTTPException(status_code=404, detail="Patient not found")

    # Access control verification
    if not (is_admin_role(current_user.role) or is_doctor_role(current_user.role)):
        same_hospital = current_user.hospital_id and patient.hospital_id == current_user.hospital_id
        if patient.owner_user_id != current_user.id and not same_hospital:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Unauthorized: You do not have permission to view this patient record."
            )

    return patient

@router.put("/{patient_id}", response_model=PatientResponse)
def update_patient(
    patient_id: str,
    patient_update: PatientUpdate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    if patient_id.isdigit():
        patient = db.query(Patient).filter(Patient.id == int(patient_id)).first()
    else:
        patient = db.query(Patient).filter(Patient.patient_id == patient_id).first()
        
    if not patient:
        raise HTTPException(status_code=404, detail="Patient not found")

    # Access control verification
    if not (is_admin_role(current_user.role) or is_doctor_role(current_user.role)):
        if patient.owner_user_id != current_user.id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Unauthorized: You do not have permission to modify this patient record."
            )

    update_data = patient_update.dict(exclude_unset=True)
    for key, value in update_data.items():
        setattr(patient, key, value)

    db.commit()
    db.refresh(patient)
    return patient
