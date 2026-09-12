import pytest
from fastapi.testclient import TestClient
from app.main import app

client = TestClient(app)

def test_login_with_username_and_email():
    # 1. Login with demo username
    res1 = client.post("/api/auth/login", json={"username": "demo", "password": "demo123"})
    assert res1.status_code == 200
    assert res1.json()["user"]["username"] == "demo"

    # 2. Login with demo email
    res2 = client.post("/api/auth/login", json={"username": "ananya.sharma@phc-rural.in", "password": "demo123"})
    assert res2.status_code == 200
    assert res2.json()["user"]["username"] == "demo"

    # 3. Login with doctor username
    res3 = client.post("/api/auth/login", json={"username": "doctor", "password": "doctor123"})
    assert res3.status_code == 200
    assert res3.json()["user"]["role"] in ("DOCTOR", "Doctor")

    # 4. Login with doctor email
    res4 = client.post("/api/auth/login", json={"username": "rajesh.varma@districteye.in", "password": "doctor123"})
    assert res4.status_code == 200
    assert res4.json()["user"]["username"] == "doctor"

def test_register_new_healthcare_user():
    import time
    ts = int(time.time_ns() % 10000000)
    unique_user = f"ananya_doc_{ts}"
    unique_email = f"{unique_user}@eyeclinic.org"

    reg_payload = {
        "full_name": "Dr. Ananya",
        "email": unique_email,
        "username": unique_user,
        "password": "password123",
        "role": "Doctor"
    }
    res = client.post("/api/auth/register", json=reg_payload)
    assert res.status_code in (200, 201)
    data = res.json()
    assert "access_token" in data
    assert data["user"]["full_name"] == "Dr. Ananya"
    assert data["user"]["role"] == "Doctor"

    # Verify login with the new registered user using Email ID
    login_email_res = client.post("/api/auth/login", json={"username": unique_email, "password": "password123"})
    assert login_email_res.status_code == 200
    assert login_email_res.json()["user"]["full_name"] == "Dr. Ananya"

    # Verify login with the new registered user using Username
    login_user_res = client.post("/api/auth/login", json={"username": unique_user, "password": "password123"})
    assert login_user_res.status_code == 200
    assert login_user_res.json()["user"]["full_name"] == "Dr. Ananya"
