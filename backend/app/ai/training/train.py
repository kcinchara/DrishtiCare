import os
import sys
import time
import argparse
import numpy as np
from pathlib import Path
from typing import List, Tuple, Dict, Any

# Ensure backend root is on sys.path
backend_dir = str(Path(__file__).resolve().parents[3])
if backend_dir not in sys.path:
    sys.path.insert(0, backend_dir)

import torch
import torch.nn as nn
from torch.utils.data import DataLoader
from sklearn.metrics import accuracy_score, cohen_kappa_score, classification_report, confusion_matrix
from sklearn.model_selection import train_test_split

from app.ai.training.model_arch import RetinalDRClassifier
from app.ai.training.dataset import (
    RetinalDataset, get_train_transforms, get_val_transforms,
    load_aptos_or_idrid_dataset
)
from app.utils.sample_generator import generate_synthetic_fundus

def generate_benchmark_dataset(
    output_dir: Path,
    samples_per_class: int = 36
) -> List[Tuple[str, int]]:
    """
    Generates a structured multi-domain benchmark training dataset covering all 5 ICDR classes:
    DR 0, DR 1, DR 2, DR 3, DR 4 with distinct lesion patterns, varied pigmentation,
    and realistic photographic noise.
    """
    output_dir.mkdir(parents=True, exist_ok=True)
    samples: List[Tuple[str, int]] = []

    for grade in range(5):
        for idx in range(samples_per_class):
            filename = f"calib_dr{grade}_sample_{idx:03d}.jpg"
            filepath = output_dir / filename
            center_mode = "macula" if idx % 2 == 0 else "disc"
            seed = int(grade * 1000 + idx * 7 + 13)
            src_path = generate_synthetic_fundus(
                grade=grade,
                filename=str(filename),
                field_center=center_mode,
                seed=seed,
                force_recreate=True
            )
            import shutil
            if Path(src_path).resolve() != filepath.resolve():
                shutil.copy(src_path, filepath)
            samples.append((str(filepath), grade))

    return samples

def generate_test_dataset(
    test_dir: Path,
    samples_per_class: int = 8
) -> Path:
    """
    Generates a clean, separate unseen test directory with 5 explicit class folders:
      test/
        DR0/
        DR1/
        DR2/
        DR3/
        DR4/
    """
    test_dir.mkdir(parents=True, exist_ok=True)
    import shutil
    for grade in range(5):
        grade_dir = test_dir / f"DR{grade}"
        grade_dir.mkdir(parents=True, exist_ok=True)
        for idx in range(samples_per_class):
            filename = f"eval_dr{grade}_img_{idx:03d}.jpg"
            target_path = grade_dir / filename
            center_mode = "macula" if idx % 2 == 0 else "disc"
            test_seed = int(50000 + grade * 500 + idx * 11 + 37)
            src_path = generate_synthetic_fundus(
                grade=grade,
                filename=str(filename),
                field_center=center_mode,
                seed=test_seed,
                force_recreate=True
            )
            if Path(src_path).resolve() != target_path.resolve():
                shutil.copy(src_path, target_path)
    return test_dir

def compute_class_weights(labels: List[int], num_classes: int = 5) -> torch.Tensor:
    """Computes balanced inverse-frequency class weights with sensitivity tuning for subtle lesion stages."""
    counts = np.bincount(labels, minlength=num_classes)
    total = len(labels)
    weights = total / (num_classes * np.maximum(counts, 1).astype(np.float32))
    # Give DR 1 (isolated microaneurysms) a sensitivity boost
    weights[1] *= 1.35
    weights = weights / np.mean(weights)
    return torch.tensor(weights, dtype=torch.float32)

def train_one_epoch(
    model: nn.Module,
    loader: DataLoader,
    criterion: nn.Module,
    optimizer: torch.optim.Optimizer,
    device: torch.device
) -> Tuple[float, float]:
    model.train()
    running_loss = 0.0
    all_preds, all_labels = [], []

    for images, labels in loader:
        images = images.to(device)
        labels = labels.to(device)

        optimizer.zero_grad()
        logits = model(images)
        loss = criterion(logits, labels)
        loss.backward()
        optimizer.step()

        running_loss += loss.item() * images.size(0)
        preds = torch.argmax(logits, dim=-1).cpu().numpy()
        all_preds.extend(preds)
        all_labels.extend(labels.cpu().numpy())

    epoch_loss = running_loss / len(loader.dataset)
    epoch_acc = accuracy_score(all_labels, all_preds)
    return epoch_loss, epoch_acc

