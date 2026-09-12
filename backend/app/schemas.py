import datetime
from typing import Optional, List, Dict, Any
from pydantic import BaseModel, Field, ConfigDict

# --- Auth ---
class Token(BaseModel):
    access_token: str
    token_type: str
    user: Dict[str, Any]

class TokenData(BaseModel):
    username: Optional[str] = None
    role: Optional[str] = None

class LoginRequest(BaseModel):
    username: str
    password: str

class RegisterRequest(BaseModel):
    full_name: str
    email: str
    username: str
    password: str
    role: str
    hospital_id: Optional[str] = "HOSP-001"

class UserResponse(BaseModel):
    id: int
    username: str
    role: str
    full_name: str
    email: Optional[str] = None
    hospital_id: Optional[str] = "HOSP-001"

    model_config = ConfigDict(from_attributes=True)

# --- Patient ---
class PatientBase(BaseModel):
    patient_id: Optional[str] = None
    owner_user_id: Optional[int] = None
    hospital_id: Optional[str] = "HOSP-001"
    assigned_doctor_id: Optional[int] = None
    full_name: str
    age: int
    gender: str
    diabetes_duration: Optional[str] = None
    diabetes_type: Optional[str] = "Type 2"
    language: Optional[str] = "English"
    screening_location: Optional[str] = "Primary Health Centre"
    contact_number: Optional[str] = None
    previous_dr_history: Optional[str] = "None"
    previous_eye_exam: Optional[str] = "Never"
    last_screening_date: Optional[str] = None
    blood_glucose: Optional[str] = None
    hba1c: Optional[str] = None
    treatment_info: Optional[str] = None
    medical_history: Optional[str] = None
    current_medications: Optional[str] = None
    risk_factors: Optional[str] = None

class PatientCreate(PatientBase):
    pass

class PatientUpdate(BaseModel):
    full_name: Optional[str] = None
    age: Optional[int] = None
    gender: Optional[str] = None
    contact_number: Optional[str] = None
    blood_glucose: Optional[str] = None
    hba1c: Optional[str] = None
    treatment_info: Optional[str] = None
    medical_history: Optional[str] = None
    current_medications: Optional[str] = None
    risk_factors: Optional[str] = None
    assigned_doctor_id: Optional[int] = None

class PatientResponse(PatientBase):
    id: int
    created_at: datetime.datetime
    updated_at: Optional[datetime.datetime] = None

    model_config = ConfigDict(from_attributes=True)

# --- Screening ---
class ScreeningCreate(BaseModel):
    patient_id: int
    performed_by: Optional[int] = None
    doctor_id: Optional[int] = None
    hospital_id: Optional[str] = "HOSP-001"
    eye: Optional[str] = "Right Eye"
    image_source: Optional[str] = "Fundus Camera"
    notes: Optional[str] = None

class ScreeningUpdate(BaseModel):
    status: Optional[str] = None
    eye: Optional[str] = None
    image_source: Optional[str] = None
    notes: Optional[str] = None

class RetinalImageResponse(BaseModel):
    id: int
    original_path: str
    filename: str
    mime_type: str
    file_size: int
    width: int
    height: int
    is_retinal_confirmed: bool
    created_at: datetime.datetime

    model_config = ConfigDict(from_attributes=True)

# --- Image Quality ---
class ImageQualityRequest(BaseModel):
    screening_id: int

class ImageQualityResponse(BaseModel):
    overall_score: float
    status: str  # GOOD, BORDERLINE, INSUFFICIENT
    blur_score: float
    illumination_score: float
    glare_score: float
    field_of_view_score: float
    vessel_visibility: float
    retinal_coverage_score: float
    recommendation: str
    reasons: List[str]
    is_suitable_for_ai: bool
    is_fundus: Optional[bool] = True

# --- Enhancement ---
class EnhancementRequest(BaseModel):
    screening_id: int

class EnhancementResponse(BaseModel):
    enhanced_image_url: str
    original_image_url: str
    clahe_applied: bool
    illumination_normalized: bool
    noise_reduced: bool
    contrast_enhanced: bool
    quality_status: str
    processing_metadata: Dict[str, Any]

# --- AI Models ---
class DRClassificationRequest(BaseModel):
    screening_id: int

class DRClassificationResponse(BaseModel):
    grade: int  # 0 to 4
    prediction: Optional[int] = None
    label: str  # No DR, Mild, Moderate, Severe, Proliferative DR
    confidence: float
    probabilities: Dict[str, float]
    model_version: str
    is_referable: bool
    image_quality: Optional[str] = "Good"
    quality_result: Optional[str] = None

class VesselSegmentationRequest(BaseModel):
    screening_id: int

class VesselSegmentationResponse(BaseModel):
    vessel_visibility: float
    mask_url: str
    overlay_url: str
    model_version: str

