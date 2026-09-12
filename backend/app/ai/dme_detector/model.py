import numpy as np
from typing import Optional
from app.ai.base import BaseDMEModel, DMERiskOutput, LesionDetectionOutput

class DemoDMEModel(BaseDMEModel):
    """
    Demo implementation of Diabetic Macular Edema (DME) Risk Assessment.
    Evaluates the presence and spatial clustering of hard exudates relative to the macula.
    Note: Prototype clinical decision support — does not constitute definitive OCT-based diagnosis.
    """
    def __init__(self):
        self.model_version = "DME Risk Assessment Demo v1.0"

    def assess(self, image: np.ndarray, lesions: Optional[LesionDetectionOutput] = None) -> DMERiskOutput:
        hard_exudates_count = lesions.hard_exudates if lesions else 0
        
        if hard_exudates_count >= 5:
            risk = "Possible DME detected"
            confidence = 0.84
            explanation = "Multiple hard exudates identified within parafoveal region, indicating potential macular edema risk."
        elif hard_exudates_count >= 2:
            risk = "Possible DME detected"
            confidence = 0.72
            explanation = "Mild exudative clustering noted near temporal arcade. Clinical macular assessment recommended."
        else:
            risk = "Low DME Risk"
            confidence = 0.91
            explanation = "No significant hard exudates observed within 1 disc diameter of macula."

        return DMERiskOutput(
            risk=risk,
            confidence=confidence,
            explanation=explanation,
            model_version=self.model_version
        )
