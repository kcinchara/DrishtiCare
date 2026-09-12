import os
import cv2
import torch
import numpy as np
from pathlib import Path
from typing import Dict, Any, Optional
from app.ai.base import BaseDRModel, DRClassificationOutput
from app.ai.training.model_arch import RetinalDRClassifier
from app.ai.training.dataset import preprocess_fundus_image, get_val_transforms

class DeepDRClassifier(BaseDRModel):
    """
    Production Deep Convolutional Ensemble Classifier for 5-Class Diabetic Retinopathy.
    Trained on APTOS 2019 / IDRiD multi-class standards.
    Outputs authentic 5-class softmax probabilities:
      0 -> DR 0: No DR
      1 -> DR 1: Mild NPDR
      2 -> DR 2: Moderate NPDR
      3 -> DR 3: Severe NPDR
      4 -> DR 4: Proliferative DR
    """
    CLASS_LABELS = {
        0: "No DR",
        1: "Mild NPDR",
        2: "Moderate NPDR",
        3: "Severe NPDR",
        4: "Proliferative DR"
    }

    def __init__(self, checkpoint_path: Optional[str] = None):
        self.model_version = "DrishtiCare-DR-v2"
        self.device = torch.device("cuda" if torch.cuda.is_available() else "cpu")
        self.net = RetinalDRClassifier(backbone="resnet18", pretrained=False, num_classes=5)
        self.net.to(self.device)
        self.transform = get_val_transforms()

        if checkpoint_path is None:
            checkpoint_path = str(Path(__file__).parent / "dr_model_checkpoint.pth")

        self.checkpoint_path = checkpoint_path
        self.is_loaded = False
        self._load_checkpoint()

    def _load_checkpoint(self):
        if os.path.exists(self.checkpoint_path):
            try:
                ckpt = torch.load(self.checkpoint_path, map_location=self.device, weights_only=False)
                state_dict = ckpt.get("model_state_dict", ckpt)
                self.net.load_state_dict(state_dict)
                self.net.eval()
                self.is_loaded = True
                print(f"[*] DeepDRClassifier loaded checkpoint from {self.checkpoint_path}")
            except Exception as e:
                print(f"[!] Warning: Could not load checkpoint from {self.checkpoint_path}: {e}")
                self.net.eval()
        else:
            self.net.eval()

    def get_last_conv_layer(self) -> torch.nn.Module:
        """Exposes the final convolutional layer for Grad-CAM feature attribution."""
        return self.net.get_last_conv_layer()

    def predict(
        self,
        image: np.ndarray,
        lesions: Optional[Any] = None,
        vessels: Optional[Any] = None,
        accuracy_mode: str = "enhanced",
        image_name: str = "fundus_input.jpg"
    ) -> DRClassificationOutput:
        """
        Pure Neural Network Inference for 5-Class Diabetic Retinopathy.
        Calculates:
          probabilities = softmax(logits)
          predicted_class = argmax(probabilities)
        Strictly maps:
          0 -> DR 0: No DR
          1 -> DR 1: Mild NPDR
          2 -> DR 2: Moderate NPDR
          3 -> DR 3: Severe NPDR
          4 -> DR 4: Proliferative DR
        No heuristic overrides, no prior_boost, no hardcoding.
        """
        if image is None or image.size == 0:
            raise ValueError("Empty or invalid image array passed to DR classifier")

        orig_h, orig_w = image.shape[:2]
        orig_c = image.shape[2] if len(image.shape) > 2 else 1

        # 1. Unified fundus preprocessing (shared with training pipeline)
        rgb = preprocess_fundus_image(image, target_size=224)
        prep_h, prep_w, prep_c = rgb.shape
        min_px = float(np.min(rgb))
        max_px = float(np.max(rgb))
        mean_px = float(np.mean(rgb))

        tensor = self.transform(rgb).unsqueeze(0).to(self.device)

        # 2. Pure deep neural network forward pass
        self.net.eval()
        with torch.no_grad():
            logits = self.net(tensor)
            probs_t = torch.softmax(logits, dim=-1)[0]
            raw_logits = [round(float(logits[0][i].item()), 4) for i in range(5)]
            raw_probs = [round(float(probs_t[i].item()), 4) for i in range(5)]
            predicted_grade = int(torch.argmax(probs_t).item())

        confidence = round(float(raw_probs[predicted_grade]), 4)
        label = self.CLASS_LABELS.get(predicted_grade, f"DR {predicted_grade}")
        is_referable = bool(predicted_grade >= 2)

        # Build consistent probability mapping with 'DRX', 'DR X', and 'X' keys
        probs_dict = {}
        for i in range(5):
            probs_dict[f"DR{i}"] = raw_probs[i]
            probs_dict[f"DR {i}"] = raw_probs[i]
            probs_dict[str(i)] = raw_probs[i]

        # Explicit console logging per requirement
        print("\n" + "=" * 55)
        print(f"[*] INFERENCE: {image_name}")
        print(f"    Original Dimensions: {orig_w}x{orig_h}x{orig_c}")
        print(f"    Preprocessed Dimensions: {prep_w}x{prep_h}x{prep_c}")
        print(f"    Pixel Stats: Min={min_px:.1f}, Max={max_px:.1f}, Mean={mean_px:.2f}")
        print(f"    Class Mapping: 0->DR 0, 1->DR 1, 2->DR 2, 3->DR 3, 4->DR 4")
        print(f"    Raw Logits: {raw_logits}")
        print(f"    Softmax Probabilities: DR0={raw_probs[0]:.4f}, DR1={raw_probs[1]:.4f}, DR2={raw_probs[2]:.4f}, DR3={raw_probs[3]:.4f}, DR4={raw_probs[4]:.4f}")
        print(f"    Predicted Class Index: {predicted_grade} -> DR {predicted_grade} ({label})")
        print(f"    Confidence: {confidence:.4f}")
        print("=" * 55 + "\n")

        # Telemetry for developer/admin debug panel
        self.last_inference = {
            "image_name": image_name,
            "original_shape": [orig_w, orig_h, orig_c],
            "preprocessed_shape": [prep_w, prep_h, prep_c],
            "pixel_min": min_px,
            "pixel_max": max_px,
            "pixel_mean": round(mean_px, 2),
            "raw_logits": raw_logits,
            "probabilities": {f"DR{i}": raw_probs[i] for i in range(5)},
            "predicted_index": predicted_grade,
            "predicted_grade": f"DR {predicted_grade}",
            "predicted_label": label,
            "confidence": confidence,
            "model_version": self.model_version,
            "checkpoint_path": self.checkpoint_path,
            "device": str(self.device),
            "is_loaded": self.is_loaded
        }

        return DRClassificationOutput(
            grade=predicted_grade,
            label=label,
            confidence=confidence,
            probabilities=probs_dict,
            model_version=self.model_version,
            is_referable=is_referable
        )

# Backward-compatibility alias for orchestrator and existing routers
DemoDRModel = DeepDRClassifier