class LesionDetectionRequest(BaseModel):
    screening_id: int

class LesionDetectionResponse(BaseModel):
    microaneurysms: int
    hemorrhages: int
    hard_exudates: int
    soft_exudates: int
    lesion_map_url: str
    confidence: float
    detections: List[Dict[str, Any]]
    model_version: str

class DMERiskRequest(BaseModel):
    screening_id: int

class DMERiskResponse(BaseModel):
    risk: str  # Low, Possible, High
    confidence: float
    explanation: str
    model_version: str

class ExplainabilityRequest(BaseModel):
    screening_id: int

class ExplainabilityResponse(BaseModel):
    gradcam_url: str
    overlay_url: str
    lesion_map_url: str
    vessel_map_url: str
    combined_url: str
    reasoning_summary: str
    model_version: str

class PipelineAnalysisRequest(BaseModel):
    screening_id: int
    accuracy_mode: Optional[str] = "enhanced"

class PipelineAnalysisResponse(BaseModel):
    screening_id: str
    quality: ImageQualityResponse
    dr_classification: DRClassificationResponse
    dme_risk: DMERiskResponse
    lesions: LesionDetectionResponse
    vessels: VesselSegmentationResponse
    explainability: ExplainabilityResponse
    reliability: Dict[str, Any]
    status: str

# --- Doctor Review ---
class DoctorReviewCreate(BaseModel):
    screening_id: int
    decision: str  # ACCEPTED, OVERRIDDEN, RECAPTURE_REQUESTED
    final_grade: Optional[int] = None
    override_reason: Optional[str] = None
    doctor_comments: Optional[str] = None
    instructions_for_hcw: Optional[str] = None

class DoctorReviewResponse(BaseModel):
    id: int
    screening_id: int
    doctor_name: str
    decision: str
    final_grade: Optional[int] = None
    override_reason: Optional[str] = None
    doctor_comments: Optional[str] = None
    instructions_for_hcw: Optional[str] = None
    created_at: datetime.datetime

    model_config = ConfigDict(from_attributes=True)

# --- Triage ---
class TriageCreate(BaseModel):
    screening_id: int
    risk_category: Optional[str] = None
    follow_up_months: Optional[int] = None
    referral_recommended: Optional[bool] = None
    referral_reason: Optional[str] = None
    priority: Optional[str] = None

class TriageResponse(BaseModel):
    id: int
    screening_id: int
    risk_category: str
    follow_up_months: int
    referral_recommended: bool
    referral_reason: Optional[str] = None
    priority: str
    threshold_rules_applied: Dict[str, Any]
    created_at: datetime.datetime

    model_config = ConfigDict(from_attributes=True)

# --- Referral ---
class ReferralCreate(BaseModel):
    screening_id: int
    patient_id: int
    referring_doctor_id: Optional[int] = None
    dr_grade: int
    ai_grade: Optional[int] = None
    doctor_final_grade: Optional[int] = None
    dme_risk: Optional[str] = "Low"
    reason: str
    priority: Optional[str] = "URGENT"
    recommended_destination: Optional[str] = "District Eye Hospital"
    hospital_name: Optional[str] = None
    place_id: Optional[str] = None
    hospital_address: Optional[str] = None
    hospital_contact: Optional[str] = None
    hospital_distance: Optional[str] = None
    directions_url: Optional[str] = None
    doctor_comments: Optional[str] = None
    referral_status: Optional[str] = "Recommended"

class ReferralResponse(BaseModel):
    id: int
    referral_id: str
    screening_id: int
    patient_id: int
    referring_doctor_id: Optional[int] = None
    dr_grade: int
    ai_grade: Optional[int] = None
    doctor_final_grade: Optional[int] = None
    dme_risk: str
    reason: str
    priority: str
    recommended_destination: str
    hospital_name: Optional[str] = None
    place_id: Optional[str] = None
    hospital_address: Optional[str] = None
    hospital_contact: Optional[str] = None
    hospital_distance: Optional[str] = None
    directions_url: Optional[str] = None
    doctor_comments: Optional[str] = None
    status: str
    referral_status: Optional[str] = "Recommended"
    referral_date: Optional[datetime.datetime] = None
    created_at: datetime.datetime

    model_config = ConfigDict(from_attributes=True)

# --- Report ---
class ReportResponse(BaseModel):
    id: int
    screening_id: int
    pdf_url: str
    generated_at: datetime.datetime

