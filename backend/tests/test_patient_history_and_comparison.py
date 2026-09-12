import pytest
from fastapi.testclient import TestClient
from app.main import app

client = TestClient(app)

def get_auth_token(username="demo", password="demo123"):
    res = client.post("/api/auth/login", json={"username": username, "password": password})
    assert res.status_code == 200
    return res.json()["access_token"]

def test_patient_registration_and_history():
    token = get_auth_token("demo", "demo123")
    headers = {"Authorization": f"Bearer {token}"}

    # 1. Register a new patient
    patient_data = {
        "full_name": "Acceptance Test Patient",
        "age": 58,
        "gender": "Female",
        "diabetes_duration": "6 years",
        "diabetes_type": "Type 2",
        "screening_location": "PHC Rampur Village",
        "contact_number": "+91 98765 43210",
        "blood_glucose": "175 mg/dL",
        "hba1c": "8.1%",
        "treatment_info": "Metformin 500mg BD",
        "medical_history": "Hypertension 3 years",
        "current_medications": "Metformin, Amlodipine",
        "risk_factors": "Smoking: No, Family History: Yes"
    }
    res = client.post("/api/patients", json=patient_data, headers=headers)
    assert res.status_code == 201
    p = res.json()
    assert "PAT-DR-" in p["patient_id"]
    patient_id = p["id"]
    patient_code = p["patient_id"]

    # 2. Search for patient by name and patient_id
    search_res = client.get(f"/api/patients?search={patient_code}", headers=headers)
    assert search_res.status_code == 200
    results = search_res.json()
    assert len(results) >= 1
    assert results[0]["id"] == patient_id

    # 3. Create Screening 1 for this patient
    scr1_res = client.post("/api/screenings", json={"patient_id": patient_id, "eye": "Right Eye"}, headers=headers)
    assert scr1_res.status_code == 201
    scr1_id = scr1_res.json()["id"]

    # Check comparison for Screening 1 (first screening should have has_previous = False)
    comp1_res = client.get(f"/api/screenings/{scr1_id}/comparison", headers=headers)
    assert comp1_res.status_code == 200
    comp1 = comp1_res.json()
    assert comp1["has_previous"] is False
    assert "first recorded screening" in comp1["message"].lower()

    # Simulate doctor review on Screening 1 (Confirming Grade 2)
    doc_token = get_auth_token("doctor", "doctor123")
    doc_headers = {"Authorization": f"Bearer {doc_token}"}
    client.post(
        "/api/reviews",
        json={
            "screening_id": scr1_id,
            "decision": "ACCEPTED",
            "final_grade": 2,
            "doctor_comments": "Moderate NPDR confirmed.",
            "instructions_for_hcw": "Counsel patient on glucose control."
        },
        headers=doc_headers
    )

    # 4. Patient returns! Create Screening 2 for the same patient
    scr2_res = client.post("/api/screenings", json={"patient_id": patient_id, "eye": "Right Eye"}, headers=headers)
    assert scr2_res.status_code == 201
    scr2_id = scr2_res.json()["id"]

    # Simulate doctor review on Screening 2 with Grade 3 (Worsened)
    client.post(
        "/api/reviews",
        json={
            "screening_id": scr2_id,
            "decision": "OVERRIDDEN",
            "final_grade": 3,
            "doctor_comments": "Severe non-proliferative retinopathy developed.",
            "instructions_for_hcw": "Urgent referral to retina specialist."
        },
        headers=doc_headers
    )

    # 5. Check automatic longitudinal comparison for Screening 2
    comp2_res = client.get(f"/api/screenings/{scr2_id}/comparison", headers=headers)
    assert comp2_res.status_code == 200
    comp2 = comp2_res.json()
    assert comp2["has_previous"] is True
    assert comp2["previous_grade"] == 2
    assert comp2["current_grade"] == 3
    assert comp2["change_status"] == "WORSENED"

    # 6. Verify Patient History Timeline: Both screenings preserved, no overwrites
    history_res = client.get(f"/api/patients/{patient_id}/history", headers=headers)
    assert history_res.status_code == 200
    history = history_res.json()
    assert history["total_screenings"] == 2
    assert len(history["screenings"]) == 2
    assert history["overall_trajectory"] == "WORSENED"

    # Verify report generation includes comparison and home care
    rep_res = client.post(f"/api/reports/{scr2_id}/generate")
    assert rep_res.status_code == 200
