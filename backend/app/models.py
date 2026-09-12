import datetime
from sqlalchemy import (
    Column, Integer, String, Float, Boolean, DateTime, ForeignKey, Text, JSON
)
from sqlalchemy.orm import relationship
from app.database import Base

class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    username = Column(String(100), unique=True, index=True, nullable=False)
    hashed_password = Column(String(255), nullable=False)
    role = Column(String(50), nullable=False)  # "HEALTHCARE_WORKER", "DOCTOR", "ADMIN"
    full_name = Column(String(150), nullable=False)
    email = Column(String(150), nullable=True)
    hospital_id = Column(String(100), default="HOSP-001", nullable=True)
    created_at = Column(DateTime, default=datetime.datetime.utcnow)

class Patient(Base):
    __tablename__ = "patients"

    id = Column(Integer, primary_key=True, index=True)
    patient_id = Column(String(50), unique=True, index=True, nullable=False)  # e.g., RET-2026-000123
    owner_user_id = Column(Integer, ForeignKey("users.id"), nullable=True)
    hospital_id = Column(String(100), default="HOSP-001", nullable=True)
    assigned_doctor_id = Column(Integer, ForeignKey("users.id"), nullable=True)
    full_name = Column(String(150), nullable=False)
    age = Column(Integer, nullable=False)
    gender = Column(String(20), nullable=False)  # "Male", "Female", "Other"
    diabetes_duration = Column(String(50), nullable=True)  # e.g. "5 years"
    diabetes_type = Column(String(50), nullable=True)  # "Type 1", "Type 2", "Gestational", "Unknown"
    language = Column(String(50), default="English")
    screening_location = Column(String(150), nullable=True)  # e.g. "PHC Rampur"
    contact_number = Column(String(50), nullable=True)
    previous_dr_history = Column(String(100), nullable=True)
    previous_eye_exam = Column(String(100), nullable=True)
    last_screening_date = Column(String(50), nullable=True)
    blood_glucose = Column(String(50), nullable=True)
    hba1c = Column(String(50), nullable=True)
    treatment_info = Column(Text, nullable=True)
    medical_history = Column(Text, nullable=True)
    current_medications = Column(Text, nullable=True)
    risk_factors = Column(Text, nullable=True)
    created_at = Column(DateTime, default=datetime.datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.datetime.utcnow, onupdate=datetime.datetime.utcnow)

    owner = relationship("User", foreign_keys=[owner_user_id])
    assigned_doctor = relationship("User", foreign_keys=[assigned_doctor_id])
    screenings = relationship("Screening", back_populates="patient", cascade="all, delete-orphan")
    referrals = relationship("Referral", back_populates="patient", cascade="all, delete-orphan")
    comparisons = relationship("ScreeningComparison", back_populates="patient", cascade="all, delete-orphan")

