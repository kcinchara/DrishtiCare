import numpy as np
import cv2
import pytest
from fastapi.testclient import TestClient
from app.main import app
from app.ai.quality.fundus_validator import validate_fundus_image
from app.ai.quality.service import ImageQualityAssessmentService
from app.utils.sample_generator import generate_synthetic_fundus

client = TestClient(app)

def test_fundus_validation_on_synthetic_fundus():
    img_bgr = generate_synthetic_fundus(grade=2)
    is_valid, reason = validate_fundus_image(img_bgr)
    assert is_valid is True, f"Synthetic fundus should be valid, but got: {reason}"
    assert "Red dominance" in reason or "Valid fundus" in reason

def test_fundus_validation_on_non_fundus_image():
    # 1. Solid blue image (e.g., sky or UI)
    blue_img = np.full((512, 512, 3), (255, 100, 20), dtype=np.uint8)
    is_valid, reason = validate_fundus_image(blue_img)
    assert is_valid is False
    assert "does not appear to be a retinal fundus photograph" in reason or "fundus" in reason

    # 2. Random noisy grayscale image
    noise_img = np.random.randint(0, 255, (512, 512, 3), dtype=np.uint8)
    is_valid_noise, reason_noise = validate_fundus_image(noise_img)
    assert is_valid_noise is False

def test_assess_quality_rejects_non_fundus(tmp_path):
    blue_img = np.full((512, 512, 3), (255, 120, 30), dtype=np.uint8)
    temp_file = str(tmp_path / "blue_image.png")
    cv2.imwrite(temp_file, blue_img)
    quality = ImageQualityAssessmentService.assess_quality(temp_file)
    assert quality["status"] == "INVALID_IMAGE"
    assert quality["is_suitable_for_ai"] is False
    assert quality["is_fundus"] is False
    assert "does not appear to be a retinal fundus photograph" in quality["recommendation"] or "fundus" in quality["recommendation"]

def test_nearby_facilities_endpoint():
    res = client.get("/api/referrals/facilities?latitude=12.9716&longitude=77.5946&severity=HIGH")
    assert res.status_code == 200
    data = res.json()
    assert "facilities" in data
    assert "recommended" in data
    facilities = data["facilities"]
    assert isinstance(facilities, list)
    assert len(facilities) >= 1
    first = facilities[0]
    assert "name" in first
    assert "distance" in first
    assert "address" in first
    assert "contact" in first
    assert "name" in data["recommended"] and len(data["recommended"]["name"]) > 0

def test_exact_non_fundus_rejection_message():
    blue_img = np.full((512, 512, 3), (255, 120, 30), dtype=np.uint8)
    is_valid, reason = validate_fundus_image(blue_img)
    assert is_valid is False
    assert reason == "This image does not appear to be a retinal fundus photograph. Please upload a valid fundus image."

def test_exact_poor_quality_rejection_message(tmp_path):
    # Pure black image with zero variance (insufficient quality)
    black_img = np.zeros((512, 512, 3), dtype=np.uint8)
    temp_file = str(tmp_path / "black_img.png")
    cv2.imwrite(temp_file, black_img)
    quality = ImageQualityAssessmentService.assess_quality(temp_file)
    assert quality["is_suitable_for_ai"] is False
    assert quality["recommendation"] == "Image quality is insufficient for reliable analysis. Please upload a clearer fundus image." or quality["recommendation"] == "This image does not appear to be a retinal fundus photograph. Please upload a valid fundus image."

