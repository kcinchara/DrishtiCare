export type UserRole =
  | 'HEALTHCARE_WORKER'
  | 'DOCTOR'
  | 'ADMIN'
  | 'Doctor'
  | 'ASHA Worker'
  | 'Hospital Worker / Healthcare Worker';

export interface User {
  id: number;
  username: string;
  role: UserRole;
  full_name: string;
  email?: string;
  hospital_id?: string;
}

export interface Patient {
  id: number;
  patient_id: string; // e.g. RET-2026-000123
  owner_user_id?: number;
  hospital_id?: string;
  assigned_doctor_id?: number;
  full_name: string;
  age: number;
  gender: 'Male' | 'Female' | 'Other';
  diabetes_duration?: string;
  diabetes_type?: string;
  language?: string;
  screening_location?: string;
  contact_number?: string;
  previous_dr_history?: string;
  previous_eye_exam?: string;
  last_screening_date?: string;
  blood_glucose?: string;
  hba1c?: string;
  treatment_info?: string;
  medical_history?: string;
  current_medications?: string;
  risk_factors?: string;
  created_at: string;
  updated_at?: string;
}

export type ScreeningStatus =
  | 'CREATED'
  | 'PATIENT_REGISTERED'
  | 'IMAGE_CAPTURED'
  | 'QUALITY_CHECKED'
  | 'PREPROCESSED'
  | 'AI_ANALYZED'
  | 'RESULT_READY'
  | 'DOCTOR_REVIEW'
  | 'TRIAGED'
  | 'REFERRED'
  | 'FOLLOW_UP'
  | 'COMPLETED';

export interface RetinalImage {
  id: number;
  original_path: string;
  filename: string;
  url: string;
  width: number;
  height: number;
  file_size: number;
  is_retinal_confirmed?: boolean;
  created_at?: string;
}

export interface QualityAssessment {
  overall_score: number;
  status: 'GOOD' | 'BORDERLINE' | 'INSUFFICIENT' | 'INVALID_IMAGE';
  blur_score: number;
  illumination_score: number;
  glare_score: number;
  field_of_view_score: number;
  vessel_visibility: number;
  retinal_coverage_score: number;
  recommendation: string;
  reasons: string[];
  is_suitable_for_ai?: boolean;
  is_fundus?: boolean;
}

export interface Enhancement {
  enhanced_path: string;
  url: string;
  clahe_applied: boolean;
  illumination_normalized: boolean;
  noise_reduced: boolean;
  contrast_enhanced: boolean;
  quality_status: string;
  processing_metadata?: Record<string, any>;
}

export interface AIResult {
  dr_grade: number; // 0-4
  label: string;
  confidence: number;
  probabilities: Record<string, number>;
  model_version: string;
  is_demo: boolean;
  is_referable: boolean;
  dme_risk: string;
  dme_confidence: number;
  dme_explanation: string;
  lesion_overlay_url?: string;
  gradcam_url?: string;
}

export interface LesionDetection {
  microaneurysms: number;
  hemorrhages: number;
  hard_exudates: number;
  soft_exudates: number;
  url?: string;
  detections: Array<{
    type: string;
    bbox?: number[];
    center?: number[];
    radius?: number;
    confidence: number;
  }>;
  confidence: number;
}

export interface VesselResult {
  vessel_visibility: number;
  mask_url?: string;
  overlay_url?: string;
}

export interface Explainability {
  gradcam_url?: string;
  overlay_url?: string;
  lesion_map_url?: string;
  vessel_map_url?: string;
  combined_url?: string;
  reasoning_summary?: string;
  model_version?: string;
}

export interface DoctorReview {
  id?: number;
  screening_id?: number;
  doctor_name: string;
  decision: 'ACCEPTED' | 'OVERRIDDEN' | 'RECAPTURE_REQUESTED';
  final_grade?: number;
  override_reason?: string;
  doctor_comments?: string;
  instructions_for_hcw?: string;
  created_at?: string;
}

export interface TriageResult {
  id?: number;
  screening_id?: number;
  risk_category: 'LOW' | 'MEDIUM' | 'HIGH';
  follow_up_months: number;
  referral_recommended: boolean;
  referral_reason?: string;
  priority: 'ROUTINE' | 'URGENT' | 'EMERGENCY';
  threshold_rules_applied?: Record<string, any>;
}

export interface Referral {
  id?: number;
  referral_id: string; // e.g. REF-2026-00124
  screening_id: number;
  patient_id: number;
  referring_doctor_id?: number;
  dr_grade: number;
  ai_grade?: number;
  doctor_final_grade?: number;
  dme_risk: string;
  reason: string;
  priority: 'ROUTINE' | 'URGENT' | 'EMERGENCY';
  recommended_destination: string;
  hospital_name?: string;
  place_id?: string;
  hospital_address?: string;
  hospital_contact?: string;
  hospital_distance?: string;
  directions_url?: string;
  doctor_comments?: string;
  status: 'PENDING' | 'ACCEPTED' | 'ATTENDED';
  referral_status?: 'Recommended' | 'Referred' | 'Appointment pending' | 'Completed' | 'Follow-up required' | string;
  referral_date?: string;
  created_at?: string;
}

