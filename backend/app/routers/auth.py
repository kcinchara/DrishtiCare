from typing import List
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from app.database import get_db
from app.models import User
from app.schemas import LoginRequest, RegisterRequest, Token, UserResponse
from app.utils.security import verify_password, get_password_hash, create_access_token, get_current_user

router = APIRouter(prefix="/auth", tags=["Authentication"])

@router.post("/login", response_model=Token)
def login(creds: LoginRequest, db: Session = Depends(get_db)):
    # Match against either username or email
    user = db.query(User).filter(
        (User.username == creds.username) | (User.email == creds.username)
    ).first()
    if not user or not verify_password(creds.password, user.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect username or password",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    access_token = create_access_token(
        data={"sub": user.username, "role": user.role, "name": user.full_name}
    )
    return {
        "access_token": access_token,
        "token_type": "bearer",
        "user": {
            "id": user.id,
            "username": user.username,
            "role": user.role,
            "full_name": user.full_name,
            "email": user.email,
            "hospital_id": user.hospital_id or "HOSP-001"
        }
    }

@router.post("/register", response_model=Token)
def register(req: RegisterRequest, db: Session = Depends(get_db)):
    existing = db.query(User).filter(
        (User.username == req.username) | (User.email == req.email)
    ).first()
    if existing:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="A user with this username or email ID already exists."
        )
    new_user = User(
        username=req.username,
        email=req.email,
        full_name=req.full_name,
        role=req.role,
        hospital_id=req.hospital_id or "HOSP-001",
        hashed_password=get_password_hash(req.password)
    )
    db.add(new_user)
    db.commit()
    db.refresh(new_user)

    access_token = create_access_token(
        data={"sub": new_user.username, "role": new_user.role, "name": new_user.full_name}
    )
    return {
        "access_token": access_token,
        "token_type": "bearer",
        "user": {
            "id": new_user.id,
            "username": new_user.username,
            "role": new_user.role,
            "full_name": new_user.full_name,
            "email": new_user.email,
            "hospital_id": new_user.hospital_id or "HOSP-001"
        }
    }

@router.post("/logout")
def logout():
    return {"message": "Successfully logged out"}

@router.get("/me", response_model=UserResponse)
def get_me(current_user: User = Depends(get_current_user)):
    return current_user

@router.get("/users", response_model=List[UserResponse])
def list_users(current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    # Restrict user management to ADMIN or DOCTOR viewing assigned staff
    if current_user.role not in ("ADMIN", "DOCTOR"):
        raise HTTPException(status_code=403, detail="Admin or clinical supervisor access required")
    return db.query(User).order_by(User.id.asc()).all()
