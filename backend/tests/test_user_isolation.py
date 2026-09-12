"""
Requirement 37: Privacy & Isolation Test
Test Scenario:
- User A registers.
- User A creates Patient A.
- User A creates screening for Patient A.
- User A logs out.
- User B registers / logs in.
- Patient A must NOT appear in User B's patient list.
- User B creates Patient B.
- User B logs out.
- User A logs back in.
- Patient B must NOT appear in User A's patient list.
"""
import os
import sys
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))
import uuid
import pytest
from fastapi.testclient import TestClient
from app.main import app

client = TestClient(app)

def test_strict_user_data_isolation():
    uid_a = str(uuid.uuid4())[:8]
    uid_b = str(uuid.uuid4())[:8]

    # 1. Register User A
    res_a = client.post("/api/auth/register", json={
        "username": f"user_a_{uid_a}",
        "email": f"usera_{uid_a}@hospital.org",
        "full_name": f"Healthcare Worker A {uid_a}",
        "password": "password123",
        "role": "HEALTHCARE_WORKER",
        "hospital_id": "HOSP-ALPHA"
    })
    assert res_a.status_code == 200, res_a.text
    token_a = res_a.json()["access_token"]
    headers_a = {"Authorization": f"Bearer {token_a}"}

    # 2. User A creates Patient A
    p_res_a = client.post("/api/patients", json={
        "full_name": f"Patient A {uid_a}",
        "age": 45,
        "gender": "Female",
        "screening_location": "PHC Alpha"
    }, headers=headers_a)
    assert p_res_a.status_code == 201
    patient_a = p_res_a.json()
    p_id_a = patient_a["id"]

    # 3. User A creates Screening for Patient A
    s_res_a = client.post("/api/screenings", json={
        "patient_id": p_id_a,
        "eye": "Right Eye"
    }, headers=headers_a)
    assert s_res_a.status_code == 201

    # 4. User A logs out
    client.post("/api/auth/logout", headers=headers_a)

    # 5. Register User B
    res_b = client.post("/api/auth/register", json={
        "username": f"user_b_{uid_b}",
        "email": f"userb_{uid_b}@hospital.org",
        "full_name": f"Healthcare Worker B {uid_b}",
        "password": "password123",
        "role": "HEALTHCARE_WORKER",
        "hospital_id": "HOSP-BETA"
    })
    assert res_b.status_code == 200
    token_b = res_b.json()["access_token"]
    headers_b = {"Authorization": f"Bearer {token_b}"}

    # 6. User B lists patients - MUST BE EMPTY (Patient A must NOT appear!)
    list_b = client.get("/api/patients", headers=headers_b)
    assert list_b.status_code == 200
    b_patients = list_b.json()
    b_patient_names = [p["full_name"] for p in b_patients]
    assert patient_a["full_name"] not in b_patient_names
    assert len(b_patients) == 0, f"User B expected 0 patients, got {len(b_patients)}"

    # Also User B cannot access Patient A directly by ID
    direct_access = client.get(f"/api/patients/{p_id_a}", headers=headers_b)
    assert direct_access.status_code == 403, f"Expected 403 Forbidden, got {direct_access.status_code}"

    # 7. User B creates Patient B
    p_res_b = client.post("/api/patients", json={
        "full_name": f"Patient B {uid_b}",
        "age": 60,
        "gender": "Male",
        "screening_location": "PHC Beta"
    }, headers=headers_b)
    assert p_res_b.status_code == 201
    patient_b = p_res_b.json()
    p_id_b = patient_b["id"]

    # 8. User B logs out
    client.post("/api/auth/logout", headers=headers_b)

    # 9. User A logs back in
    login_a = client.post("/api/auth/login", json={
        "username": f"user_a_{uid_a}",
        "password": "password123"
    })
    assert login_a.status_code == 200
    token_a2 = login_a.json()["access_token"]
    headers_a2 = {"Authorization": f"Bearer {token_a2}"}

    # 10. User A lists patients - must see Patient A, must NOT see Patient B!
    list_a = client.get("/api/patients", headers=headers_a2)
    assert list_a.status_code == 200
    a_patients = list_a.json()
    a_patient_ids = [p["id"] for p in a_patients]
    assert p_id_a in a_patient_ids
    assert p_id_b not in a_patient_ids

    # User A cannot directly access Patient B
    direct_access_b = client.get(f"/api/patients/{p_id_b}", headers=headers_a2)
    assert direct_access_b.status_code == 403

    print(f"[SUCCESS] Requirement 37 Privacy Test Passed: Strict data isolation verified between User A ({uid_a}) and User B ({uid_b})!")

if __name__ == "__main__":
    test_strict_user_data_isolation()