# --- Complete Screening Response ---
class ScreeningDetailResponse(BaseModel):
    id: int
    screening_id: str
    patient_id: int
    status: str
    eye: str
    image_source: str
    notes: Optional[str] = None
    created_at: datetime.datetime
    updated_at: Optional[datetime.datetime] = None
    patient: PatientResponse
    retinal_image: Optional[RetinalImageResponse] = None
    quality_assessment: Optional[Dict[str, Any]] = None
    enhancement: Optional[Dict[str, Any]] = None
    ai_result: Optional[Dict[str, Any]] = None
    lesion_result: Optional[Dict[str, Any]] = None
    vessel_result: Optional[Dict[str, Any]] = None
    explanation: Optional[Dict[str, Any]] = None
    doctor_review: Optional[DoctorReviewResponse] = None
    triage_result: Optional[TriageResponse] = None
    referral: Optional[ReferralResponse] = None
    report: Optional[Dict[str, Any]] = None

    model_config = ConfigDict(from_attributes=True)

# --- Screening Comparison ---
class ScreeningComparisonResponse(BaseModel):
    id: Optional[int] = None
    comparison_id: str
    patient_id: int
    previous_screening_id: int
    current_screening_id: int
    previous_grade: int  # 0 to 4
    current_grade: int   # 0 to 4
    change_status: str   # "IMPROVED", "STABLE", "WORSENED"
    comparison_summary: Optional[str] = None
    doctor_previous_grade: Optional[int] = None
    doctor_current_grade: Optional[int] = None
    findings_diff: Optional[Dict[str, Any]] = None
    previous_screening_date: Optional[str] = None
    current_screening_date: Optional[str] = None
    previous_image_url: Optional[str] = None
    current_image_url: Optional[str] = None
    created_at: Optional[datetime.datetime] = None

    model_config = ConfigDict(from_attributes=True)

# --- Longitudinal Patient History ---
class PatientHistoryTimelineItem(BaseModel):
    id: int
    screening_id: str
    date: str
    eye: str
    dr_grade: int
    dr_label: str
    confidence: float
    is_referable: bool
    dme_risk: str
    doctor_decision: str
    doctor_final_grade: Optional[int] = None
    doctor_comments: Optional[str] = None
    triage_risk: str
    referral_id: Optional[str] = None
    image_url: Optional[str] = None
    change_status: Optional[str] = None  # IMPROVED, STABLE, WORSENED relative to previous
    previous_grade: Optional[int] = None

class PatientHistoryResponse(BaseModel):
    patient: PatientResponse
    screenings: List[PatientHistoryTimelineItem]
    total_screenings: int
    latest_screening: Optional[PatientHistoryTimelineItem] = None
    overall_trajectory: Optional[str] = "STABLE"

# --- Sync ---
class SyncItem(BaseModel):
    record_type: str  # patient, screening, review, etc.
    record_id: str
    action: str = "UPSERT"
    payload: Dict[str, Any]
    client_timestamp: str

class SyncPushRequest(BaseModel):
    items: List[SyncItem]

class SyncPushResponse(BaseModel):
    synced_count: int
    failed_count: int
    conflicts: List[Dict[str, Any]] = []
    message: str

class SyncPullResponse(BaseModel):
    patients: List[Dict[str, Any]]
    screenings: List[Dict[str, Any]]
    reviews: List[Dict[str, Any]]
    referrals: List[Dict[str, Any]]
    server_timestamp: str

class SyncStatusResponse(BaseModel):
    total_records: int
    pending_records: int
    last_sync: Optional[str] = None
    status: str

# --- Audit & Model Evaluation ---
class AuditLogResponse(BaseModel):
    id: int
    screening_id: Optional[int] = None
    user_role: str
    user_name: str
    action: str
    previous_value: Optional[str] = None
    new_value: Optional[str] = None
    timestamp: datetime.datetime

    model_config = ConfigDict(from_attributes=True)

class ModelEvaluationResponse(BaseModel):
    dataset: str
    sample_count: int
    sensitivity: float
    specificity: float
    accuracy: float
    precision: float
    f1_score: float
    roc_auc: float
    quadratic_weighted_kappa: Optional[float] = None
    referable_sensitivity: float
    referable_specificity: float
    confusion_matrix: Dict[str, Any]
    per_class_metrics: Dict[str, Any]
    enhanced_ensemble: Optional[Dict[str, Any]] = None

# --- Retinal Stitching & Clinical Attachments ---
class StitchRequest(BaseModel):
    screening_id: int
    sample_field_grade: Optional[int] = 2

class StitchResponse(BaseModel):
    stitched_path: str
    stitched_url: str
    method: str
    keypoints_field1: int
    keypoints_field2: int
    matches_aligned: int
    field1_label: str
    field2_label: str
    mosaic_width: int
    mosaic_height: int
    diagnostic_advantage: str

class AttachmentItem(BaseModel):
    id: str
    name: str
    category: str
    file_type: str
    size_kb: float
    uploaded_at: str
    preview_url: Optional[str] = None
    notes: Optional[str] = None
