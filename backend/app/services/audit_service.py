from typing import Optional
from sqlalchemy.orm import Session
from app.models import AuditLog

class AuditService:
    @staticmethod
    def log_event(
        db: Session,
        screening_id: Optional[int],
        user_role: str,
        user_name: str,
        action: str,
        previous_value: Optional[str] = None,
        new_value: Optional[str] = None,
        details: Optional[str] = None
    ) -> AuditLog:
        log_entry = AuditLog(
            screening_id=screening_id,
            user_role=user_role,
            user_name=user_name,
            action=action,
            previous_value=previous_value,
            new_value=new_value,
            details=details
        )
        db.add(log_entry)
        db.commit()
        db.refresh(log_entry)
        return log_entry