class Screening(Base):
    __tablename__ = "screenings"

    id = Column(Integer, primary_key=True, index=True)
    screening_id = Column(String(50), unique=True, index=True, nullable=False)  # e.g. SCR-2026-000123
    patient_id = Column(Integer, ForeignKey("patients.id"), nullable=False)
    performed_by = Column(Integer, ForeignKey("users.id"), nullable=True)
    doctor_id = Column(Integer, ForeignKey("users.id"), nullable=True)
    hospital_id = Column(String(100), default="HOSP-001", nullable=True)
    status = Column(String(50), default="CREATED")  
    # CREATED -> PATIENT_REGISTERED -> IMAGE_CAPTURED -> QUALITY_CHECKED -> 
    # PREPROCESSED -> AI_ANALYZED -> RESULT_READY -> DOCTOR_REVIEW -> TRIAGED -> REFERRED / FOLLOW_UP / COMPLETED
    eye = Column(String(20), default="Right Eye")  # "Left Eye", "Right Eye"
    image_source = Column(String(50), default="Fundus Camera")  # "Fundus Camera", "Mobile/Portable Camera", "Uploaded Image"
    submission_status = Column(String(50), default="DRAFT")  # "DRAFT", "ANALYZED", "SUBMITTED_TO_DOCTOR", "UNDER_DOCTOR_REVIEW", "REVIEWED"
    doctor_clinical_assessment = Column(Text, nullable=True)
    both_eyes_data = Column(JSON, default=dict)
    notes = Column(Text, nullable=True)
    created_at = Column(DateTime, default=datetime.datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.datetime.utcnow, onupdate=datetime.datetime.utcnow)

    patient = relationship("Patient", back_populates="screenings")
    performer = relationship("User", foreign_keys=[performed_by])
    doctor = relationship("User", foreign_keys=[doctor_id])
    retinal_image = relationship("RetinalImage", back_populates="screening", uselist=False, cascade="all, delete-orphan")
    quality_assessment = relationship("QualityAssessment", back_populates="screening", uselist=False, cascade="all, delete-orphan")
    enhancement = relationship("Enhancement", back_populates="screening", uselist=False, cascade="all, delete-orphan")
    ai_result = relationship("AIResult", back_populates="screening", uselist=False, cascade="all, delete-orphan")
    lesion_result = relationship("LesionResult", back_populates="screening", uselist=False, cascade="all, delete-orphan")
    vessel_result = relationship("VesselResult", back_populates="screening", uselist=False, cascade="all, delete-orphan")
    explanation = relationship("Explanation", back_populates="screening", uselist=False, cascade="all, delete-orphan")
    doctor_review = relationship("DoctorReview", back_populates="screening", uselist=False, cascade="all, delete-orphan")
    triage_result = relationship("TriageResult", back_populates="screening", uselist=False, cascade="all, delete-orphan")
    referral = relationship("Referral", back_populates="screening", uselist=False, cascade="all, delete-orphan")
    report = relationship("Report", back_populates="screening", uselist=False, cascade="all, delete-orphan")
    audit_logs = relationship("AuditLog", back_populates="screening", cascade="all, delete-orphan")
    comparisons_as_current = relationship("ScreeningComparison", foreign_keys="[ScreeningComparison.current_screening_id]", back_populates="current_screening", cascade="all, delete-orphan")
    comparisons_as_previous = relationship("ScreeningComparison", foreign_keys="[ScreeningComparison.previous_screening_id]", back_populates="previous_screening")

class RetinalImage(Base):
    __tablename__ = "retinal_images"

    id = Column(Integer, primary_key=True, index=True)
    screening_id = Column(Integer, ForeignKey("screenings.id"), nullable=False)
    original_path = Column(String(255), nullable=False)
    filename = Column(String(255), nullable=False)
    mime_type = Column(String(50), default="image/jpeg")
    file_size = Column(Integer, default=0)
    width = Column(Integer, default=0)
    height = Column(Integer, default=0)
    is_retinal_confirmed = Column(Boolean, default=True)
    created_at = Column(DateTime, default=datetime.datetime.utcnow)

    screening = relationship("Screening", back_populates="retinal_image")

class QualityAssessment(Base):
    __tablename__ = "quality_assessments"

    id = Column(Integer, primary_key=True, index=True)
    screening_id = Column(Integer, ForeignKey("screenings.id"), nullable=False)
    overall_score = Column(Float, nullable=False)  # e.g., 91.0
    status = Column(String(50), nullable=False)  # "GOOD", "BORDERLINE", "INSUFFICIENT"
    blur_score = Column(Float, default=0.0)
    illumination_score = Column(Float, default=0.0)
    glare_score = Column(Float, default=0.0)
    field_of_view_score = Column(Float, default=0.0)
    vessel_visibility = Column(Float, default=0.0)
    retinal_coverage_score = Column(Float, default=0.0)
    is_suitable_for_ai = Column(Boolean, default=True)
    recommendation = Column(Text, nullable=True)
    reasons = Column(JSON, default=list)
    created_at = Column(DateTime, default=datetime.datetime.utcnow)

    screening = relationship("Screening", back_populates="quality_assessment")

class Enhancement(Base):
    __tablename__ = "enhancements"

    id = Column(Integer, primary_key=True, index=True)
    screening_id = Column(Integer, ForeignKey("screenings.id"), nullable=False)
    enhanced_path = Column(String(255), nullable=False)
    clahe_applied = Column(Boolean, default=True)
    illumination_normalized = Column(Boolean, default=True)
    noise_reduced = Column(Boolean, default=True)
    contrast_enhanced = Column(Boolean, default=True)
    quality_status = Column(String(50), default="Improved")
    metadata_info = Column(JSON, default=dict)
    created_at = Column(DateTime, default=datetime.datetime.utcnow)

    screening = relationship("Screening", back_populates="enhancement")

