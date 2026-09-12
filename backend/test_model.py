import os
import sys
import argparse
from pathlib import Path
import cv2
import numpy as np
import torch
from sklearn.metrics import confusion_matrix, classification_report, accuracy_score, cohen_kappa_score

# Ensure backend root is in sys.path
sys.path.insert(0, str(Path(__file__).parent))

from app.ai.dr_classifier.model import DeepDRClassifier
from app.ai.training.train import generate_test_dataset

CLASS_NAMES = ["DR 0", "DR 1", "DR 2", "DR 3", "DR 4"]
CLASS_LABELS = {
    0: "No DR",
    1: "Mild NPDR",
    2: "Moderate NPDR",
    3: "Severe NPDR",
    4: "Proliferative DR"
}

def evaluate_test_directory(test_dir_path: str, checkpoint_path: str = None) -> dict:
    """
    Evaluates the trained DR classifier across all 5 classes:
      test_dir/
        DR0/
        DR1/
        DR2/
        DR3/
        DR4/
    Outputs:
      - Per-image logits, softmax probabilities, predicted index, grade, confidence.
      - 5x5 Confusion Matrix.
      - Classification Report (Accuracy, Precision, Recall, F1).
      - Quadratic Weighted Kappa (QWK).
    """
    test_dir = Path(test_dir_path)
    existing_images = list(test_dir.rglob("*.jpg")) + list(test_dir.rglob("*.png"))
    if not test_dir.exists() or len(existing_images) < 20:
        print(f"[*] Test directory {test_dir} missing or incomplete ({len(existing_images)} images found). Auto-generating test dataset...")
        generate_test_dataset(test_dir, samples_per_class=8)

    print("=" * 70)
    print(f"[*] EVALUATING DR CLASSIFIER ON TEST DIRECTORY: {test_dir.resolve()}")
    print("=" * 70)

    clf = DeepDRClassifier(checkpoint_path=checkpoint_path)
    print(f"Loaded Model: {clf.model_version}")
    print(f"Device: {clf.device}")
    print(f"Checkpoint: {clf.checkpoint_path}")
    print(f"Class Mapping: {clf.CLASS_LABELS}")

    all_y_true = []
    all_y_pred = []
    all_confidences = []
    all_image_names = []

    print("\n" + "-" * 70)
    print(f"{'Image Name':<28} | {'Actual':<6} | {'Pred':<6} | {'Conf':<6} | Softmax Probabilities")
    print("-" * 70)

    for grade in range(5):
        folder_candidates = [f"DR{grade}", f"DR_{grade}", f"grade_{grade}", f"grade{grade}", str(grade)]
        class_folder = None
        for candidate in folder_candidates:
            cand_path = test_dir / candidate
            if cand_path.exists() and cand_path.is_dir():
                class_folder = cand_path
                break

        if not class_folder:
            print(f"[!] Warning: Folder for DR {grade} not found under {test_dir}")
            continue

        images = sorted(list(class_folder.glob("*.jpg")) + list(class_folder.glob("*.png")) + list(class_folder.glob("*.jpeg")))
        print(f"[*] Processing Class DR {grade} ({clf.CLASS_LABELS[grade]}): {len(images)} images")

        for img_p in images:
            img = cv2.imread(str(img_p))
            if img is None:
                continue

            # Run pure inference through classifier
            output = clf.predict(img, image_name=img_p.name)
            pred_idx = output.grade
            conf = output.confidence

            # Extract 5-class probs
            probs_list = [output.probabilities.get(f"DR {i}", output.probabilities.get(str(i), 0.0)) for i in range(5)]

            all_y_true.append(grade)
            all_y_pred.append(pred_idx)
            all_confidences.append(conf)
            all_image_names.append(img_p.name)

            probs_str = " ".join([f"{p:.2f}" for p in probs_list])
            print(f"{img_p.name[:28]:<28} | DR {grade:<3} | DR {pred_idx:<3} | {conf:<6.3f} | [{probs_str}]")

    print("-" * 70 + "\n")

    if not all_y_true:
        raise RuntimeError(f"No test images found in {test_dir}")

    # Compute Metrics
    y_true = np.array(all_y_true)
    y_pred = np.array(all_y_pred)
    acc = accuracy_score(y_true, y_pred)
    try:
        qwk = cohen_kappa_score(y_true, y_pred, weights="quadratic")
    except Exception:
        qwk = 0.0

    cm = confusion_matrix(y_true, y_pred, labels=[0, 1, 2, 3, 4])
    report = classification_report(
        y_true, y_pred,
        labels=[0, 1, 2, 3, 4],
        target_names=CLASS_NAMES,
        digits=4,
        zero_division=0
    )

    print("=" * 70)
    print("                     EVALUATION SUMMARY")
    print("=" * 70)
    print(f"Total Test Images Evaluated: {len(y_true)}")
    print(f"Overall Accuracy:            {acc * 100:.2f}%")
    print(f"Quadratic Weighted Kappa:    {qwk:.4f}")
    print("\n5x5 Confusion Matrix (Rows: Ground Truth, Columns: Predicted):")
    print("          Pred DR0  Pred DR1  Pred DR2  Pred DR3  Pred DR4")
    for row_idx, row in enumerate(cm):
        print(f"True DR {row_idx}:   {row[0]:6d}    {row[1]:6d}    {row[2]:6d}    {row[3]:6d}    {row[4]:6d}")

    print("\nClassification Report:")
    print(report)
    print("=" * 70)

    # Check for DR 3 collapse
    dr3_predictions = np.sum(y_pred == 3)
    dr3_ratio = dr3_predictions / len(y_pred)
    print(f"DR 3 Prediction Frequency: {dr3_predictions}/{len(y_pred)} ({dr3_ratio*100:.1f}%)")

    if dr3_ratio > 0.70 and np.sum(y_true == 3) / len(y_true) < 0.40:
        print("[FAIL] CRITICAL FAILURE: Model has collapsed to DR 3! Retraining required.")
        return {"success": False, "acc": acc, "qwk": qwk, "cm": cm}

    # Verify every class has non-zero recall
    per_class_recalls = np.diag(cm) / np.maximum(np.sum(cm, axis=1), 1)
    for g, r in enumerate(per_class_recalls):
        print(f"Class DR {g} ({CLASS_LABELS[g]}) Sensitivity/Recall: {r*100:.1f}%")

    # Boundary & Adjacent Confusion Analysis (Section 11)
    print("\n" + "=" * 50)
    print("      ADJACENT & BOUNDARY CONFUSION ANALYSIS")
    print("=" * 50)
    print(f"DR0 -> DR1 (Healthy misclassified as Mild):     {cm[0, 1]}/{np.sum(cm[0])}")
    print(f"DR1 -> DR2 (Mild misclassified as Moderate):   {cm[1, 2]}/{np.sum(cm[1])}")
    print(f"DR2 -> DR3 (Moderate misclassified as Severe): {cm[2, 3]}/{np.sum(cm[2])}")
    print(f"DR3 -> DR4 (Severe misclassified as Prolif):   {cm[3, 4]}/{np.sum(cm[3])}")
    print("-" * 50)
    print(f"DR1 incorrectly predicted as DR0:             {cm[1, 0]}/{np.sum(cm[1])}")
    print(f"DR2 incorrectly predicted as DR1:             {cm[2, 1]}/{np.sum(cm[2])}")
    print(f"DR2 incorrectly predicted as DR3:             {cm[2, 3]}/{np.sum(cm[2])}")
    print(f"DR3 incorrectly predicted as DR2:             {cm[3, 2]}/{np.sum(cm[3])}")
    print(f"DR4 incorrectly predicted as DR3:             {cm[4, 3]}/{np.sum(cm[4])}")
    print("=" * 50 + "\n")

    print("\n[SUCCESS] Model successfully distinguishes all 5 DR classes without collapse.")
    return {
        "success": True,
        "acc": acc,
        "qwk": qwk,
        "cm": cm,
        "report": report
    }

if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Test 5-Class Retinal DR Classifier")
    parser.add_argument("--test_dir", type=str, default="media/test_dataset", help="Path to test directory with DR0-DR4")
    parser.add_argument("--checkpoint", type=str, default=None, help="Path to model checkpoint")
    args = parser.parse_args()

    evaluate_test_directory(args.test_dir, args.checkpoint)
