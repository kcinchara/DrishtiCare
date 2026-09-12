from typing import Set, Dict
from fastapi import HTTPException, status

class ScreeningState:
    CREATED = "CREATED"
    PATIENT_REGISTERED = "PATIENT_REGISTERED"
    IMAGE_CAPTURED = "IMAGE_CAPTURED"
    QUALITY_CHECKED = "QUALITY_CHECKED"
    PREPROCESSED = "PREPROCESSED"
    AI_ANALYZED = "AI_ANALYZED"
    RESULT_READY = "RESULT_READY"
    DOCTOR_REVIEW = "DOCTOR_REVIEW"
    TRIAGED = "TRIAGED"
    REFERRED = "REFERRED"
    FOLLOW_UP = "FOLLOW_UP"
    COMPLETED = "COMPLETED"

VALID_TRANSITIONS: Dict[str, Set[str]] = {
    ScreeningState.CREATED: {ScreeningState.PATIENT_REGISTERED, ScreeningState.IMAGE_CAPTURED},
    ScreeningState.PATIENT_REGISTERED: {ScreeningState.IMAGE_CAPTURED},
    ScreeningState.IMAGE_CAPTURED: {ScreeningState.QUALITY_CHECKED, ScreeningState.IMAGE_CAPTURED},
    ScreeningState.QUALITY_CHECKED: {ScreeningState.PREPROCESSED, ScreeningState.IMAGE_CAPTURED, ScreeningState.AI_ANALYZED},
    ScreeningState.PREPROCESSED: {ScreeningState.AI_ANALYZED, ScreeningState.IMAGE_CAPTURED},
    ScreeningState.AI_ANALYZED: {ScreeningState.RESULT_READY},
    ScreeningState.RESULT_READY: {ScreeningState.DOCTOR_REVIEW, ScreeningState.TRIAGED},
    ScreeningState.DOCTOR_REVIEW: {ScreeningState.TRIAGED, ScreeningState.IMAGE_CAPTURED, ScreeningState.RESULT_READY},
    ScreeningState.TRIAGED: {ScreeningState.REFERRED, ScreeningState.FOLLOW_UP, ScreeningState.COMPLETED, ScreeningState.DOCTOR_REVIEW},
    ScreeningState.REFERRED: {ScreeningState.COMPLETED},
    ScreeningState.FOLLOW_UP: {ScreeningState.COMPLETED},
    ScreeningState.COMPLETED: set(),
}

class ScreeningStateMachine:
    @staticmethod
    def validate_transition(current_state: str, new_state: str) -> bool:
        if current_state == new_state:
            return True
        allowed = VALID_TRANSITIONS.get(current_state, set())
        if new_state not in allowed:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Invalid screening state transition from '{current_state}' to '{new_state}'. Allowed transitions: {list(allowed)}"
            )
        return True
