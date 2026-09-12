from abc import ABC, abstractmethod
from typing import Dict, Any, List, Optional
import numpy as np

class DRClassificationOutput:
    def __init__(
        self,
        grade: int,
        label: str,
        confidence: float,
        probabilities: Dict[str, float],
        model_version: str,
        is_referable: bool
    ):
        self.grade = grade
        self.label = label
        self.confidence = confidence
        self.probabilities = probabilities
        self.model_version = model_version
        self.is_referable = is_referable

class LesionDetectionOutput:
    def __init__(
        self,
        microaneurysms: int,
        hemorrhages: int,
        hard_exudates: int,
        soft_exudates: int,
        lesion_map_path: Optional[str],
        confidence: float,
        detections: List[Dict[str, Any]],
        model_version: str
    ):
        self.microaneurysms = microaneurysms
        self.hemorrhages = hemorrhages
        self.hard_exudates = hard_exudates
        self.soft_exudates = soft_exudates
        self.lesion_map_path = lesion_map_path
        self.confidence = confidence
        self.detections = detections
        self.model_version = model_version

class VesselSegmentationOutput:
    def __init__(
        self,
        vessel_visibility: float,
        mask_path: Optional[str],
        overlay_path: Optional[str],
        model_version: str
    ):
        self.vessel_visibility = vessel_visibility
        self.mask_path = mask_path
        self.overlay_path = overlay_path
        self.model_version = model_version

class DMERiskOutput:
    def __init__(
        self,
        risk: str,
        confidence: float,
        explanation: str,
        model_version: str
    ):
        self.risk = risk
        self.confidence = confidence
        self.explanation = explanation
        self.model_version = model_version

class ExplainabilityOutput:
    def __init__(
        self,
        gradcam_path: str,
        overlay_path: str,
        lesion_map_path: str,
        vessel_map_path: str,
        combined_path: str,
        reasoning_summary: str,
        model_version: str
    ):
        self.gradcam_path = gradcam_path
        self.overlay_path = overlay_path
        self.lesion_map_path = lesion_map_path
        self.vessel_map_path = vessel_map_path
        self.combined_path = combined_path
        self.reasoning_summary = reasoning_summary
        self.model_version = model_version

# --- Base Abstract Classes ---

class BaseDRModel(ABC):
    """
    Abstract Base Class for Diabetic Retinopathy Grading Models (e.g., APTOS 2019).
    """
    @abstractmethod
    def predict(self, image: np.ndarray) -> DRClassificationOutput:
        pass

class BaseLesionModel(ABC):
    """
    Abstract Base Class for Retinal Lesion Detection Models (e.g., IDRiD).
    """
    @abstractmethod
    def detect(self, image: np.ndarray) -> LesionDetectionOutput:
        pass

class BaseVesselModel(ABC):
    """
    Abstract Base Class for Retinal Vessel Segmentation Models (e.g., DRIVE).
    """
    @abstractmethod
    def segment(self, image: np.ndarray) -> VesselSegmentationOutput:
        pass

class BaseDMEModel(ABC):
    """
    Abstract Base Class for Diabetic Macular Edema (DME) Risk Assessment.
    """
    @abstractmethod
    def assess(self, image: np.ndarray, lesions: Optional[LesionDetectionOutput] = None) -> DMERiskOutput:
        pass

class BaseExplainabilityModel(ABC):
    """
    Abstract Base Class for Explainable AI (Grad-CAM, Feature Attribution, Combined Maps).
    """
    @abstractmethod
    def generate_explanation(
        self,
        image: np.ndarray,
        dr_output: DRClassificationOutput,
        lesion_output: LesionDetectionOutput,
        vessel_output: VesselSegmentationOutput,
        output_prefix: str
    ) -> ExplainabilityOutput:
        pass
