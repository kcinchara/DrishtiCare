import cv2
import numpy as np
from pathlib import Path
from app.ai.base import BaseVesselModel, VesselSegmentationOutput
from app.config import settings

class DemoVesselModel(BaseVesselModel):
    """
    Demo implementation of Retinal Vessel Segmentation based on DRIVE dataset principles.
    Uses Green-channel CLAHE, Frangi-like multiscale line morphology, and adaptive thresholding
    to extract vessel trees, vessel visibility score, and visual overlays.
    """
    def __init__(self):
        self.model_version = "DRIVE Vessel Segmentation Demo v1.0"

    def segment(self, image: np.ndarray, output_prefix: str = "vessel") -> VesselSegmentationOutput:
        h, w, _ = image.shape
        green = image[:, :, 1]
        
        # 1. CLAHE contrast enhancement
        clahe = cv2.createCLAHE(clipLimit=3.0, tileGridSize=(8, 8))
        cl_green = clahe.apply(green)
        
        # 2. Invert green channel (vessels are darker than retina)
        inv_green = cv2.bitwise_not(cl_green)
        
        # 3. Morphological opening with structural kernels at multiple orientations to extract lines
        vessel_acc = np.zeros_like(inv_green)
        for angle in [0, 45, 90, 135]:
            kernel_len = 9
            kernel = np.zeros((kernel_len, kernel_len), dtype=np.uint8)
            if angle == 0:
                kernel[kernel_len//2, :] = 1
            elif angle == 90:
                kernel[:, kernel_len//2] = 1
            elif angle == 45:
                np.fill_diagonal(kernel, 1)
            elif angle == 135:
                np.fill_diagonal(np.fliplr(kernel), 1)
            
            opened = cv2.morphologyEx(inv_green, cv2.MORPH_TOPHAT, kernel)
            vessel_acc = cv2.max(vessel_acc, opened)
            
        # 4. Adaptive thresholding
        thresh = cv2.adaptiveThreshold(
            vessel_acc, 255, cv2.ADAPTIVE_THRESH_GAUSSIAN_C, cv2.THRESH_BINARY, 15, -2
        )
        
        # 5. Mask out background boundary
        gray = cv2.cvtColor(image, cv2.COLOR_BGR2GRAY)
        ret, fundus_mask = cv2.threshold(gray, 15, 255, cv2.THRESH_BINARY)
        erode_mask = cv2.erode(fundus_mask, cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (15, 15)))
        clean_vessel_mask = cv2.bitwise_and(thresh, thresh, mask=erode_mask)
        
        # 6. Remove isolated tiny noise pixels
        clean_vessel_mask = cv2.morphologyEx(
            clean_vessel_mask, cv2.MORPH_OPEN, cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (3, 3))
        )
        
        # Calculate vessel density / visibility score
        vessel_pixels = np.sum(clean_vessel_mask == 255)
        retinal_pixels = np.sum(erode_mask == 255)
        density = (vessel_pixels / max(1, retinal_pixels)) * 100.0
        vessel_visibility = min(0.98, max(0.65, 0.70 + (density / 15.0) * 0.25))
        vessel_visibility = round(float(vessel_visibility), 2)
        
        # 7. Create visual overlay (Bright Cyan/Green on retina)
        overlay = image.copy()
        overlay[clean_vessel_mask == 255] = [255, 220, 0]  # Cyan-Yellow BGR
        
        # Save mask and overlay files
        mask_file = settings.EXPLANATION_DIR / f"{output_prefix}_vessel_mask.png"
        overlay_file = settings.EXPLANATION_DIR / f"{output_prefix}_vessel_overlay.jpg"
        
        cv2.imwrite(str(mask_file), clean_vessel_mask)
        cv2.imwrite(str(overlay_file), overlay)
        
        return VesselSegmentationOutput(
            vessel_visibility=vessel_visibility,
            mask_path=str(mask_file),
            overlay_path=str(overlay_file),
            model_version=self.model_version
        )
