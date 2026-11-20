from typing import Optional

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, Field
from sqlalchemy.orm import Session

from ..db import get_db
from ..models import Doctor, User
from ..services.identity import normalize_identifier, validate_identifier

router = APIRouter(prefix="/api/auth", tags=["auth"])


class LoginRequest(BaseModel):
    identifier: str = Field(..., min_length=3, max_length=255)
    name: Optional[str] = Field(default=None, max_length=100)
    role: str = Field(default="user", max_length=20)  # "user" | "doctor"


@router.post("/login")
def login(req: LoginRequest, db: Session = Depends(get_db)):
    raw = req.identifier.strip()
    if not validate_identifier(raw):
        raise HTTPException(
            status_code=400,
            detail={"error": {"code": "INVALID_IDENTIFIER", "message": "Please enter a valid email or phone number."}}
        )

    norm_id, id_type = normalize_identifier(raw)
    display_name = (req.name or "").strip() or ("Dr. " + norm_id.split("@")[0].title() if req.role == "doctor" else norm_id.split("@")[0].title())

    if req.role == "doctor":
        doctor = db.query(Doctor).filter(Doctor.identifier == norm_id).first()
        if not doctor:
            doctor = Doctor(identifier=norm_id, name=display_name)
            db.add(doctor)
            db.commit()
            db.refresh(doctor)
        return {
            "identifier": doctor.identifier,
            "name": doctor.name,
            "role": "doctor",
            "id_type": id_type
        }
    else:
        user = db.query(User).filter(User.identifier == norm_id).first()
        if not user:
            user = User(identifier=norm_id, name=display_name, id_type=id_type)
            db.add(user)
            db.commit()
            db.refresh(user)
        return {
            "identifier": user.identifier,
            "name": user.name,
            "role": "user",
            "id_type": user.id_type
        }
