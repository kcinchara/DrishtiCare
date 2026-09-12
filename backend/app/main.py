import os
from contextlib import asynccontextmanager
import datetime
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from app.config import settings
from app.database import engine, Base, SessionLocal
from app.models import (
    User, Patient, Screening, RetinalImage, QualityAssessment,
    Enhancement, AIResult, LesionResult, VesselResult, Explanation,
    DoctorReview, TriageResult, Referral, Report, SyncQueue, AuditLog
)
from app.utils.security import get_password_hash
from app.utils.sample_generator import generate_synthetic_fundus
from app.services.state_machine import ScreeningState
from app.routers import (
    auth, patients, screenings, ai, reviews, triage, referrals, reports, sync
)

def init_db():
    # Create all tables immediately
    Base.metadata.create_all(bind=engine)

    # Ensure SQLite migrations for referrals table
    try:
        from sqlalchemy import text
        with engine.connect() as conn:
            cols = [c[1] for c in conn.execute(text("PRAGMA table_info(referrals);")).fetchall()]
            for col, col_type in [
                ("hospital_name", "VARCHAR(200)"),
                ("hospital_address", "VARCHAR(300)"),
                ("hospital_contact", "VARCHAR(50)"),
                ("hospital_distance", "VARCHAR(50)"),
                ("directions_url", "VARCHAR(300)")
            ]:
                if col not in cols:
                    conn.execute(text(f"ALTER TABLE referrals ADD COLUMN {col} {col_type};"))
            conn.commit()
    except Exception as e:
        print(f"Schema check notice: {e}")
    
    db = SessionLocal()
    try:
        # Seed Demo Users if not present
        if not db.query(User).filter(User.username == "demo").first():
            demo_hw = User(
                username="demo",
                hashed_password=get_password_hash("demo123"),
                role="HEALTHCARE_WORKER",
                full_name="Sister Ananya Sharma",
                email="ananya.sharma@phc-rural.in"
            )
            db.add(demo_hw)

        if not db.query(User).filter(User.username == "asha").first():
            demo_asha = User(
                username="asha",
                hashed_password=get_password_hash("asha123"),
                role="HEALTHCARE_WORKER",
                full_name="Asha Devi",
                email="asha.devi@phc-rural.in"
            )
            db.add(demo_asha)

        if not db.query(User).filter(User.username == "doctor").first():
            demo_doc = User(
                username="doctor",
                hashed_password=get_password_hash("doctor123"),
                role="DOCTOR",
                full_name="Dr. Rajesh Varma, MS (Ophthal)",
                email="rajesh.varma@districteye.in"
            )
            db.add(demo_doc)

        if not db.query(User).filter(User.username == "admin").first():
            demo_admin = User(
                username="admin",
                hashed_password=get_password_hash("admin123"),
                role="ADMIN",
                full_name="System Administrator",
                email="admin@retinal-edge-triage.org"
            )
            db.add(demo_admin)
            
        db.commit()

        # Seed Demo Patients & Screenings if empty
        if db.query(Patient).count() == 0:
            demo_cases = [
                {
                    "pid": "RET-2026-000001",
                    "name": "Ramesh Kumar Patel",
                    "age": 54,
                    "gender": "Male",
                    "duration": "4 years",
                    "type": "Type 2",
                    "location": "PHC Rampur, Block A",
                    "contact": "+91 98765 43210",
                    "glucose": "142 mg/dL",
                    "hba1c": "7.1%",
                    "grade": 0,
                    "label": "No DR",
                    "conf": 0.97,
                    "ref": False,
                    "dme": "Low DME Risk",
                    "risk": "LOW"
                },
                {
                    "pid": "RET-2026-000002",
                    "name": "Sunita Devi Verma",
                    "age": 62,
                    "gender": "Female",
                    "duration": "9 years",
                    "type": "Type 2",
                    "location": "PHC Rampur, Block A",
                    "contact": "+91 98765 43211",
                    "glucose": "188 mg/dL",
                    "hba1c": "8.6%",
                    "grade": 2,
                    "label": "Moderate DR",
                    "conf": 0.94,
                    "ref": True,
                    "dme": "Possible DME detected",
                    "risk": "HIGH"
                },
                {
                    "pid": "RET-2026-000003",
                    "name": "Abdul Ghafoor Sheikh",
                    "age": 58,
                    "gender": "Male",
                    "duration": "14 years",
                    "type": "Type 2",
                    "location": "CHC Barabanki",
                    "contact": "+91 98765 43212",
                    "glucose": "230 mg/dL",
                    "hba1c": "9.8%",
                    "grade": 3,
                    "label": "Severe DR",
                    "conf": 0.91,
                    "ref": True,
                    "dme": "Possible DME detected",
                    "risk": "HIGH"
                },
                {
                    "pid": "RET-2026-000004",
                    "name": "Meena Kumari Yadav",
                    "age": 47,
                    "gender": "Female",
                    "duration": "3 years",
                    "type": "Type 2",
                    "location": "PHC Rampur, Block B",
                    "contact": "+91 98765 43213",
                    "glucose": "130 mg/dL",
                    "hba1c": "6.8%",
                    "grade": 1,
                    "label": "Mild DR",
                    "conf": 0.89,
                    "ref": False,
                    "dme": "Low DME Risk",
                    "risk": "LOW"
                }
            ]

            for idx, c in enumerate(demo_cases):
                p = Patient(
                    patient_id=c["pid"],
                    full_name=c["name"],
                    age=c["age"],
                    gender=c["gender"],
                    diabetes_duration=c["duration"],
                    diabetes_type=c["type"],
                    language="Hindi / English",
                    screening_location=c["location"],
                    contact_number=c["contact"],
                    blood_glucose=c["glucose"],
                    hba1c=c["hba1c"],
                    treatment_info="Oral hypoglycemic agent (Metformin 500mg)"
                )
                db.add(p)
                db.commit()
                db.refresh(p)

                # Create Screening
                scr_code = f"SCR-2026-{p.id:06d}"
                scr = Screening(
                    screening_id=scr_code,
                    patient_id=p.id,
                    status=ScreeningState.RESULT_READY if c["grade"] == 0 else ScreeningState.DOCTOR_REVIEW,
                    eye="Right Eye" if idx % 2 == 0 else "Left Eye",
                    image_source="Portable Fundus Camera"
                )
                db.add(scr)
                db.commit()
                db.refresh(scr)

                # Generate synthetic fundus image file
                img_filename = f"{scr_code}_fundus.jpg"
                img_path = generate_synthetic_fundus(grade=c["grade"], filename=img_filename)

                retinal_img = RetinalImage(
                    screening_id=scr.id,
                    original_path=img_path,
                    filename=img_filename,
                    mime_type="image/jpeg",
                    file_size=os.path.getsize(img_path),
                    width=512,
                    height=512,
                    is_retinal_confirmed=True
                )
                db.add(retinal_img)

                # Quality assessment
                qa = QualityAssessment(
                    screening_id=scr.id,
                    overall_score=91.0 if c["grade"] < 3 else 87.5,
                    status="GOOD",
                    blur_score=90.0,
                    illumination_score=92.0,
                    glare_score=94.0,
                    field_of_view_score=93.0,
                    vessel_visibility=91.0,
                    retinal_coverage_score=92.0,
                    recommendation="Image is suitable for AI analysis.",
                    reasons=[]
                )
                db.add(qa)

                # AI Result
                ai_res = AIResult(
                    screening_id=scr.id,
                    dr_grade=c["grade"],
                    label=c["label"],
                    confidence=c["conf"],
                    probabilities={"0": 0.05, "1": 0.10, "2": 0.80, "3": 0.04, "4": 0.01},
                    model_version="Demo DR Classifier (APTOS 2019 Arch) v1.0",
                    is_demo=True,
                    is_referable=c["ref"],
                    dme_risk=c["dme"],
                    dme_confidence=0.84 if "Possible" in c["dme"] else 0.91,
                    dme_explanation="Potential exudative clusters detected" if "Possible" in c["dme"] else "Normal macular architecture"
                )
                db.add(ai_res)

                # Lesions
                les_res = LesionResult(
                    screening_id=scr.id,
                    microaneurysms=8 if c["grade"] >= 2 else (2 if c["grade"] == 1 else 0),
                    hemorrhages=3 if c["grade"] >= 2 else 0,
                    hard_exudates=5 if c["grade"] >= 2 else 0,
                    soft_exudates=1 if c["grade"] >= 3 else 0,
                    lesion_map_path=img_path,
                    confidence=0.88,
                    model_version="IDRiD Lesion Localization Demo v1.0"
                )
                db.add(les_res)

                # Vessels
                ves_res = VesselResult(
                    screening_id=scr.id,
                    vessel_visibility=0.91,
                    mask_path=img_path,
                    overlay_path=img_path,
                    model_version="DRIVE Vessel Segmentation Demo v1.0"
                )
                db.add(ves_res)

                # Triage
                tri = TriageResult(
                    screening_id=scr.id,
                    risk_category=c["risk"],
                    follow_up_months=12 if c["risk"] == "LOW" else 3,
                    referral_recommended=c["ref"],
                    referral_reason=f"Clinical protocol: Grade {c['grade']} ({c['label']}) with {c['dme']}",
                    priority="ROUTINE" if c["risk"] == "LOW" else "URGENT",
                    threshold_rules_applied={"protocol": "SIH-Rural-v2"}
                )
                db.add(tri)

                if c["ref"]:
                    ref = Referral(
                        referral_id=f"REF-2026-{100 + p.id:05d}",
                        screening_id=scr.id,
                        patient_id=p.id,
                        dr_grade=c["grade"],
                        dme_risk=c["dme"],
                        reason=f"Moderate to severe diabetic retinopathy signs detected during rural screening.",
                        priority="URGENT",
                        recommended_destination="District Eye Hospital, Bareilly",
                        doctor_comments="Comprehensive dilated fundus examination and OCT recommended.",
                        status="PENDING"
                    )
                    db.add(ref)

                db.commit()
    finally:
        db.close()

