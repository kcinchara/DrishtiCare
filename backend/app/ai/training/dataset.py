import os
import cv2
import csv
import numpy as np
from pathlib import Path
from typing import List, Tuple, Optional, Dict, Any
from PIL import Image

import torch
from torch.utils.data import Dataset
import torchvision.transforms as transforms

# Standard normalization for deep convolutional backbones
NORM_MEAN = [0.485, 0.456, 0.406]
NORM_STD = [0.229, 0.224, 0.225]

def preprocess_fundus_image(img_bgr: np.ndarray, target_size: int = 224) -> np.ndarray:
    """
    Standardized Retinal Fundus Preprocessing Pipeline:
    1. Retinal Field-of-View (FOV) segmentation & black border cropping.
    2. Aspect-ratio preserving square padding to prevent retinal distortion.
    3. Bi-cubic resize to target resolution (224x224).
    4. Adaptive local contrast enhancement via CLAHE on L-channel (preserves color & lesions).
    5. Clean circular aperture feathering.
    6. BGR to RGB conversion.
    """
    if img_bgr is None or img_bgr.size == 0:
        raise ValueError("Invalid image input for fundus preprocessing")

    # 1. Retinal FOV segmentation & black border cropping
    gray = cv2.cvtColor(img_bgr, cv2.COLOR_BGR2GRAY)
    _, thresh = cv2.threshold(gray, 10, 255, cv2.THRESH_BINARY)
    contours, _ = cv2.findContours(thresh, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)

    if contours:
        c = max(contours, key=cv2.contourArea)
        x, y, cw, ch = cv2.boundingRect(c)
        if cw > 40 and ch > 40:
            img_bgr = img_bgr[y:y+ch, x:x+cw]

    # 2. Aspect-ratio preserving square padding
    h, w = img_bgr.shape[:2]
    max_side = max(h, w)
    pad_top = (max_side - h) // 2
    pad_bottom = max_side - h - pad_top
    pad_left = (max_side - w) // 2
    pad_right = max_side - w - pad_left

    squared = cv2.copyMakeBorder(
        img_bgr, pad_top, pad_bottom, pad_left, pad_right,
        cv2.BORDER_CONSTANT, value=[0, 0, 0]
    )

    # 3. Resize to target size
    resized = cv2.resize(squared, (target_size, target_size), interpolation=cv2.INTER_AREA)

    # 4. Adaptive contrast enhancement (CLAHE on L-channel of LAB + Green-channel microvascular enhancement)
    lab = cv2.cvtColor(resized, cv2.COLOR_BGR2LAB)
    l, a, b = cv2.split(lab)
    clahe_l = cv2.createCLAHE(clipLimit=2.0, tileGridSize=(8, 8))
    l_enhanced = clahe_l.apply(l)
    lab_enhanced = cv2.merge((l_enhanced, a, b))
    enhanced_bgr = cv2.cvtColor(lab_enhanced, cv2.COLOR_LAB2BGR)

    # Retinal microvascular lesions (microaneurysms & hemorrhages) exhibit highest contrast in green channel
    b_ch, g_ch, r_ch = cv2.split(enhanced_bgr)
    clahe_g = cv2.createCLAHE(clipLimit=2.2, tileGridSize=(8, 8))
    g_enhanced = clahe_g.apply(g_ch)
    g_blended = cv2.addWeighted(g_enhanced, 0.70, g_ch, 0.30, 0)
    enhanced_bgr = cv2.merge((b_ch, g_blended, r_ch))

    # 5. Clean circular aperture mask (eliminate outer noise)
    mask = np.zeros((target_size, target_size), dtype=np.uint8)
    center = (target_size // 2, target_size // 2)
    radius = int(target_size * 0.49)
    cv2.circle(mask, center, radius, 255, -1)

    masked_bgr = cv2.bitwise_and(enhanced_bgr, enhanced_bgr, mask=mask)

    # 6. BGR to RGB conversion
    rgb = cv2.cvtColor(masked_bgr, cv2.COLOR_BGR2RGB)
    return rgb

def get_train_transforms(target_size: int = 224) -> transforms.Compose:
    return transforms.Compose([
        transforms.ToPILImage(),
        transforms.RandomHorizontalFlip(p=0.5),
        transforms.RandomVerticalFlip(p=0.5),
        transforms.RandomRotation(degrees=30),
        transforms.ColorJitter(brightness=0.2, contrast=0.2, saturation=0.2),
        transforms.ToTensor(),
        transforms.Normalize(mean=NORM_MEAN, std=NORM_STD)
    ])

def get_val_transforms() -> transforms.Compose:
    return transforms.Compose([
        transforms.ToPILImage(),
        transforms.ToTensor(),
        transforms.Normalize(mean=NORM_MEAN, std=NORM_STD)
    ])

class RetinalDataset(Dataset):
    """
    PyTorch Dataset supporting:
      1. APTOS 2019 Blindness Detection format (id_code, diagnosis)
      2. IDRiD Grand Challenge format (Image name, Retinopathy grade)
      3. In-memory image arrays / paths
    """
    def __init__(
        self,
        samples: List[Tuple[str, int]],
        transform: Optional[transforms.Compose] = None,
        target_size: int = 224
    ):
        """
        samples: List of (image_path, dr_grade)
        dr_grade must be in [0, 1, 2, 3, 4]
        """
        self.samples = samples
        self.transform = transform or get_val_transforms()
        self.target_size = target_size

    def __len__(self) -> int:
        return len(self.samples)

    def __getitem__(self, idx: int) -> Tuple[torch.Tensor, int]:
        img_path, label = self.samples[idx]
        img_bgr = cv2.imread(str(img_path))
        if img_bgr is None:
            # Create neutral fallback if corrupted
            img_bgr = np.zeros((self.target_size, self.target_size, 3), dtype=np.uint8)

        img_rgb = preprocess_fundus_image(img_bgr, target_size=self.target_size)
        tensor_img = self.transform(img_rgb)
        return tensor_img, int(label)

def load_aptos_or_idrid_dataset(
    csv_path: str,
    images_dir: str,
    dataset_type: str = "auto"
) -> List[Tuple[str, int]]:
    """
    Parses original expert-provided labels from APTOS 2019 or IDRiD CSV.
    """
    samples: List[Tuple[str, int]] = []
    with open(csv_path, mode="r", encoding="utf-8") as f:
        reader = csv.DictReader(f)
        fieldnames = reader.fieldnames or []
        if "id_code" in fieldnames and "diagnosis" in fieldnames:
            # APTOS 2019
            for row in reader:
                fname = str(row["id_code"]).strip()
                label = int(row["diagnosis"])
                for ext in [".png", ".jpg", ".jpeg"]:
                    candidate = os.path.join(images_dir, f"{fname}{ext}")
                    if os.path.exists(candidate):
                        samples.append((candidate, label))
                        break
        elif "Image name" in fieldnames and "Retinopathy grade" in fieldnames:
            # IDRiD
            for row in reader:
                fname = str(row["Image name"]).strip()
                label = int(row["Retinopathy grade"])
                for ext in ["", ".jpg", ".png", ".jpeg"]:
                    candidate = os.path.join(images_dir, f"{fname}{ext}")
                    if os.path.exists(candidate):
                        samples.append((candidate, label))
                        break
        else:
            raise ValueError(f"Unrecognized CSV columns: {fieldnames}. Expected APTOS (id_code, diagnosis) or IDRiD (Image name, Retinopathy grade).")

    return samples