class AIResult(Base):
    __tablename__ = "ai_results"

    id = Column(Integer, primary_key=True, index=True)
    screening_id = Column(Integer, ForeignKey("screenings.id"), nullable=False)
    dr_grade = Column(Integer, nullable=False)  # 0 to 4
    label = Column(String(50), nullable=False)  # "No DR", "Mild", "Moderate", "Severe", "Proliferative DR"
    confidence = Column(Float, nullable=False)  # e.g., 0.94
    probabilities = Column(JSON, default=dict)
    model_version = Column(String(50), default="Demo DR Classifier v1.0")
    is_demo = Column(Boolean, default=True)
    is_referable = Column(Boolean, default=False)
    dme_risk = Column(String(50), default="Low")  # "Low", "Possible", "High"
    dme_confidence = Column(Float, default=0.0)
    dme_explanation = Column(Text, nullable=True)
    created_at = Column(DateTime, default=datetime.datetime.utcnow)

    screening = relationship("Screening", back_populates="ai_result")

class LesionResult(Base):
    __tablename__ = "lesion_results"

    id = Column(Integer, primary_key=True, index=True)
    screening_id = Column(Integer, ForeignKey("screenings.id"), nullable=False)
    microaneurysms = Column(Integer, default=0)
    hemorrhages = Column(Integer, default=0)
    hard_exudates = Column(Integer, default=0)
    soft_exudates = Column(Integer, default=0)
    lesion_map_path = Column(String(255), nullable=True)
    detections = Column(JSON, default=list)
    confidence = Column(Float, default=0.88)
    model_version = Column(String(50), default="IDRiD Lesion Detector Demo v1.0")
    created_at = Column(DateTime, default=datetime.datetime.utcnow)

    screening = relationship("Screening", back_populates="lesion_result")

class VesselResult(Base):
    __tablename__ = "vessel_results"

    id = Column(Integer, primary_key=True, index=True)
    screening_id = Column(Integer, ForeignKey("screenings.id"), nullable=False)
    vessel_visibility = Column(Float, default=0.91)
    mask_path = Column(String(255), nullable=True)
    overlay_path = Column(String(255), nullable=True)
    model_version = Column(String(50), default="DRIVE Vessel Segmenter Demo v1.0")
    created_at = Column(DateTime, default=datetime.datetime.utcnow)

    screening = relationship("Screening", back_populates="vessel_result")

class Explanation(Base):
    __tablename__ = "explanations"

    id = Column(Integer, primary_key=True, index=True)
    screening_id = Column(Integer, ForeignKey("screenings.id"), nullable=False)
    gradcam_path = Column(String(255), nullable=True)
    overlay_path = Column(String(255), nullable=True)
    combined_path = Column(String(255), nullable=True)
    reasoning_summary = Column(Text, nullable=True)
    model_version = Column(String(50), default="Grad-CAM Explainability Demo v1.0")
    created_at = Column(DateTime, default=datetime.datetime.utcnow)

    screening = relationship("Screening", back_populates="explanation")

class DoctorReview(Base):
    __tablename__ = "doctor_reviews"

    id = Column(Integer, primary_key=True, index=True)
    screening_id = Column(Integer, ForeignKey("screenings.id"), nullable=False)
    doctor_id = Column(Integer, ForeignKey("users.id"), nullable=True)
    doctor_name = Column(String(150), default="Dr. Ophthalmologist")
    decision = Column(String(50), nullable=False)  # "ACCEPTED", "OVERRIDDEN", "RECAPTURE_REQUESTED"
    final_grade = Column(Integer, nullable=True)  # In case of override
    override_reason = Column(String(100), nullable=True)
    doctor_comments = Column(Text, nullable=True)
    instructions_for_hcw = Column(Text, nullable=True)
    created_at = Column(DateTime, default=datetime.datetime.utcnow)

    screening = relationship("Screening", back_populates="doctor_review")

class TriageResult(Base):
    __tablename__ = "triage_results"

    id = Column(Integer, primary_key=True, index=True)
    screening_id = Column(Integer, ForeignKey("screenings.id"), nullable=False)
    risk_category = Column(String(50), nullable=False)  # "LOW", "MEDIUM", "HIGH"
    follow_up_months = Column(Integer, default=12)
    referral_recommended = Column(Boolean, default=False)
    referral_reason = Column(Text, nullable=True)
    priority = Column(String(50), default="ROUTINE")  # "ROUTINE", "URGENT", "EMERGENCY"
    threshold_rules_applied = Column(JSON, default=dict)
    created_at = Column(DateTime, default=datetime.datetime.utcnow)

    screening = relationship("Screening", back_populates="triage_result")

