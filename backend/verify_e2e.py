import os
import io
import cv2
import numpy as np
from fastapi.testclient import TestClient
from app.main import app

client = TestClient(app)

def run_e2e_verification():
    print("==================================================")
    print("STARTING DRISTICARE FULL E2E VERIFICATION SUITE")
    print("==================================================")

    # 1. Login Healthcare Worker
    login_res = client.post("/api/auth/login", json={"username": "demo", "password": "demo123"})
    assert login_res.status_code == 200, f"Login failed: {login_res.text}"
    token = login_res.json()["access_token"]
    headers = {"Authorization": f"Bearer {token}"}
    print("[PASS] 1. Healthcare Worker Login successful")

    # 1b. Login ASHA Worker
    asha_login = client.post("/api/auth/login", json={"username": "asha", "password": "asha123"})
    assert asha_login.status_code == 200, f"ASHA Login failed: {asha_login.text}"
    asha_token = asha_login.json()["access_token"]
    asha_headers = {"Authorization": f"Bearer {asha_token}"}
    print("[PASS] 1b. ASHA Worker Login successful")

    # 2. Register Patient (Check PAT-DR-XXXX format and medical history fields)
    patient_payload = {
        "full_name": "Ramesh Gowda",
        "age": 58,
        "gender": "Male",
        "diabetes_duration": "8 years",
        "diabetes_type": "Type 2",
        "language": "Kannada",
        "screening_location": "Mysuru Rural PHC",
        "contact_number": "+91 98450 12345",
        "blood_glucose": "180 mg/dL",
        "hba1c": "8.4%",
        "medical_history": "Longstanding type 2 diabetes mellitus with mild hypertension.",
        "current_medications": "Metformin 500mg BD, Telmisartan 40mg OD",
        "risk_factors": "Smoking history (quit 2 yrs ago), Borderline dyslipidemia"
    }
    p_res = client.post("/api/patients", json=patient_payload, headers=headers)
    assert p_res.status_code == 201, f"Patient registration failed: {p_res.text}"
    patient = p_res.json()
    patient_id = patient["id"]
    patient_code = patient["patient_id"]
    assert patient_code.startswith("PAT-DR-"), f"Expected PAT-DR-XXXX, got {patient_code}"
    print(f"[PASS] 2. Patient Registered: ID={patient_id}, Code={patient_code}, Name={patient['full_name']}")

    # 2b. Search Patient by Name & PAT-DR-XXXX Code
    search_res = client.get(f"/api/patients?search=Ramesh", headers=headers)
    assert search_res.status_code == 200
    assert any(p["id"] == patient_id for p in search_res.json())

    search_code_res = client.get(f"/api/patients?search={patient_code}", headers=headers)
    assert search_code_res.status_code == 200
    assert any(p["id"] == patient_id for p in search_code_res.json())
    print(f"[PASS] 2b. Patient Search by Name and by ID ({patient_code}) verified")

    # 3. Create First Screening (Right Eye)
    s_payload = {
        "patient_id": patient_id,
        "eye": "Right Eye",
        "image_source": "Portable Fundus Camera"
    }
    s_res = client.post("/api/screenings", json=s_payload, headers=headers)
    assert s_res.status_code == 201
    screening = s_res.json()
    screening_id = screening["id"]
    print(f"[PASS] 3. Screening #1 Created: ID={screening_id}, Eye={screening.get('eye')}")

    # 4. Fundus Image Validation Check: Upload Non-Fundus Image
    blue_img = np.full((512, 512, 3), (255, 120, 20), dtype=np.uint8)
    _, blue_buf = cv2.imencode(".jpg", blue_img)
    files = {"file": ("non_fundus.jpg", io.BytesIO(blue_buf.tobytes()), "image/jpeg")}
    upload_fail_res = client.post(f"/api/screenings/{screening_id}/image", files=files, headers=headers)
    assert upload_fail_res.status_code == 400
    error_detail = upload_fail_res.json().get("detail", "")
    assert "This image does not appear to be a retinal fundus photograph" in error_detail
    print(f"[PASS] 4. Fundus Validation correctly blocked non-fundus image: '{error_detail}'")

    # 5. Upload Valid Fundus Image for Screening #1 (Sample Grade 2)
    upload_success_res = client.post(
        f"/api/screenings/{screening_id}/image",
        data={"use_demo_sample": True, "sample_grade": 2},
        headers=headers
    )
    assert upload_success_res.status_code in (200, 201)
    print("[PASS] 5. Valid Fundus Image (Grade 2 sample) uploaded for Screening #1")

    # 6. Quality Assessment
    quality_res = client.post("/api/ai/image-quality", json={"screening_id": screening_id}, headers=headers)
    assert quality_res.status_code == 200
    quality = quality_res.json()
    assert quality["is_fundus"] is True
    assert quality["is_suitable_for_ai"] is True
    print(f"[PASS] 6. Quality Assessed: Status={quality['status']}, is_fundus={quality['is_fundus']}")

    # 7. Run AI Pipeline on Screening #1
    ai_run_res = client.post("/api/ai/analyze", json={"screening_id": screening_id}, headers=headers)
    assert ai_run_res.status_code == 200
    ai_data = ai_run_res.json()
    dr_result = ai_data["dr_classification"]
    assert dr_result["grade"] == 2
    print(f"[PASS] 7. AI Analysis for Screening #1: Grade={dr_result['grade']}, Label='{dr_result['label']}'")

    # 8. Check Comparison for First Screening (Baseline -> has_previous should be False)
    comp_1_res = client.get(f"/api/screenings/{screening_id}/comparison", headers=headers)
    assert comp_1_res.status_code == 200
    comp_1_data = comp_1_res.json()
    assert comp_1_data["has_previous"] is False
    assert "first recorded screening" in comp_1_data["message"]
    print("[PASS] 8. First screening comparison correctly identifies baseline (has_previous=False)")

    # 9. Hospital Facility Recommendation
    facilities_res = client.get("/api/referrals/facilities?latitude=12.2958&longitude=76.6394&severity=MODERATE", headers=headers)
    assert facilities_res.status_code == 200
    facilities_data = facilities_res.json()
    rec_hospital = facilities_data["recommended"]
    print(f"[PASS] 9. Recommended Eye Hospital: {rec_hospital['name']} ({rec_hospital['distance']})")

    # 10. Create Referral
    ref_payload = {
        "screening_id": screening_id,
        "patient_id": patient_id,
        "dr_grade": dr_result["grade"],
        "dme_risk": dr_result.get("dme_risk", "Low"),
        "reason": "Moderate NPDR identified in routine screening.",
        "priority": "URGENT",
        "recommended_destination": rec_hospital["name"],
        "hospital_name": rec_hospital["name"],
        "hospital_address": rec_hospital["address"],
        "hospital_contact": rec_hospital["contact"],
        "hospital_distance": rec_hospital["distance"],
        "directions_url": rec_hospital["directions_url"],
        "doctor_comments": "Dilated retinal exam required."
    }
    ref_res = client.post("/api/referrals", json=ref_payload, headers=headers)
    assert ref_res.status_code == 201
    print(f"[PASS] 10. Referral created with destination: {rec_hospital['name']}")

    # 11. Generate PDF Report for Screening #1
    report_res = client.post(f"/api/reports/{screening_id}/generate", headers=headers)
    assert report_res.status_code == 200
    print("[PASS] 11. PDF Report for Screening #1 generated")

    # 12. RETURNING PATIENT SCREENING #2 (Simulate follow-up screening 6 months later)
    # Important: MUST use the SAME patient_id (no duplicate patient created!)
    s2_payload = {
        "patient_id": patient_id,
        "eye": "Right Eye",
        "image_source": "Portable Fundus Camera"
    }
    s2_res = client.post("/api/screenings", json=s2_payload, headers=headers)
    assert s2_res.status_code == 201
    s2_id = s2_res.json()["id"]
    print(f"[PASS] 12. Returning Patient Screening #2 created (ID={s2_id}) under SAME patient ID {patient_id}")

    # Upload Grade 3 fundus sample for screening #2
    upload_s2_res = client.post(
        f"/api/screenings/{s2_id}/image",
        data={"use_demo_sample": True, "sample_grade": 3},
        headers=headers
    )
    assert upload_s2_res.status_code in (200, 201)

    # Run AI Analysis on Screening #2
    ai2_res = client.post("/api/ai/analyze", json={"screening_id": s2_id}, headers=headers)
    assert ai2_res.status_code == 200
    ai2_data = ai2_res.json()["dr_classification"]
    assert ai2_data["grade"] == 3
    print(f"[PASS] 13. Screening #2 AI Analysis completed: Grade={ai2_data['grade']}")

    # 14. Longitudinal Screening Comparison for Returning Patient (DR 2 -> DR 3)
    comp_2_res = client.get(f"/api/screenings/{s2_id}/comparison", headers=headers)
    assert comp_2_res.status_code == 200
    comp_2_data = comp_2_res.json()
    assert comp_2_data["has_previous"] is True
    assert comp_2_data["previous_grade"] == 2
    assert comp_2_data["current_grade"] == 3
    assert comp_2_data["change_status"] == "WORSENED"
    print(f"[PASS] 14. Longitudinal Comparison verified: DR {comp_2_data['previous_grade']} -> DR {comp_2_data['current_grade']}, Status={comp_2_data['change_status']}")

    # 15. Patient Longitudinal Timeline History
    history_res = client.get(f"/api/patients/{patient_id}/history", headers=headers)
    assert history_res.status_code == 200
    h_data = history_res.json()
    assert h_data["total_screenings"] >= 2
    assert h_data["overall_trajectory"] == "WORSENED"
    assert len(h_data["screenings"]) >= 2
    print(f"[PASS] 15. Patient History Timeline verified: Total={h_data['total_screenings']}, Trajectory={h_data['overall_trajectory']}")

    # 16. Doctor Review & Clinical Adjudication Queue
    doc_login = client.post("/api/auth/login", json={"username": "doctor", "password": "doctor123"})
    assert doc_login.status_code == 200
    doc_token = doc_login.json()["access_token"]
    doc_headers = {"Authorization": f"Bearer {doc_token}"}

    # Fetch Doctor Queue
    queue_res = client.get("/api/screenings", headers=doc_headers)
    assert queue_res.status_code == 200
    queue = queue_res.json()
    assert len(queue) > 0
    print(f"[PASS] 16. Doctor Workstation Queue retrieved ({len(queue)} items)")

    # Doctor Adjudication on Screening #2
    rev_payload = {
        "screening_id": s2_id,
        "decision": "ACCEPTED",
        "final_grade": 3,
        "doctor_comments": "Severe NPDR confirmed with multiple blot hemorrhages. Expedited laser/anti-VEGF consultation mandated."
    }
    rev_res = client.post("/api/reviews", json=rev_payload, headers=doc_headers)
    assert rev_res.status_code in (200, 201), f"Review submission failed: {rev_res.text}"
    print(f"[PASS] 17. Doctor Review Submitted: Decision=ACCEPTED, Final Grade=3")

    # 18. Generate Final Comprehensive PDF Report for Screening #2 with Section 6 & 7
    s2_rep_res = client.post(f"/api/reports/{s2_id}/generate", headers=headers)
    assert s2_rep_res.status_code == 200
    pdf_path = s2_rep_res.json()["pdf_url"]
    print(f"[PASS] 18. Longitudinal & Home Care PDF Report generated: {pdf_path}")

    # Verify Report Details Endpoint
    detail_res = client.get(f"/api/screenings/{s2_id}", headers=headers)
    assert detail_res.status_code == 200
    detail = detail_res.json()
    assert detail["patient"]["patient_id"] == patient_code
    assert detail["doctor_review"]["decision"] == "ACCEPTED"
    assert "submission_status" in detail
    print(f"[PASS] 19. Screening Detail successfully confirms patient consistency ({detail['patient']['patient_id']}) and doctor adjudication")

    # 20. ASHA Worker Submits Screening to Doctor Review
    sub_res = client.post(f"/api/screenings/{screening_id}/submit-to-doctor", headers=asha_headers)
    assert sub_res.status_code == 200, f"Submit to doctor failed: {sub_res.text}"
    sub_data = sub_res.json()
    assert sub_data["submission_status"] == "SUBMITTED_TO_DOCTOR"
    assert "Waiting for doctor review" in sub_data["message"]
    print(f"[PASS] 20. ASHA Submit-to-Doctor verified: '{sub_data['message']}'")

    # 21. Both Eyes Mode (Extra Feature Upload & Dynamic AI Analysis)
    both_up_res = client.post(
        f"/api/screenings/{screening_id}/both-eyes/upload",
        data={"left_sample_grade": 1, "right_sample_grade": 2},
        headers=asha_headers
    )
    assert both_up_res.status_code == 200, f"Both eyes upload failed: {both_up_res.text}"
    assert "left_eye" in both_up_res.json()["both_eyes_data"]
    assert "right_eye" in both_up_res.json()["both_eyes_data"]

    both_an_res = client.post(f"/api/screenings/{screening_id}/both-eyes/analyze", headers=asha_headers)
    assert both_an_res.status_code == 200, f"Both eyes analyze failed: {both_an_res.text}"
    both_an_data = both_an_res.json()
    assert both_an_data["overall_grade"] in [0, 1, 2, 3, 4]
    print(f"[PASS] 21. Both-Eyes Mode Extra Feature verified: Overall Grade=DR {both_an_data['overall_grade']}, Label='{both_an_data['overall_label']}'")

    # 22. Role Enforcement: ASHA Worker CANNOT submit or tamper with clinical Doctor Reviews
    unauthorized_rev = client.post(
        "/api/reviews",
        json={"screening_id": screening_id, "decision": "ACCEPTED", "final_grade": 2},
        headers=asha_headers
    )
    assert unauthorized_rev.status_code == 403, f"Expected 403 Forbidden for ASHA review edit, got {unauthorized_rev.status_code}"
    print("[PASS] 22. Role Security verified: ASHA worker blocked from submitting/editing doctor reviews (403 Forbidden)")

    print("==================================================")
    print("ALL 22 RETINAL EDGE TRIAGE & ENHANCED WORKFLOW CHECKS PASSED!")
    print("==================================================")

if __name__ == "__main__":
    run_e2e_verification()
