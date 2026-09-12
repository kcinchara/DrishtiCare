"""
Standalone Evaluation and Validation Script for 5-Class Retinal DR Classifier.
Verifies the production model on all 5 ICDR Diabetic Retinopathy classes:
  0 -> DR 0: No DR
  1 -> DR 1: Mild NPDR
  2 -> DR 2: Moderate NPDR
  3 -> DR 3: Severe NPDR
  4 -> DR 4: Proliferative DR

Computes:
  - 5x5 Confusion Matrix
  - Precision, Recall, F1-Score per class
  - Overall Accuracy
  - Quadratic Weighted Kappa (QWK)
  - Non-degeneracy test (asserts the model does not predict the same class for every image)
"""
import os
import sys
import cv2
import numpy as np
from pathlib import Path
from sklearn.metrics import accuracy_score, cohen_kappa_score, classification_report, confusion_matrix

from app.ai.dr_classifier.model import DeepDRClassifier
from app.utils.sample_generator import generate_synthetic_fundus

def run_evaluation(samples_per_class: int = 5):
    print("==================================================================")
    print("      DRISTICARE -- 5-CLASS DR AI VALIDATION & METRIC SUITE       ")
    print("==================================================================")

    clf = DeepDRClassifier()
    print(f"[*] Initialized Model: {clf.model_version}")
    print(f"[*] Checkpoint Status: {'LOADED (' + clf.checkpoint_path + ')' if clf.is_loaded else 'INITIALIZED'}")
    print(f"[*] Target Classes: DR 0, DR 1, DR 2, DR 3, DR 4\n")

    eval_dir = Path("media/validation_eval")
    eval_dir.mkdir(parents=True, exist_ok=True)

    y_true = []
    y_pred = []
    all_confs = []
    all_probs = []

    print(f"[*] Generating and evaluating {samples_per_class * 5} multi-class test images...")
    for grade in range(5):
        print(f"\n--- Testing Class DR {grade} ({clf.CLASS_LABELS[grade]}) ---")
        for idx in range(samples_per_class):
            fname = f"val_dr{grade}_sample_{idx}.jpg"
            img_path = eval_dir / fname
            if not img_path.exists():
                field_mode = "macula" if idx % 2 == 0 else "disc"
                generate_synthetic_fundus(grade=grade, filename=fname, field_center=field_mode)
                gen_src = Path("media/uploads") / fname
                if gen_src.exists() and not img_path.exists():
                    import shutil
                    shutil.copy(gen_src, img_path)

            img = cv2.imread(str(img_path))
            res = clf.predict(img)

            y_true.append(grade)
            y_pred.append(res.grade)
            all_confs.append(res.confidence)
            all_probs.append(res.probabilities)

            match_symbol = "PASS" if res.grade == grade else "FAIL"
            print(
                f"  [{match_symbol}] Image {fname}: Ground Truth=DR {grade} -> "
                f"Predicted=DR {res.grade} ({res.label}), Conf={res.confidence*100:.1f}%, "
                f"Probs={res.probabilities}"
            )

    y_true = np.array(y_true)
    y_pred = np.array(y_pred)

    # 1. Verification of Non-Degenerate Predictions
    unique_preds = np.unique(y_pred)
    print("\n==================== NON-DEGENERACY CHECK ====================")
    print(f"Total Unique Classes Predicted: {len(unique_preds)} / 5 ({list(unique_preds)})")
    if len(unique_preds) < 2:
        raise AssertionError("CRITICAL FAILURE: The model is predicting the SAME class for all images!")
    else:
        print("[PASS] Confirmed: Model produces distinct, non-trivial predictions across different fundus images!")

    # 2. Confusion Matrix
    cm = confusion_matrix(y_true, y_pred, labels=[0, 1, 2, 3, 4])
    print("\n==================== 5x5 CONFUSION MATRIX ====================")
    print("                Predicted DR0  DR1  DR2  DR3  DR4")
    for i, row in enumerate(cm):
        print(f"Ground Truth DR{i}:         {row[0]:4d} {row[1]:4d} {row[2]:4d} {row[3]:4d} {row[4]:4d}")

    # 3. Accuracy & Quadratic Weighted Kappa
    acc = accuracy_score(y_true, y_pred)
    qwk = cohen_kappa_score(y_true, y_pred, weights="quadratic")

    print("\n==================== PERFORMANCE METRICS ====================")
    print(f"Overall Accuracy:                {acc*100:.2f}%")
    print(f"Quadratic Weighted Kappa (QWK):  {qwk:.4f}")
    print(f"Average Model Confidence:        {np.mean(all_confs)*100:.2f}%")

    # 4. Per-Class Precision, Recall, F1-Score
    class_names = ["DR 0 (No DR)", "DR 1 (Mild)", "DR 2 (Moderate)", "DR 3 (Severe)", "DR 4 (Proliferative)"]
    print("\n================ CLASSIFICATION REPORT ===================")
    print(classification_report(y_true, y_pred, target_names=class_names, labels=[0, 1, 2, 3, 4], zero_division=0))
    print("==========================================================")

    return {
        "accuracy": acc,
        "qwk": qwk,
        "confusion_matrix": cm,
        "unique_predictions": len(unique_preds)
    }

if __name__ == "__main__":
    run_evaluation(samples_per_class=5)
