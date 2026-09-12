import cv2
import numpy as np
from typing import Dict, Any
from app.ai.quality.service import ImageQualityAssessmentService
from app.ai.preprocessing.service import ImageEnhancementService
from app.ai.dr_classifier.model import DemoDRModel
from app.ai.lesion_detector.model import DemoLesionModel
from app.ai.vessel_segmenter.model import DemoVesselModel
from app.ai.dme_detector.model import DemoDMEModel
from app.ai.explainability.service import DemoExplainabilityModel

class AIOrchestrator:
    """
    Unified AI Pipeline Orchestrator for Retinal Edge Triage.
    Executes stages in sequence:
      1. Image Quality Gate
      2. Vessel Analysis (DRIVE)
      3. Lesion Detection (IDRiD)
      4. DR Classification (APTOS 2019)
      5. DME Risk Assessment
      6. Grad-CAM & Explainability Engine
      7. Screening Reliability Synthesizer
    """
    def __init__(self):
        self.quality_service = ImageQualityAssessmentService()
        self.enhancement_service = ImageEnhancementService()
        self.dr_model = DemoDRModel()
        self.lesion_model = DemoLesionModel()
        self.vessel_model = DemoVesselModel()
        self.dme_model = DemoDMEModel()
        self.explainability_model = DemoExplainabilityModel()

    def run_full_pipeline(self, image_path: str, screening_id: str, accuracy_mode: str = "enhanced") -> Dict[str, Any]:
        # Load image
        img = cv2.imread(image_path)
        if img is None:
            raise ValueError(f"Unable to read retinal image at {image_path}")

        # 1. Fundus Validation & Quality Gate
        quality_res = self.quality_service.assess_quality(image_path)
        if quality_res.get("status") == "INVALID_IMAGE" or not quality_res.get("is_fundus", True):
            raise ValueError("This image does not appear to be a retinal fundus photograph. Please upload a valid fundus image.")
        if quality_res.get("status") == "INSUFFICIENT" or not quality_res.get("is_suitable_for_ai", True):
            raise ValueError("Image quality is insufficient for reliable analysis. Please upload a clearer fundus image.")
        
        # 2. Vessel Segmentation (DRIVE)
        vessel_res = self.vessel_model.segment(img, output_prefix=f"{screening_id}_vessel")
        
        # 3. Lesion Detection (IDRiD)
        lesion_res = self.lesion_model.detect(img, output_prefix=f"{screening_id}_lesion")
        
        # 4. Pure DR Classification (ResNet-18 Deep Classifier without heuristic prior boosts)
        dr_res = self.dr_model.predict(
            img,
            lesions=lesion_res,
            vessels=vessel_res,
            accuracy_mode=accuracy_mode,
            image_name=f"{screening_id}.jpg"
        )
        
        # 5. DME Risk
        dme_res = self.dme_model.assess(img, lesions=lesion_res)
        
        # 6. Explainability (Grad-CAM & Combined)
        xai_res = self.explainability_model.generate_explanation(
            image=img,
            dr_output=dr_res,
            lesion_output=lesion_res,
            vessel_output=vessel_res,
            output_prefix=f"{screening_id}_xai"
        )
        
        # 7. Screening Reliability Panel Calculation
        # Quality score (e.g. 91%), AI Confidence (e.g. 94%), Lesion Evidence, Vessel Visibility
        is_reliable = (
            quality_res["overall_score"] >= 70.0 and
            dr_res.confidence >= 0.70 and
            vessel_res.vessel_visibility >= 0.60
        )
        
        if quality_res["overall_score"] < 60.0 or quality_res.get("status") == "INSUFFICIENT":
            overall_status = "Image Quality: Poor"
            status_color = "rose"
            recommendation_action = "Result: Repeat fundus image"
        elif dr_res.confidence < 0.50:
            overall_status = "Low Confidence AI Result"
            status_color = "yellow"
            recommendation_action = "Low-confidence AI screening result — clinical review recommended."
        elif is_reliable:
            overall_status = "Suitable for Review"
            status_color = "green"
            recommendation_action = "Proceed to ophthalmologist review"
        else:
            overall_status = "Review with Caution"
            status_color = "yellow"
            recommendation_action = "Ophthalmologist secondary adjudication strongly advised"

        total_lesions = lesion_res.microaneurysms + lesion_res.hemorrhages + lesion_res.hard_exudates + lesion_res.soft_exudates
        lesion_strength = "Strong" if total_lesions >= 10 else ("Moderate" if total_lesions >= 4 else "Minimal")

        reliability_panel = {
            "image_quality_score": quality_res["overall_score"],
            "image_quality_status": quality_res["status"],
            "ai_confidence": round(dr_res.confidence * 100, 1),
            "lesion_evidence": lesion_strength,
            "vessel_visibility_score": round(vessel_res.vessel_visibility * 100, 1),
            "overall_ai_status": overall_status,
            "status_color": status_color,
            "recommended_action": recommendation_action,
            "why_referred_rationale": (
                f"Grade {dr_res.grade} ({dr_res.label}) + {dme_res.risk} + {total_lesions} detected microvascular lesions "
                f"with {round(dr_res.confidence * 100, 1)}% AI confidence triggers clinical referral protocol."
                if dr_res.is_referable else "Routine non-referable findings. Re-screening recommended in 12 months."
            )
        }

        return {
            "quality": quality_res,
            "dr_classification": {
                "grade": dr_res.grade,
                "label": dr_res.label,
                "confidence": dr_res.confidence,
                "probabilities": dr_res.probabilities,
                "model_version": dr_res.model_version,
                "is_referable": dr_res.is_referable,
                "image_quality": "Poor" if quality_res["overall_score"] < 60.0 else "Good",
                "quality_result": "Repeat fundus image" if quality_res["overall_score"] < 60.0 else "Acceptable"
            },
            "vessels": {
                "vessel_visibility": vessel_res.vessel_visibility,
                "mask_path": vessel_res.mask_path,
                "overlay_path": vessel_res.overlay_path,
                "model_version": vessel_res.model_version
            },
            "lesions": {
                "microaneurysms": lesion_res.microaneurysms,
                "hemorrhages": lesion_res.hemorrhages,
                "hard_exudates": lesion_res.hard_exudates,
                "soft_exudates": lesion_res.soft_exudates,
                "lesion_map_path": lesion_res.lesion_map_path,
                "confidence": lesion_res.confidence,
                "detections": lesion_res.detections,
                "model_version": lesion_res.model_version
            },
            "dme_risk": {
                "risk": dme_res.risk,
                "confidence": dme_res.confidence,
                "explanation": dme_res.explanation,
                "model_version": dme_res.model_version
            },
            "explainability": {
                "gradcam_path": xai_res.gradcam_path,
                "overlay_path": xai_res.overlay_path,
                "lesion_map_path": xai_res.lesion_map_path,
                "vessel_map_path": xai_res.vessel_map_path,
                "combined_path": xai_res.combined_path,
                "reasoning_summary": xai_res.reasoning_summary,
                "model_version": xai_res.model_version
            },
            "reliability": reliability_panel
        }

orchestrator = AIOrchestrator()
