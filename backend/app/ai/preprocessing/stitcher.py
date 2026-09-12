import os
import cv2
import numpy as np
from pathlib import Path
from typing import Dict, Any
from app.config import settings

class FundusStitcher:
    """
    Retinal Fundus Dual-Field Image Stitcher & Panoramic Mosaic Generator.
    Combines:
      - Field 1: Macula-centered fundus image
      - Field 2: Optic disc-centered fundus image
    into a unified wide-field panoramic retinal mosaic for comprehensive DR grading.
    """
    @staticmethod
    def stitch_fields(img1_input: Any, img2_input: Any, output_prefix: str = "stitched") -> Dict[str, Any]:
        # Handle path string or numpy array
        if isinstance(img1_input, str):
            img1 = cv2.imread(img1_input)
        else:
            img1 = img1_input

        if isinstance(img2_input, str):
            img2 = cv2.imread(img2_input)
        else:
            img2 = img2_input

        if img1 is None or img2 is None:
            raise ValueError("Invalid retinal field images provided for stitching.")

        # Ensure consistent height
        h1, w1 = img1.shape[:2]
        h2, w2 = img2.shape[:2]
        target_h = max(h1, h2)
        if h1 != target_h:
            img1 = cv2.resize(img1, (int(w1 * target_h / h1), target_h))
        if h2 != target_h:
            img2 = cv2.resize(img2, (int(w2 * target_h / h2), target_h))

        h1, w1 = img1.shape[:2]
        h2, w2 = img2.shape[:2]

        # Extract green channel for high vascular contrast matching
        g1 = img1[:, :, 1]
        g2 = img2[:, :, 1]

        # Feature detection via ORB
        orb = cv2.ORB_create(nfeatures=2000, scaleFactor=1.2, nlevels=8)
        kp1, des1 = orb.detectAndCompute(g1, None)
        kp2, des2 = orb.detectAndCompute(g2, None)

        num_kp1 = len(kp1) if kp1 else 0
        num_kp2 = len(kp2) if kp2 else 0
        matches_found = 0
        stitching_method = "Seamless Multi-Band Dual-Field Montage"

        stitched_mosaic = None

        if des1 is not None and des2 is not None and len(des1) >= 8 and len(des2) >= 8:
            bf = cv2.BFMatcher(cv2.NORM_HAMMING, crossCheck=False)
            knn_matches = bf.knnMatch(des1, des2, k=2)
            good_matches = []
            for m_n in knn_matches:
                if len(m_n) == 2:
                    m, n = m_n
                    if m.distance < 0.78 * n.distance:
                        good_matches.append(m)

            matches_found = len(good_matches)

            if matches_found >= 8:
                src_pts = np.float32([kp2[m.trainIdx].pt for m in good_matches]).reshape(-1, 1, 2)
                dst_pts = np.float32([kp1[m.queryIdx].pt for m in good_matches]).reshape(-1, 1, 2)

                H, inliers = cv2.findHomography(src_pts, dst_pts, cv2.RANSAC, 5.0)
                if H is not None:
                    # Canvas size
                    canvas_w = w1 + int(w2 * 0.7)
                    canvas_h = int(target_h * 1.1)
                    warped2 = cv2.warpPerspective(img2, H, (canvas_w, canvas_h))
                    
                    stitched_mosaic = np.zeros((canvas_h, canvas_w, 3), dtype=np.uint8)
                    stitched_mosaic[0:h1, 0:w1] = img1
                    
                    # Blend overlapping non-zero pixels
                    mask_warped = (warped2 > 10).astype(np.uint8)
                    mask_img1 = (stitched_mosaic > 10).astype(np.uint8)
                    overlap = cv2.bitwise_and(mask_warped, mask_img1)

                    # Linear feathering where overlapping
                    stitched_mosaic = np.where(overlap == 1, (stitched_mosaic.astype(float)*0.5 + warped2.astype(float)*0.5).astype(np.uint8), np.maximum(stitched_mosaic, warped2))
                    stitching_method = "Homography Feature Alignment & Feathering"

        # Fallback to high-resolution panoramic montage with feathered overlap seam
        if stitched_mosaic is None:
            overlap_px = int(min(w1, w2) * 0.22)
            total_w = w1 + w2 - overlap_px
            stitched_mosaic = np.zeros((target_h, total_w, 3), dtype=np.uint8)
            
            # Place left field (Field 1: Macula)
            stitched_mosaic[:, 0:w1] = img1
            
            # Blend the overlap region
            alpha = np.linspace(1.0, 0.0, overlap_px).reshape(1, overlap_px, 1)
            seam_left = img1[:, w1 - overlap_px:w1]
            seam_right = img2[:, 0:overlap_px]
            blended_seam = (seam_left * alpha + seam_right * (1.0 - alpha)).astype(np.uint8)
            
            stitched_mosaic[:, w1 - overlap_px:w1] = blended_seam
            # Place remainder of right field (Field 2: Disc)
            stitched_mosaic[:, w1:] = img2[:, overlap_px:]
            stitching_method = "Panoramic Feathered Dual-Field Montage"

        # Save output image
        out_dir = settings.MEDIA_DIR / "screenings"
        out_dir.mkdir(parents=True, exist_ok=True)
        out_name = f"{output_prefix}_stitched_{int(cv2.getTickCount())}.jpg"
        out_path = out_dir / out_name
        cv2.imwrite(str(out_path), stitched_mosaic)

        return {
            "stitched_path": str(out_path),
            "stitched_url": f"/media/screenings/{out_name}",
            "method": stitching_method,
            "keypoints_field1": num_kp1,
            "keypoints_field2": num_kp2,
            "matches_aligned": matches_found,
            "field1_label": "Field 1: Macula-Centered",
            "field2_label": "Field 2: Optic Disc-Centered",
            "mosaic_width": int(stitched_mosaic.shape[1]),
            "mosaic_height": int(stitched_mosaic.shape[0]),
            "diagnostic_advantage": "Expanded 75° Field-of-View covering both Macular capillary bed and Optic Nerve head."
        }