def evaluate_model(
    model: nn.Module,
    loader: DataLoader,
    criterion: nn.Module,
    device: torch.device
) -> Dict[str, Any]:
    model.eval()
    running_loss = 0.0
    all_preds, all_labels, all_probs = [], [], []

    with torch.no_grad():
        for images, labels in loader:
            images = images.to(device)
            labels = labels.to(device)

            logits = model(images)
            loss = criterion(logits, labels)
            running_loss += loss.item() * images.size(0)

            probs = torch.softmax(logits, dim=-1).cpu().numpy()
            preds = np.argmax(probs, axis=-1)

            all_probs.extend(probs)
            all_preds.extend(preds)
            all_labels.extend(labels.cpu().numpy())

    val_loss = running_loss / len(loader.dataset)
    val_acc = accuracy_score(all_labels, all_preds)
    try:
        val_qwk = cohen_kappa_score(all_labels, all_preds, weights="quadratic")
    except Exception:
        val_qwk = 0.0

    return {
        "val_loss": val_loss,
        "val_acc": val_acc,
        "val_qwk": val_qwk,
        "preds": np.array(all_preds),
        "labels": np.array(all_labels),
        "probs": np.array(all_probs),
        "cm": confusion_matrix(all_labels, all_preds, labels=[0, 1, 2, 3, 4])
    }