class Referral(Base):
    __tablename__ = "referrals"

    id = Column(Integer, primary_key=True, index=True)
    referral_id = Column(String(50), unique=True, index=True, nullable=False)  # e.g., REF-2026-00124
    screening_id = Column(Integer, ForeignKey("screenings.id"), nullable=False)
    patient_id = Column(Integer, ForeignKey("patients.id"), nullable=False)
    referring_doctor_id = Column(Integer, ForeignKey("users.id"), nullable=True)
    dr_grade = Column(Integer, nullable=False)
    ai_grade = Column(Integer, nullable=True)
    doctor_final_grade = Column(Integer, nullable=True)
    dme_risk = Column(String(50), default="Low")
    reason = Column(Text, nullable=False)
    priority = Column(String(50), default="URGENT")
    recommended_destination = Column(String(200), default="District Eye Hospital")
    hospital_name = Column(String(200), nullable=True)
    place_id = Column(String(100), nullable=True)
    hospital_address = Column(String(300), nullable=True)
    hospital_contact = Column(String(50), nullable=True)
    hospital_distance = Column(String(50), nullable=True)
    directions_url = Column(String(300), nullable=True)
    doctor_comments = Column(Text, nullable=True)
    status = Column(String(50), default="PENDING")  # "PENDING", "ACCEPTED", "ATTENDED"
    referral_status = Column(String(50), default="Recommended")  # "Recommended", "Referred", "Appointment pending", "Completed", "Follow-up required"
    referral_date = Column(DateTime, default=datetime.datetime.utcnow)
    created_at = Column(DateTime, default=datetime.datetime.utcnow)

    screening = relationship("Screening", back_populates="referral")
    patient = relationship("Patient", back_populates="referrals")
    referring_doctor = relationship("User", foreign_keys=[referring_doctor_id])

class Report(Base):
    __tablename__ = "reports"

    id = Column(Integer, primary_key=True, index=True)
    screening_id = Column(Integer, ForeignKey("screenings.id"), nullable=False)
    pdf_path = Column(String(255), nullable=False)
    generated_at = Column(DateTime, default=datetime.datetime.utcnow)

    screening = relationship("Screening", back_populates="report")

class SyncQueue(Base):
    __tablename__ = "sync_queue"

    id = Column(Integer, primary_key=True, index=True)
    record_type = Column(String(50), nullable=False)  # "patient", "screening", "review", etc.
    record_id = Column(String(100), nullable=False)
    action = Column(String(50), default="UPSERT")
    payload = Column(JSON, nullable=False)
    status = Column(String(50), default="SYNCED")  # "PENDING", "SYNCED", "CONFLICT"
    client_timestamp = Column(String(100), nullable=True)
    server_timestamp = Column(DateTime, default=datetime.datetime.utcnow)

class AuditLog(Base):
    __tablename__ = "audit_logs"

    id = Column(Integer, primary_key=True, index=True)
    screening_id = Column(Integer, ForeignKey("screenings.id"), nullable=True)
    user_role = Column(String(50), nullable=False)
    user_name = Column(String(150), nullable=False)
    action = Column(String(150), nullable=False)
    previous_value = Column(String(255), nullable=True)
    new_value = Column(String(255), nullable=True)
    details = Column(Text, nullable=True)
    timestamp = Column(DateTime, default=datetime.datetime.utcnow)

    screening = relationship("Screening", back_populates="audit_logs")
 
class ScreeningComparison(Base):
    __tablename__ = "screening_comparisons"

    id = Column(Integer, primary_key=True, index=True)
    comparison_id = Column(String(50), unique=True, index=True, nullable=False)  # e.g., CMP-2026-00001
    patient_id = Column(Integer, ForeignKey("patients.id"), nullable=False)
    previous_screening_id = Column(Integer, ForeignKey("screenings.id"), nullable=False)
    current_screening_id = Column(Integer, ForeignKey("screenings.id"), nullable=False)
    previous_grade = Column(Integer, nullable=False)  # exact grade 0 to 4
    current_grade = Column(Integer, nullable=False)   # exact grade 0 to 4
    change_status = Column(String(50), nullable=False)  # "IMPROVED", "STABLE", "WORSENED"
    comparison_summary = Column(Text, nullable=True)
    doctor_previous_grade = Column(Integer, nullable=True)
    doctor_current_grade = Column(Integer, nullable=True)
    findings_diff = Column(JSON, default=dict)
    created_at = Column(DateTime, default=datetime.datetime.utcnow)

    patient = relationship("Patient", back_populates="comparisons")
    previous_screening = relationship("Screening", foreign_keys=[previous_screening_id], back_populates="comparisons_as_previous")
    current_screening = relationship("Screening", foreign_keys=[current_screening_id], back_populates="comparisons_as_current")
