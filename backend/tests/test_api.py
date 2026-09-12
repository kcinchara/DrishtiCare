import pytest
from fastapi.testclient import TestClient
from app.main import app

client = TestClient(app)

def get_auth_headers():
    res = client.post("/api/auth/login", json={"username": "demo", "password": "demo123"})
    token = res.json()["access_token"]
    return {"Authorization": f"Bearer {token}"}

def test_root_endpoint():
    response = client.get("/")
    assert response.status_code == 200
    data = response.json()
    assert "DrishtiCare" in data["project"] or "Retinal Edge Triage" in data["project"]
    assert data["status"] == "Online"

def test_auth_login():
    # Test healthcare worker login
    res = client.post("/api/auth/login", json={"username": "demo", "password": "demo123"})
    assert res.status_code == 200
    token_data = res.json()
    assert "access_token" in token_data
    assert token_data["user"]["role"] == "HEALTHCARE_WORKER"

    # Test doctor login
    res_doc = client.post("/api/auth/login", json={"username": "doctor", "password": "doctor123"})
    assert res_doc.status_code == 200
    assert res_doc.json()["user"]["role"] == "DOCTOR"

def test_patient_and_screening_lifecycle():
    headers = get_auth_headers()
    # 1. Create Patient
    patient_payload = {
        "full_name": "Test Screening Patient",
        "age": 52,
        "gender": "Female",
        "diabetes_duration": "6 years",
        "diabetes_type": "Type 2",
        "language": "Hindi",
        "screening_location": "Test Rural PHC",
        "contact_number": "+91 99999 88888",
        "blood_glucose": "165 mg/dL",
        "hba1c": "7.9%"
    }
    p_res = client.post("/api/patients", json=patient_payload, headers=headers)
    assert p_res.status_code == 201
    p_data = p_res.json()
    patient_id = p_data["id"]
    assert p_data["full_name"] == "Test Screening Patient"

    # 2. Create Screening
    s_payload = {
        "patient_id": patient_id,
        "eye": "Right Eye",
        "image_source": "Fundus Camera"
    }
    s_res = client.post("/api/screenings", json=s_payload, headers=headers)
    assert s_res.status_code == 201
    s_data = s_res.json()
    screening_id = s_data["id"]

    # 3. Upload Sample Image
    img_res = client.post(
        f"/api/screenings/{screening_id}/image",
        data={"use_demo_sample": True, "sample_grade": 2},
        headers=headers
    )
    assert img_res.status_code == 200

    # 4. Assess Quality
    q_res = client.post("/api/ai/image-quality", json={"screening_id": screening_id}, headers=headers)
    assert q_res.status_code == 200
    assert q_res.json()["overall_score"] > 60

    # 5. Preprocess/Enhance Image
    enh_res = client.post("/api/ai/enhance", json={"screening_id": screening_id}, headers=headers)
    assert enh_res.status_code == 200

    # 6. Run AI Classification
    dr_res = client.post("/api/ai/classify-dr", json={"screening_id": screening_id}, headers=headers)
    assert dr_res.status_code == 200
    assert dr_res.json()["grade"] in [0, 1, 2, 3, 4]

    # 7. Doctor Review
    doc_login = client.post("/api/auth/login", json={"username": "doctor", "password": "doctor123"})
    doc_headers = {"Authorization": f"Bearer {doc_login.json()['access_token']}"}
    rev_payload = {
        "screening_id": screening_id,
        "decision": "ACCEPTED",
        "final_grade": dr_res.json()["grade"],
        "doctor_comments": "Looks consistent with moderate non-proliferative retinopathy."
    }
    rev_res = client.post("/api/reviews", json=rev_payload, headers=doc_headers)
    assert rev_res.status_code == 200

    # 8. Triage and Referral
    tri_payload = {
        "screening_id": screening_id,
        "risk_category": "MEDIUM",
        "urgency_level": "ROUTINE",
        "referral_recommended": True,
        "action_plan": "Refer to district eye specialist for dilated examination"
    }
    tri_res = client.post("/api/triage", json=tri_payload, headers=headers)
    assert tri_res.status_code == 200

    # 9. Generate Report
    rep_res = client.post(f"/api/reports/{screening_id}/generate", headers=headers)
    assert rep_res.status_code == 200
    assert rep_res.json()["pdf_url"].endswith(".pdf")

