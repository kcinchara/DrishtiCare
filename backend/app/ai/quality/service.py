import cv2
import numpy as np
from typing import Dict, Any, List

from app.ai.quality.fundus_validator import validate_fundus_image

class ImageQualityAssessmentService:
    """
    Modular Computer Vision Image Quality Gate for Retinal Fundus Screening.
    Evaluates:
      0. Fundus Ocular Image Validation (Rejects non-retinal photographs)
      1. Focus / Blur (Laplacian variance)
      2. Illumination (Green channel luminance distribution)
      3. Glare / Specular Reflection (Saturation highlights)
      4. Field of View (Circular fundus mask coverage)
      5. Vessel Visibility (High-frequency vessel contrast)
      6. Retinal Area Coverage
    """
    @staticmethod
    def assess_quality(image_path: str) -> Dict[str, Any]:
        reasons: List[str] = []
        
        # Load image with OpenCV
        img = cv2.imread(image_path)
        if img is None:
            return {
                "overall_score": 0.0,
                "status": "INSUFFICIENT",
                "blur_score": 0.0,
                "illumination_score": 0.0,
                "glare_score": 0.0,
                "field_of_view_score": 0.0,
                "vessel_visibility": 0.0,
                "retinal_coverage_score": 0.0,
                "recommendation": "Unable to read image file. Please recapture retinal image.",
                "reasons": ["Invalid image file or corrupted format"],
                "is_suitable_for_ai": False,
                "is_fundus": False
            }

        # Validate that image is an ocular fundus photograph
        is_fundus, fundus_msg = validate_fundus_image(img)
        if not is_fundus:
            return {
                "overall_score": 0.0,
                "status": "INVALID_IMAGE",
                "blur_score": 0.0,
                "illumination_score": 0.0,
                "glare_score": 0.0,
                "field_of_view_score": 0.0,
                "vessel_visibility": 0.0,
                "retinal_coverage_score": 0.0,
                "recommendation": "This image does not appear to be a retinal fundus photograph. Please upload a valid fundus image.",
                "reasons": ["This image does not appear to be a retinal fundus photograph. Please upload a valid fundus image."],
                "is_suitable_for_ai": False,
                "is_fundus": False
            }
            
        h, w, c = img.shape
        gray = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)
        green = img[:, :, 1]  # Green channel provides highest fundus contrast
        
        # 1. Focus / Blur (Laplacian variance normalized)
        lap_var = cv2.Laplacian(gray, cv2.CV_64F).var()
        blur_score = min(100.0, max(15.0, (lap_var / 300.0) * 85.0 + 15.0))
        if blur_score < 60.0:
            reasons.append("Excessive blur detected — camera defocus")

        # 2. Illumination (Mean & Std of green channel inside mask)
        mean_lum = np.mean(green)
        if 50 <= mean_lum <= 180:
            illum_score = 92.0 - abs(mean_lum - 115) * 0.3
        elif mean_lum < 50:
            illum_score = max(20.0, (mean_lum / 50.0) * 55.0)
            reasons.append("Under-illuminated retinal field")
        else:
            illum_score = max(20.0, 100.0 - (mean_lum - 180) * 0.8)
            reasons.append("Over-illuminated / washed out retinal field")
        illum_score = max(10.0, min(100.0, illum_score))

        # 3. Glare (Percentage of saturated pixels > 245)
        glare_ratio = np.sum(gray > 245) / (h * w)
        if glare_ratio < 0.015:
            glare_score = 96.0 - (glare_ratio * 300)
        else:
            glare_score = max(15.0, 80.0 - (glare_ratio * 800))
            reasons.append("Excessive corneal/lens glare artifact")
        glare_score = max(10.0, min(100.0, glare_score))

        # 4. Field of view & Retinal Coverage (Circular fundus mask)
        ret, thresh = cv2.threshold(gray, 15, 255, cv2.THRESH_BINARY)
        contours, _ = cv2.findContours(thresh, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)
        fov_score = 93.0
        coverage_score = 91.0
        if contours:
            largest_cnt = max(contours, key=cv2.contourArea)
            area = cv2.contourArea(largest_cnt)
            img_area = h * w
            coverage_pct = (area / img_area) * 100.0
            if coverage_pct > 30.0:
                fov_score = min(98.0, 75.0 + (coverage_pct * 0.25))
                coverage_score = min(96.0, 70.0 + (coverage_pct * 0.3))
            else:
                fov_score = max(25.0, coverage_pct * 1.5)
                coverage_score = max(20.0, coverage_pct * 1.4)
                reasons.append("Insufficient retinal field or aperture cutoff")

        # 5. Vessel Visibility (Contrast in green channel)
        clahe = cv2.createCLAHE(clipLimit=2.0, tileGridSize=(8, 8))
        cl_green = clahe.apply(green)
        vessel_contrast = np.std(cl_green)
        vessel_visibility = min(98.0, max(25.0, (vessel_contrast / 55.0) * 90.0))
        if vessel_visibility < 55.0:
            reasons.append("Low retinal vessel visibility / poor optical transmission")

        # Overall composite score (Weighted sum)
        overall_score = (
            blur_score * 0.25 +
            illum_score * 0.20 +
            glare_score * 0.15 +
            fov_score * 0.15 +
            vessel_visibility * 0.15 +
            coverage_score * 0.10
        )
        overall_score = round(float(overall_score), 1)

        if overall_score >= 75.0 and len(reasons) <= 1:
            status = "GOOD"
            recommendation = "Image is suitable for AI analysis."
            is_suitable = True
        elif overall_score >= 55.0:
            status = "BORDERLINE"
            recommendation = "Borderline quality. Image enhancement recommended prior to AI screening."
            is_suitable = True
        else:
            status = "INSUFFICIENT"
            recommendation = "Image quality is insufficient for reliable analysis. Please upload a clearer fundus image."
            is_suitable = False

        return {
            "overall_score": overall_score,
            "status": status,
            "blur_score": round(float(blur_score), 1),
            "illumination_score": round(float(illum_score), 1),
            "glare_score": round(float(glare_score), 1),
            "field_of_view_score": round(float(fov_score), 1),
            "vessel_visibility": round(float(vessel_visibility), 1),
            "retinal_coverage_score": round(float(coverage_score), 1),
            "recommendation": recommendation,
            "reasons": reasons,
            "is_suitable_for_ai": is_suitable,
            "is_fundus": True
        }