def train_dr_classifier(
    data_dir: Optional[str] = None,
    csv_path: Optional[str] = None,
    checkpoint_path: str = "app/ai/dr_classifier/dr_model_checkpoint.pth",
    backbone: str = "resnet18",
    epochs: int = 15,
    batch_size: int = 8,
    lr: float = 1e-4,
    device_name: str = "cpu"
) -> Dict[str, Any]:
    device = torch.device(device_name if torch.cuda.is_available() and device_name == "cuda" else "cpu")
    print(f"[*] Initializing Training Pipeline on device: {device}")

    # 1. Prepare Dataset
    if csv_path and os.path.exists(csv_path) and data_dir and os.path.exists(data_dir):
        print(f"[*] Loading dataset from CSV: {csv_path}")
        samples = load_aptos_or_idrid_dataset(csv_path, data_dir)
    else:
        print("[*] Generating multi-class ICDR benchmark dataset (Grades 0 to 4)...")
        bench_dir = Path("media/benchmark_dr")
        samples = generate_benchmark_dataset(bench_dir, samples_per_class=36)

    labels = [s[1] for s in samples]
    counts = np.bincount(labels, minlength=5)

    print("\n" + "=" * 40)
    print("      DATASET CLASS DISTRIBUTION")
    print("=" * 40)
    for g in range(5):
        print(f"DR{g}: {counts[g]} images")
    print("=" * 40)
    print(f"[*] Total dataset size: {len(samples)} samples.\n")

    # Split Train / Validation
    train_samples, val_samples = train_test_split(
        samples, test_size=0.25, random_state=42, stratify=labels
    )
    print(f"[*] Train set: {len(train_samples)}, Validation set: {len(val_samples)}")

    train_ds = RetinalDataset(train_samples, transform=get_train_transforms())
    val_ds = RetinalDataset(val_samples, transform=get_val_transforms())

    train_loader = DataLoader(train_ds, batch_size=batch_size, shuffle=True)
    val_loader = DataLoader(val_ds, batch_size=batch_size, shuffle=False)

    # 2. Build Model & Loss
    model = RetinalDRClassifier(backbone=backbone, pretrained=True, num_classes=5)
    checkpoint_file = Path(checkpoint_path)
    checkpoint_file.parent.mkdir(parents=True, exist_ok=True)
    if checkpoint_file.exists():
        try:
            ckpt = torch.load(str(checkpoint_file), map_location=device, weights_only=False)
            state_dict = ckpt.get("model_state_dict", ckpt)
            model.load_state_dict(state_dict)
            print(f"[*] Warm-started from checkpoint: {checkpoint_file} (Prev QWK: {ckpt.get('val_qwk', 0):.3f})")
        except Exception as e:
            print(f"[!] Could not warm-start: {e}")

    model = model.to(device)

    train_labels = [s[1] for s in train_samples]
    class_weights = compute_class_weights(train_labels, num_classes=5).to(device)
    criterion = nn.CrossEntropyLoss(weight=class_weights)

    optimizer = torch.optim.AdamW(model.parameters(), lr=lr, weight_decay=1e-2)
    scheduler = torch.optim.lr_scheduler.CosineAnnealingLR(optimizer, T_max=epochs)

    best_qwk = -1.0
    best_loss = float("inf")

    print(f"[*] Starting training loop ({epochs} epochs)...")
    for epoch in range(1, epochs + 1):
        t0 = time.time()
        train_loss, train_acc = train_one_epoch(model, train_loader, criterion, optimizer, device)
        val_metrics = evaluate_model(model, val_loader, criterion, device)
        scheduler.step()
        elapsed = time.time() - t0

        print(
            f"Epoch [{epoch:02d}/{epochs:02d}] ({elapsed:.1f}s) | "
            f"Train Loss: {train_loss:.4f}, Train Acc: {train_acc*100:.1f}% | "
            f"Val Loss: {val_metrics['val_loss']:.4f}, Val Acc: {val_metrics['val_acc']*100:.1f}%, "
            f"Val QWK: {val_metrics['val_qwk']:.3f}"
        )

        # Checkpoint if validation improved
        if val_metrics["val_qwk"] > best_qwk or (val_metrics["val_qwk"] == best_qwk and val_metrics["val_loss"] < best_loss):
            best_qwk = val_metrics["val_qwk"]
            best_loss = val_metrics["val_loss"]
            torch.save({
                "epoch": epoch,
                "model_state_dict": model.state_dict(),
                "backbone": backbone,
                "num_classes": 5,
                "val_acc": val_metrics["val_acc"],
                "val_qwk": val_metrics["val_qwk"],
                "class_weights": class_weights.cpu().numpy().tolist()
            }, str(checkpoint_file))
            print(f"  --> Saved new best model checkpoint to {checkpoint_file} (QWK: {best_qwk:.3f})")

    # Load best checkpoint for final summary
    print(f"\n[*] Training Complete. Loading best checkpoint from {checkpoint_file}...")
    checkpoint = torch.load(str(checkpoint_file), map_location=device, weights_only=False)
    model.load_state_dict(checkpoint["model_state_dict"])
    final_eval = evaluate_model(model, val_loader, criterion, device)

    print("\n================ FINAL VALIDATION REPORT ================")
    print(f"Accuracy: {final_eval['val_acc']*100:.2f}%")
    print(f"Quadratic Weighted Kappa (QWK): {final_eval['val_qwk']:.4f}")
    print("\nConfusion Matrix (Rows: Ground Truth 0-4, Cols: Predicted 0-4):")
    print(final_eval["cm"])
    print("\nDetailed Classification Report:")
    target_names = ["DR 0 (No DR)", "DR 1 (Mild)", "DR 2 (Moderate)", "DR 3 (Severe)", "DR 4 (Proliferative)"]
    print(classification_report(final_eval["labels"], final_eval["preds"], target_names=target_names, zero_division=0))
    print("========================================================\n")

    return final_eval

if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Train 5-Class Diabetic Retinopathy Classifier")
    parser.add_argument("--epochs", type=int, default=12, help="Number of training epochs")
    parser.add_argument("--batch_size", type=int, default=8, help="Batch size")
    parser.add_argument("--lr", type=float, default=2e-4, help="Learning rate")
    parser.add_argument("--csv", type=str, default=None, help="Path to APTOS/IDRiD CSV")
    parser.add_argument("--images", type=str, default=None, help="Path to images directory")
    args = parser.parse_args()

    train_dr_classifier(
        data_dir=args.images,
        csv_path=args.csv,
        epochs=args.epochs,
        batch_size=args.batch_size,
        lr=args.lr
    )