def test_invalid_state_transition():
    headers = get_auth_headers()
    # Creating a screening starts in PATIENT_REGISTERED
    p_res = client.post("/api/patients", json={
        "full_name": "State Machine Patient",
        "age": 45,
        "gender": "Male"
    }, headers=headers)
    patient_id = p_res.json()["id"]

    s_res = client.post("/api/screenings", json={"patient_id": patient_id}, headers=headers)
    screening_id = s_res.json()["id"]

    # Attempt to jump straight to TRIAGED without uploading image or AI analysis
    bad_transition = client.put(f"/api/screenings/{screening_id}", json={"status": "TRIAGED"}, headers=headers)
    assert bad_transition.status_code == 400

def test_sync_endpoints():
    headers = get_auth_headers()
    push_payload = {
        "items": [
            {
                "record_type": "patient",
                "record_id": "OFFLINE-001",
                "action": "UPSERT",
                "payload": {
                    "patient_id": "RET-2026-999991",
                    "full_name": "Sync Test Patient",
                    "age": 60,
                    "gender": "Female",
                    "screening_location": "Remote Village Camp"
                },
                "client_timestamp": "2026-09-02T10:00:00Z"
            }
        ]
    }
    push_res = client.post("/api/sync/push", json=push_payload, headers=headers)
    assert push_res.status_code == 200
    assert push_res.json()["synced_count"] == 1

    # Pull status
    status_res = client.get("/api/sync/status", headers=headers)
    assert status_res.status_code == 200
    assert status_res.json()["status"] == "Healthy"

    # Pull records
    pull_res = client.post("/api/sync/pull", headers=headers)
    assert pull_res.status_code == 200
    assert len(pull_res.json()["patients"]) > 0

def test_messidor2_evaluation_metrics():
    headers = get_auth_headers()
    res = client.get("/api/ai/evaluation", headers=headers)
    assert res.status_code == 200
    data = res.json()
    assert "sensitivity" in data
    assert "specificity" in data
    assert "confusion_matrix" in data
    assert data["sample_count"] > 500
    # Verify enhanced ensemble accuracy metrics
    assert "enhanced_ensemble" in data
    assert data["enhanced_ensemble"]["accuracy"] >= 0.97
    assert data["enhanced_ensemble"]["sensitivity"] >= 0.96
    assert data["enhanced_ensemble"]["roc_auc"] >= 0.99

def test_retinal_dual_field_stitching():
    headers = get_auth_headers()
    # 1. Create Patient & Screening
    p_res = client.post("/api/patients", json={"full_name": "Stitch Test Patient", "age": 48, "gender": "Male"}, headers=headers)
    assert p_res.status_code == 201
    pid = p_res.json()["id"]

    s_res = client.post("/api/screenings", json={"patient_id": pid, "eye": "Left Eye"}, headers=headers)
    assert s_res.status_code == 201
    sid = s_res.json()["id"]

    # 2. Upload Field 1 (Sample Macula)
    img_res = client.post(f"/api/screenings/{sid}/image", data={"use_demo_sample": True, "sample_grade": 2}, headers=headers)
    assert img_res.status_code == 200

    # 3. Stitch Dual Fields (Macula + Disc)
    stitch_res = client.post("/api/ai/stitch", json={"screening_id": sid, "sample_field_grade": 2}, headers=headers)
    assert stitch_res.status_code == 200
    stitch_data = stitch_res.json()
    assert "stitched_url" in stitch_data
    assert stitch_data["mosaic_width"] > 400
    assert "diagnostic_advantage" in stitch_data
