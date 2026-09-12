import os
from pathlib import Path

class Settings:
    PROJECT_NAME: str = "DrishtiCare"
    SUBTITLE: str = "Explainable AI-Assisted Diabetic Retinopathy Screening for Rural Healthcare"
    API_V1_STR: str = "/api"
    SECRET_KEY: str = os.getenv("SECRET_KEY", "sih-retinal-edge-triage-jwt-secret-key-2026")
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60 * 24  # 24 hours
    
    # Database
    DATABASE_URL: str = os.getenv("DATABASE_URL", "sqlite:///./retinal_triage.db")
    
    # Media paths
    BASE_DIR: Path = Path(__file__).resolve().parent.parent
    MEDIA_DIR: Path = BASE_DIR / "media"
    UPLOAD_DIR: Path = MEDIA_DIR / "uploads"
    ENHANCED_DIR: Path = MEDIA_DIR / "enhanced"
    EXPLANATION_DIR: Path = MEDIA_DIR / "explanations"
    REPORT_DIR: Path = MEDIA_DIR / "reports"
    
    # Server Host & Port
    HOST: str = os.getenv("HOST", "0.0.0.0")
    PORT: int = int(os.getenv("PORT", "8000"))
    
    # CORS
    _cors_env = os.getenv("CORS_ORIGINS", "")
    if _cors_env:
        CORS_ORIGINS: list[str] = [origin.strip() for origin in _cors_env.split(",") if origin.strip()]
    else:
        CORS_ORIGINS: list[str] = [
            "http://localhost:5173",
            "http://127.0.0.1:5173",
            "http://localhost:3000",
            "http://127.0.0.1:3000",
            "*"
        ]
    
    DEMO_MODE: bool = os.getenv("DEMO_MODE", "True").lower() in ("true", "1", "yes")

settings = Settings()

# Ensure directories exist
settings.MEDIA_DIR.mkdir(parents=True, exist_ok=True)
settings.UPLOAD_DIR.mkdir(parents=True, exist_ok=True)
settings.ENHANCED_DIR.mkdir(parents=True, exist_ok=True)
settings.EXPLANATION_DIR.mkdir(parents=True, exist_ok=True)
settings.REPORT_DIR.mkdir(parents=True, exist_ok=True)
