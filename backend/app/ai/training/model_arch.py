import torch
import torch.nn as nn
import torchvision.models as models
from typing import Dict, Any, Tuple

class RetinalDRClassifier(nn.Module):
    """
    Deep Convolutional Classifier for 5-Class Diabetic Retinopathy Triage.
    Target ICDR 5-Class Stages:
      0 -> DR 0: No DR
      1 -> DR 1: Mild NPDR
      2 -> DR 2: Moderate NPDR
      3 -> DR 3: Severe NPDR
      4 -> DR 4: Proliferative DR
    """
    def __init__(self, backbone: str = "resnet18", pretrained: bool = True, num_classes: int = 5, dropout: float = 0.3):
        super().__init__()
        self.backbone_name = backbone
        self.num_classes = num_classes

        if backbone == "resnet18":
            weights = models.ResNet18_Weights.DEFAULT if pretrained else None
            base = models.resnet18(weights=weights)
            num_features = base.fc.in_features
            # Extract conv backbone layers
            self.conv_base = nn.Sequential(
                base.conv1,
                base.bn1,
                base.relu,
                base.maxpool,
                base.layer1,
                base.layer2,
                base.layer3,
                base.layer4
            )
            self.avgpool = base.avgpool
            self.classifier = nn.Sequential(
                nn.Flatten(),
                nn.Dropout(p=dropout),
                nn.Linear(num_features, 256),
                nn.ReLU(inplace=True),
                nn.Dropout(p=dropout * 0.5),
                nn.Linear(256, num_classes)
            )
        else:
            raise ValueError(f"Unsupported backbone: {backbone}")

    def forward(self, x: torch.Tensor) -> torch.Tensor:
        """Outputs raw logits for the 5 classes."""
        feat = self.conv_base(x)
        pooled = self.avgpool(feat)
        logits = self.classifier(pooled)
        return logits

    def get_last_conv_layer(self) -> nn.Module:
        """Returns the final convolutional block for Grad-CAM activation hooks."""
        # layer4 in ResNet
        return self.conv_base[7]

    def predict_probabilities(self, x: torch.Tensor) -> Tuple[torch.Tensor, torch.Tensor]:
        """Returns (probabilities, predicted_classes)."""
        self.eval()
        with torch.no_grad():
            logits = self.forward(x)
            probs = torch.softmax(logits, dim=-1)
            preds = torch.argmax(probs, dim=-1)
        return probs, preds