# Eager initialization for immediate availability in tests and servers
init_db()

@asynccontextmanager
async def lifespan(app: FastAPI):
    init_db()
    yield

app = FastAPI(
    title=settings.PROJECT_NAME,
    description="Explainable AI for Diabetic Retinopathy Screening in Rural India (Smart India Hackathon Prototype)",
    version="1.0.0",
    docs_url="/docs",
    redoc_url="/redoc",
    lifespan=lifespan
)

# CORS configuration
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Static files for retinal media and reports
app.mount("/media", StaticFiles(directory=str(settings.MEDIA_DIR)), name="media")

# Include API Routers
app.include_router(auth.router, prefix=settings.API_V1_STR)
app.include_router(patients.router, prefix=settings.API_V1_STR)
app.include_router(screenings.router, prefix=settings.API_V1_STR)
app.include_router(ai.router, prefix=settings.API_V1_STR)
app.include_router(reviews.router, prefix=settings.API_V1_STR)
app.include_router(triage.router, prefix=settings.API_V1_STR)
app.include_router(referrals.router, prefix=settings.API_V1_STR)
app.include_router(reports.router, prefix=settings.API_V1_STR)
app.include_router(sync.router, prefix=settings.API_V1_STR)

@app.get("/")
def root():
    return {
        "project": settings.PROJECT_NAME,
        "subtitle": settings.SUBTITLE,
        "status": "Online",
        "api_docs": "/docs",
        "api_redoc": "/redoc",
        "demo_mode": settings.DEMO_MODE,
        "timestamp": datetime.datetime.now(datetime.timezone.utc).isoformat()
    }

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("app.main:app", host=settings.HOST, port=settings.PORT, reload=False)

