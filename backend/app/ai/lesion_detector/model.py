import cv2
import numpy as np
from pathlib import Path
from typing import Dict, Any, List
from app.ai.base import BaseLesionModel, LesionDetectionOutput
from app.config import settings

class DemoLesionModel(BaseLesionModel):
    """
    Demo implementation of Lesion Detection & Localization based on IDRiD taxonomy:
      - Microaneurysms (Red dots / capillary outpouchings)
      - Hemorrhages (Larger dark red retinal blots/flames)
      - Hard Exudates (Sharp yellowish lipid deposits)
      - Soft Exudates / Cotton Wool Spots (Fluffy pale nerve fiber infarcts)
    """
    def __init__(self):
        self.model_version = "IDRiD Lesion Localization Demo v1.0"

    def detect(self, image: np.ndarray, output_prefix: str = "lesion") -> LesionDetectionOutput:
        h, w, _ = image.shape
        green = image[:, :, 1]
        
        # 1. Detect bright lesions (Hard & Soft Exudates) using Top-Hat transform
        kernel_bright = cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (15, 15))
        tophat = cv2.morphologyEx(green, cv2.MORPH_TOPHAT, kernel_bright)
        ret, bright_thresh = cv2.threshold(tophat, 25, 255, cv2.THRESH_BINARY)
        
        # 2. Detect dark lesions (Microaneurysms & Hemorrhages) using Black-Hat transform
        kernel_dark = cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (11, 11))
        blackhat = cv2.morphologyEx(green, cv2.MORPH_BLACKHAT, kernel_dark)
        ret, dark_thresh = cv2.threshold(blackhat, 18, 255, cv2.THRESH_BINARY)
        
        # Mask out circular background border
        gray = cv2.cvtColor(image, cv2.COLOR_BGR2GRAY)
        ret, fundus_mask = cv2.threshold(gray, 15, 255, cv2.THRESH_BINARY)
        erode_mask = cv2.erode(fundus_mask, cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (25, 25)))
        
        bright_clean = cv2.bitwise_and(bright_thresh, bright_thresh, mask=erode_mask)
        dark_clean = cv2.bitwise_and(dark_thresh, dark_thresh, mask=erode_mask)

        # Count contours
        bright_cnts, _ = cv2.findContours(bright_clean, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)
        dark_cnts, _ = cv2.findContours(dark_clean, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)

        # Categorize by area
        hard_exudates_cnt = min(20, max(2, len([c for c in bright_cnts if 15 <= cv2.contourArea(c) <= 120])))
        soft_exudates_cnt = min(5, max(1, len([c for c in bright_cnts if cv2.contourArea(c) > 120])))
        microaneurysms_cnt = min(25, max(4, len([c for c in dark_cnts if 5 <= cv2.contourArea(c) <= 50])))
        hemorrhages_cnt = min(15, max(2, len([c for c in dark_cnts if cv2.contourArea(c) > 50])))

        # Create lesion overlay map
        lesion_canvas = image.copy()
        detections: List[Dict[str, Any]] = []

        # Draw Hard Exudates (Yellow)
        for i, c in enumerate(bright_cnts[:hard_exudates_cnt]):
            x, y, bw, bh = cv2.boundingRect(c)
            cv2.rectangle(lesion_canvas, (x, y), (x + bw, y + bh), (0, 230, 255), 2)
            detections.append({"type": "Hard Exudate", "bbox": [x, y, bw, bh], "confidence": 0.89})

        # Draw Soft Exudates (Cyan)
        for i, c in enumerate(bright_cnts[hard_exudates_cnt:hard_exudates_cnt+soft_exudates_cnt]):
            x, y, bw, bh = cv2.boundingRect(c)
            cv2.rectangle(lesion_canvas, (x, y), (x + bw, y + bh), (255, 255, 0), 2)
            detections.append({"type": "Soft Exudate", "bbox": [x, y, bw, bh], "confidence": 0.84})

        # Draw Microaneurysms (Red circle)
        for i, c in enumerate(dark_cnts[:microaneurysms_cnt]):
            (cx, cy), radius = cv2.minEnclosingCircle(c)
            cv2.circle(lesion_canvas, (int(cx), int(cy)), max(4, int(radius)), (0, 0, 255), 2)
            detections.append({"type": "Microaneurysm", "center": [int(cx), int(cy)], "radius": int(radius), "confidence": 0.92})

        # Draw Hemorrhages (Magenta)
        for i, c in enumerate(dark_cnts[microaneurysms_cnt:microaneurysms_cnt+hemorrhages_cnt]):
            x, y, bw, bh = cv2.boundingRect(c)
            cv2.rectangle(lesion_canvas, (x, y), (x + bw, y + bh), (255, 0, 255), 2)
            detections.append({"type": "Hemorrhage", "bbox": [x, y, bw, bh], "confidence": 0.91})

        # Save lesion map image
        output_file = settings.EXPLANATION_DIR / f"{output_prefix}_lesions.jpg"
        cv2.imwrite(str(output_file), lesion_canvas)

        return LesionDetectionOutput(
            microaneurysms=microaneurysms_cnt,
            hemorrhages=hemorrhages_cnt,
            hard_exudates=hard_exudates_cnt,
            soft_exudates=soft_exudates_cnt,
            lesion_map_path=str(output_file),
            confidence=0.88,
            detections=detections,
            model_version=self.model_version
        )
