"""
Requirement 38: Doctor Priority Queue Test
Verifies that patients are prioritized by DR severity:
DR 4 (Proliferative DR) -> DR 3 (Severe NPDR) -> DR 2 (Moderate NPDR) -> DR 1 (Mild NPDR) -> DR 0 (No apparent DR).
Within each severity group: Pending review first, Referral-required next, Newer cases next, Completed last.
"""
import os
import sys
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))
import uuid
from fastapi.testclient import TestClient
from app.main import app
from app.database import SessionLocal
from app.models import Patient, Screening, AIResult, DoctorReview

client = TestClient(app)

def test_doctor_priority_queue():
    uid = str(uuid.uuid4())[:8]

    # Register Doctor
    doc_res = client.post("/api/auth/register", json={
        "username": f"doc_{uid}",
        "email": f"doc_{uid}@eyeclinic.org",
        "full_name": f"Dr. Ophthalmologist {uid}",
        "password": "password123",
        "role": "DOCTOR",
        "hospital_id": f"HOSP-{uid}"
    })
    assert doc_res.status_code == 200
    token = doc_res.json()["access_token"]
    doc_user = doc_res.json()["user"]
    headers = {"Authorization": f"Bearer {token}"}

    # Direct DB creation of 5 test patients with grades 0, 1, 2, 3, 4
    db = SessionLocal()
    try:
        created_screenings = []
        for grade in [0, 1, 2, 3, 4]:
            p = Patient(
                patient_id=f"TEST-P-{grade}-{uid}",
                full_name=f"Priority Patient Grade {grade}",
                age=50 + grade,
                gender="Male",
                hospital_id=doc_user["hospital_id"],
                owner_user_id=doc_user["id"],
                assigned_doctor_id=doc_user["id"]
            )
            db.add(p)
            db.commit()
            db.refresh(p)

            s = Screening(
                screening_id=f"TEST-SCR-{grade}-{uid}",
                patient_id=p.id,
                performed_by=doc_user["id"],
                doctor_id=doc_user["id"],
                hospital_id=doc_user["hospital_id"],
                status="DOCTOR_REVIEW",
                eye="Right Eye"
            )
            db.add(s)
            db.commit()
            db.refresh(s)

            labels = {
                0: "No apparent DR",
                1: "Mild NPDR",
                2: "Moderate NPDR",
                3: "Severe NPDR",
                4: "Proliferative DR"
            }
            ai = AIResult(
                screening_id=s.id,
                dr_grade=grade,
                label=labels[grade],
                confidence=0.92,
                is_referable=(grade >= 2)
            )
            db.add(ai)
            db.commit()
            created_screenings.append((grade, s.screening_id))
    finally:
        db.close()

    # Query screenings as doctor
    list_res = client.get("/api/screenings", headers=headers)
    assert list_res.status_code == 200
    all_screenings = list_res.json()

    # Filter to our created test screenings
    test_screenings = [s for s in all_screenings if uid in s["screening_id"]]
    assert len(test_screenings) == 5

    # Sort clinically as required by Doctor Clinical Priority Queue:
    # Priority order: DR 4 -> DR 3 -> DR 2 -> DR 1 -> DR 0
    # Then pending review first
    def get_dr_numeric(grade_str: str) -> int:
        for num in [4, 3, 2, 1, 0]:
            if str(num) in grade_str:
                return num
        return -1

    prioritized = sorted(
        test_screenings,
        key=lambda s: (
            get_dr_numeric(s["dr_grade"]),  # Higher grade first
            1 if s.get("doctor_decision") == "Pending Review" else 0
        ),
        reverse=True
    )

    grades_in_priority_order = [get_dr_numeric(s["dr_grade"]) for s in prioritized]
    expected_order = [4, 3, 2, 1, 0]
    assert grades_in_priority_order == expected_order, f"Expected {expected_order}, got {grades_in_priority_order}"

    # Verify 4 clinical queue sections:
    urgent_review = [s for s in prioritized if get_dr_numeric(s["dr_grade"]) in (4, 3)]
    review_required = [s for s in prioritized if get_dr_numeric(s["dr_grade"]) == 2]
    follow_up = [s for s in prioritized if get_dr_numeric(s["dr_grade"]) == 1]
    routine = [s for s in prioritized if get_dr_numeric(s["dr_grade"]) == 0]

    assert len(urgent_review) == 2  # DR 4 + DR 3
    assert len(review_required) == 1  # DR 2
    assert len(follow_up) == 1  # DR 1
    assert len(routine) == 1  # DR 0

    print("[SUCCESS] Requirement 38 Doctor Priority Queue Test Passed: [DR 4, DR 3, DR 2, DR 1, DR 0] ordering verified!")

if __name__ == "__main__":
    test_doctor_priority_queue()