export interface EyeCareFacility {
  id: string;
  name: string;
  distance: string;
  distance_km?: number;
  address: string;
  contact: string;
  specialty?: string;
  category?: string;
  min_grade?: number;
  directions_url: string;
  place_id?: string;
  lat?: number;
  lng?: number;
  rating?: number;
  review_count?: number;
  open_now?: boolean;
  hours?: string;
  reason?: string;
}

export interface ScreeningDetail {
  id: number;
  screening_id: string;
  patient_id: number;
  status: ScreeningStatus;
  submission_status?: 'DRAFT' | 'ANALYZED' | 'SUBMITTED_TO_DOCTOR' | 'UNDER_DOCTOR_REVIEW' | 'REVIEWED' | 'RECAPTURE_REQUESTED' | string;
  doctor_clinical_assessment?: string;
  both_eyes_data?: Record<string, any>;
  eye: 'Left Eye' | 'Right Eye' | 'Both Eyes';
  image_source: string;
  notes?: string;
  created_at: string;
  patient: Patient;
  retinal_image?: RetinalImage;
  quality_assessment?: QualityAssessment;
  enhancement?: Enhancement;
  ai_result?: AIResult;
  lesion_result?: LesionDetection;
  vessel_result?: VesselResult;
  explanation?: Explainability;
  doctor_review?: DoctorReview;
  triage_result?: TriageResult;
  referral?: Referral;
  report?: {
    pdf_url: string;
    generated_at: string;
  };
}

export interface ScreeningListItem {
  id: number;
  screening_id: string;
  patient_id: number;
  patient_code: string;
  patient_name: string;
  date: string;
  eye: string;
  status: string;
  dr_grade: string;
  dr_label: string;
  dme_risk: string;
  referable: boolean;
  doctor_decision: string;
  triage_risk: 'LOW' | 'MEDIUM' | 'HIGH';
  referral_id?: string;
}

export interface ReliabilityPanelData {
  image_quality_score: number;
  image_quality_status: string;
  ai_confidence: number;
  lesion_evidence: 'Minimal' | 'Moderate' | 'Strong';
  vessel_visibility_score: number;
  overall_ai_status: string;
  status_color: 'green' | 'amber' | 'yellow' | 'red';
  recommended_action: string;
  why_referred_rationale: string;
}

export interface SyncQueueItem {
  id?: number;
  record_type: 'patient' | 'screening' | 'review' | 'triage' | 'referral';
  record_id: string;
  action: 'UPSERT' | 'DELETE';
  payload: any;
  client_timestamp: string;
  status: 'PENDING' | 'SYNCED' | 'CONFLICT';
}

export interface ScreeningComparisonItem {
  id: number;
  screening_id: string;
  date: string;
  dr_grade: number;
  ai_grade?: number;
  doctor_grade?: number;
  dr_label: string;
  findings?: Record<string, any>;
  image_url?: string;
}

export interface ScreeningComparison {
  has_previous: boolean;
  message?: string;
  comparison_id?: string;
  patient_id?: string;
  patient_name?: string;
  previous_screening?: ScreeningComparisonItem;
  current_screening?: ScreeningComparisonItem;
  previous_grade?: number;
  current_grade?: number;
  change_status?: 'IMPROVED' | 'STABLE' | 'WORSENED';
  comparison_summary?: string;
  recommendation?: string;
  findings_diff?: Record<string, any>;
  created_at?: string;
}

export interface PatientHistoryTimelineItem {
  id: number;
  screening_id: string;
  date: string;
  eye: string;
  dr_grade: number;
  dr_label: string;
  confidence: number;
  is_referable: boolean;
  dme_risk: string;
  doctor_decision: string;
  doctor_final_grade?: number;
  doctor_comments?: string;
  triage_risk: string;
  referral_id?: string;
  image_url?: string;
  change_status?: 'IMPROVED' | 'STABLE' | 'WORSENED';
  previous_grade?: number;
}

export interface PatientHistoryResponse {
  patient: Patient;
  screenings: PatientHistoryTimelineItem[];
  total_screenings: number;
  latest_screening?: PatientHistoryTimelineItem;
  overall_trajectory?: 'IMPROVED' | 'STABLE' | 'WORSENED';
}

export interface HomeCareGuidance {
  grade: number;
  message: string;
  habits: string[];
  disclaimer: string;
}

