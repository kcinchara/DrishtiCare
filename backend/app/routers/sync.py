import datetime
from typing import Dict, Any
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from app.database import get_db
from app.models import Patient, Screening, SyncQueue, DoctorReview, Referral, AuditLog
from app.schemas import SyncPushRequest, SyncPushResponse, SyncPullResponse, SyncStatusResponse

router = APIRouter(prefix="/sync", tags=["Synchronization"])

@router.post("", response_model=SyncPushResponse)
@router.post("/push", response_model=SyncPushResponse)
def sync_push(data: SyncPushRequest, db: Session = Depends(get_db)):
    synced_count = 0
    failed_count = 0
    conflicts = []

    for item in data.items:
        try:
            # 1. Log to server sync_queue
            sq = SyncQueue(
                record_type=item.record_type,
                record_id=item.record_id,
                action=item.action,
                payload=item.payload,
                status="SYNCED",
                client_timestamp=item.client_timestamp
            )
            db.add(sq)

            # 2. Reconcile locally created patients
            if item.record_type == "patient":
                payload = item.payload
                pid = payload.get("patient_id", item.record_id)
                existing = db.query(Patient).filter(Patient.patient_id == pid).first()
                if not existing:
                    new_p = Patient(
                        patient_id=pid,
                        full_name=payload.get("full_name", "Offline Patient"),
                        age=payload.get("age", 50),
                        gender=payload.get("gender", "Other"),
                        diabetes_duration=payload.get("diabetes_duration"),
                        diabetes_type=payload.get("diabetes_type"),
                        language=payload.get("language", "English"),
                        screening_location=payload.get("screening_location", "Rural PHC"),
                        contact_number=payload.get("contact_number"),
                        previous_dr_history=payload.get("previous_dr_history"),
                        previous_eye_exam=payload.get("previous_eye_exam"),
                        last_screening_date=payload.get("last_screening_date"),
                        blood_glucose=payload.get("blood_glucose"),
                        hba1c=payload.get("hba1c"),
                        treatment_info=payload.get("treatment_info")
                    )
                    db.add(new_p)

            # 3. Reconcile screenings
            elif item.record_type == "screening":
                payload = item.payload
                sid = payload.get("screening_id", item.record_id)
                existing_s = db.query(Screening).filter(Screening.screening_id == sid).first()
                if not existing_s:
                    # Find patient
                    p = db.query(Patient).filter(Patient.patient_id == payload.get("patient_code")).first()
                    patient_id = p.id if p else 1
                    new_s = Screening(
                        screening_id=sid,
                        patient_id=patient_id,
                        status=payload.get("status", "COMPLETED"),
                        eye=payload.get("eye", "Right Eye"),
                        image_source=payload.get("image_source", "Fundus Camera"),
                        notes=payload.get("notes")
                    )
                    db.add(new_s)

            synced_count += 1
        except Exception as e:
            failed_count += 1
            conflicts.append({"record_id": item.record_id, "error": str(e)})

    db.commit()
    return {
        "synced_count": synced_count,
        "failed_count": failed_count,
        "conflicts": conflicts,
        "message": f"Successfully synchronized {synced_count} offline records."
    }

@router.get("/status", response_model=SyncStatusResponse)
def sync_status(db: Session = Depends(get_db)):
    total = db.query(SyncQueue).count()
    pending = db.query(SyncQueue).filter(SyncQueue.status == "PENDING").count()
    last = db.query(SyncQueue).order_by(SyncQueue.id.desc()).first()

    return {
        "total_records": total,
        "pending_records": pending,
        "last_sync": last.server_timestamp.isoformat() if last else None,
        "status": "Healthy"
    }

@router.post("/pull", response_model=SyncPullResponse)
def sync_pull(db: Session = Depends(get_db)):
    patients = db.query(Patient).order_by(Patient.id.desc()).limit(100).all()
    screenings = db.query(Screening).order_by(Screening.id.desc()).limit(100).all()
    reviews = db.query(DoctorReview).order_by(DoctorReview.id.desc()).limit(100).all()
    referrals = db.query(Referral).order_by(Referral.id.desc()).limit(100).all()

    return {
        "patients": [
            {
                "id": p.id,
                "patient_id": p.patient_id,
                "full_name": p.full_name,
                "age": p.age,
                "gender": p.gender,
                "diabetes_duration": p.diabetes_duration,
                "diabetes_type": p.diabetes_type,
                "screening_location": p.screening_location,
                "contact_number": p.contact_number
            } for p in patients
        ],
        "screenings": [
            {
                "id": s.id,
                "screening_id": s.screening_id,
                "patient_id": s.patient_id,
                "status": s.status,
                "eye": s.eye,
                "date": s.created_at.strftime("%Y-%m-%d")
            } for s in screenings
        ],
        "reviews": [
            {
                "id": r.id,
                "screening_id": r.screening_id,
                "decision": r.decision,
                "final_grade": r.final_grade,
                "doctor_name": r.doctor_name
            } for r in reviews
        ],
        "referrals": [
            {
                "id": ref.id,
                "referral_id": ref.referral_id,
                "screening_id": ref.screening_id,
                "dr_grade": ref.dr_grade,
                "priority": ref.priority,
                "status": ref.status
            } for ref in referrals
        ],
        "server_timestamp": datetime.datetime.utcnow().isoformat()
    }
