import os
import cv2
import numpy as np
from pathlib import Path
from app.config import settings

class ImageEnhancementService:
    """
    OpenCV Retinal Image Enhancement Pipeline.
    Steps:
      1. Color space transformation (BGR -> LAB)
      2. CLAHE (Contrast Limited Adaptive Histogram Equalization) on L channel
      3. Illumination normalization & bilateral denoising
      4. Recombination and retinal mask preservation
    """
    @staticmethod
    def enhance_image(image_path: str, output_prefix: str) -> dict:
        img = cv2.imread(image_path)
        if img is None:
            raise ValueError(f"Could not load image from {image_path}")

        # 1. Convert BGR to LAB color space
        lab = cv2.cvtColor(img, cv2.COLOR_BGR2LAB)
        l_channel, a_channel, b_channel = cv2.split(lab)

        # 2. Apply CLAHE to L (Lightness) channel
        clahe = cv2.createCLAHE(clipLimit=2.5, tileGridSize=(8, 8))
        cl_l = clahe.apply(l_channel)

        # 3. Bilateral filter for edge-preserving denoising
        denoised_l = cv2.bilateralFilter(cl_l, d=5, sigmaColor=35, sigmaSpace=35)

        # 4. Illumination normalization
        # Estimate background illumination using large Gaussian blur
        bg = cv2.GaussianBlur(denoised_l, (51, 51), 0)
        norm_l = cv2.addWeighted(denoised_l, 1.2, bg, -0.2, 10)

        # 5. Merge channels back
        enhanced_lab = cv2.merge([norm_l, a_channel, b_channel])
        enhanced_bgr = cv2.cvtColor(enhanced_lab, cv2.COLOR_LAB2BGR)

        # 6. Mask out non-retinal background (preserve circular field)
        gray = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)
        ret, mask = cv2.threshold(gray, 10, 255, cv2.THRESH_BINARY)
        # Morphological smoothing on mask
        kernel = cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (9, 9))
        mask_clean = cv2.morphologyEx(mask, cv2.MORPH_CLOSE, kernel)
        mask_3ch = cv2.merge([mask_clean, mask_clean, mask_clean])
        
        final_enhanced = np.where(mask_3ch == 255, enhanced_bgr, 0)

        # Save enhanced image
        output_filename = f"{output_prefix}_enhanced.jpg"
        output_filepath = settings.ENHANCED_DIR / output_filename
        cv2.imwrite(str(output_filepath), final_enhanced)

        return {
            "enhanced_path": str(output_filepath),
            "clahe_applied": True,
            "illumination_normalized": True,
            "noise_reduced": True,
            "contrast_enhanced": True,
            "quality_status": "Improved",
            "metadata_info": {
                "clahe_clip_limit": 2.5,
                "tile_grid_size": "8x8",
                "color_space": "LAB",
                "denoising": "Bilateral (sigma=35)",
                "mask_preserved": True
            }
        }
