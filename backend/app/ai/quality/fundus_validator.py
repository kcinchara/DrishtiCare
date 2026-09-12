import os
import cv2
import numpy as np
from typing import Tuple, Union
from pathlib import Path

def validate_fundus_image(image: Union[np.ndarray, str, Path]) -> Tuple[bool, str]:
    """
    Validates whether an input image is a valid ocular retinal fundus photograph.
    Can accept an OpenCV BGR np.ndarray or a file path (str/Path).
    
    Returns:
        (is_valid, error_message):
        If valid: (True, "Valid fundus photograph")
        If invalid: (False, "This image does not appear to be a retinal fundus photograph. Please upload a valid fundus image.")
    """
    if isinstance(image, (str, Path)):
        if not os.path.exists(str(image)):
            return False, "This image does not appear to be a retinal fundus photograph. Please upload a valid fundus image."
        image = cv2.imread(str(image))

    if image is None or not isinstance(image, np.ndarray):
        return False, "This image does not appear to be a retinal fundus photograph. Please upload a valid fundus image."

    if len(image.shape) != 3 or image.shape[2] != 3:
        return False, "This image does not appear to be a retinal fundus photograph. Please upload a valid fundus image."

    h, w, _ = image.shape
    if h < 150 or w < 150:
        return False, "This image does not appear to be a retinal fundus photograph. Please upload a valid fundus image."

    # Convert to grayscale and HSV
    gray = cv2.cvtColor(image, cv2.COLOR_BGR2GRAY)
    hsv = cv2.cvtColor(image, cv2.COLOR_BGR2HSV)
    
    # 1. Check for blank or pure black/white images
    mean_val = float(np.mean(gray))
    if mean_val < 8.0 or mean_val > 248.0:
        return False, "This image does not appear to be a retinal fundus photograph. Please upload a valid fundus image."

    # 2. Extract foreground (exclude black background aperture common in fundus cameras)
    _, mask = cv2.threshold(gray, 15, 255, cv2.THRESH_BINARY)
    fg_pixels = int(np.count_nonzero(mask))
    total_pixels = h * w

    # A fundus image must have meaningful content, usually >= 10% of aperture
    if fg_pixels < 0.10 * total_pixels:
        return False, "This image does not appear to be a retinal fundus photograph. Please upload a valid fundus image."

    # In OpenCV, channels are BGR
    b_chan = image[:, :, 0]
    g_chan = image[:, :, 1]
    r_chan = image[:, :, 2]

    # Calculate channel means inside foreground
    mean_b = float(cv2.mean(b_chan, mask=mask)[0])
    mean_g = float(cv2.mean(g_chan, mask=mask)[0])
    mean_r = float(cv2.mean(r_chan, mask=mask)[0])

    # 3. Retinal Color Ratio Check:
    # Fundus images are dominated by melanin, hemoglobin, and retinal pigment:
    # Red is predominantly the highest channel, and Blue is significantly lower.
    # Non-fundus images (sky, faces, documents, green trees, general photos) fail this.
    if mean_r < 30.0:
        return False, "This image does not appear to be a retinal fundus photograph. Please upload a valid fundus image."

    # Blue ratio relative to Red:
    # Retinal tissue has very low blue reflectance. In real fundus images, B / R is typically < 0.70.
    # Non-fundus photos (daylight, landscapes, indoor scenes, white documents) have B / R > 0.75.
    blue_ratio = mean_b / (mean_r + 1e-5)
    if blue_ratio > 0.78:
        return False, "This image does not appear to be a retinal fundus photograph. Please upload a valid fundus image."

    # Red must exceed Blue by a decisive margin for vascularized ocular fundus
    if mean_r <= mean_b + 12.0:
        return False, "This image does not appear to be a retinal fundus photograph. Please upload a valid fundus image."

    # 4. Retinal Hue Distribution (HSV):
    # Fundus colors (orange-red, dark red, yellowish optic disc) have Hue in [0, 32] or [160, 180]
    h_chan = hsv[:, :, 0]
    s_chan = hsv[:, :, 1]

    # Filter for retinal hue with minimum saturation (not gray or washed-out white)
    retinal_hue_mask = (
        ((h_chan <= 32) | (h_chan >= 160)) &
        (s_chan >= 25) &
        (mask > 0)
    )
    retinal_pixel_count = int(np.count_nonzero(retinal_hue_mask))
    retinal_hue_ratio = retinal_pixel_count / (fg_pixels + 1e-5)

    # In authentic fundus photos, at least 38% of illuminated pixels fall into the retinal hue band
    if retinal_hue_ratio < 0.38:
        return False, "This image does not appear to be a retinal fundus photograph. Please upload a valid fundus image."

    # Passed optical fundus validation
    return True, "Valid fundus photograph"
