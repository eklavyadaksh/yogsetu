import json
from datetime import datetime

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session

from ..db import get_db
from ..models import Assignment, Doctor, SessionRecord, User
from ..schemas import SessionLogRequest
from ..services.identity import normalize_identifier

router = APIRouter(prefix="/api", tags=["patient"])


@router.get("/assignments")
def get_patient_assignments(
    identifier: str = Query(...),
    db: Session = Depends(get_db)
):
    norm_id, _ = normalize_identifier(identifier)
    assignments = (
        db.query(Assignment)
        .filter(
            Assignment.patient_identifier == norm_id,
            Assignment.status == "active"
        )
        .order_by(Assignment.id.desc())
        .all()
    )

    result = []
    today = datetime.now().date()
    for assign in assignments:
        doctor = db.query(Doctor).filter(Doctor.identifier == assign.doctor_identifier).first()
        doctor_name = doctor.name if doctor else "Doctor"

        try:
            plan_obj = json.loads(assign.plan_json)
        except Exception:
            plan_obj = {"plan": []}

        # Calculate weeks left
        try:
            start_d = datetime.strptime(assign.start_date, "%Y-%m-%d").date()
            days_passed = (today - start_d).days
            days_total = assign.weeks * 7
            days_left = max(0, days_total - days_passed)
            weeks_left = max(1, (days_left + 6) // 7)
        except Exception:
            weeks_left = assign.weeks

        result.append({
            "id": assign.id,
            "patient_identifier": assign.patient_identifier,
            "doctor_identifier": assign.doctor_identifier,
            "doctor_name": doctor_name,
            "start_date": assign.start_date,
            "weeks": assign.weeks,
            "weeks_left": weeks_left,
            "status": assign.status,
            "plan": plan_obj
        })

    return result


@router.post("/session")
def log_session(
    req: SessionLogRequest,
    db: Session = Depends(get_db)
):
    norm_id, id_type = normalize_identifier(req.patient_identifier)

    # Ensure user exists
    user = db.query(User).filter(User.identifier == norm_id).first()
    if not user:
        user = User(identifier=norm_id, name=norm_id.split("@")[0].title(), id_type=id_type)
        db.add(user)
        db.commit()

    # Valid status check
    status = req.status.lower()
    if status not in ["done", "skipped", "pain"]:
        raise HTTPException(
            status_code=400,
            detail={"error": {"code": "INVALID_STATUS", "message": "Status must be 'done', 'skipped', or 'pain'."}}
        )

    # Valid source check
    source = req.source.lower()
    if source not in ["doctor", "self"]:
        source = "self"

    session_rec = SessionRecord(
        patient_identifier=norm_id,
        assignment_id=req.assignment_id,
        date=req.date or datetime.now().strftime("%Y-%m-%d"),
        pose_id=req.pose_id,
        status=status,
        best_angle=req.best_angle,
        hold_seconds=req.hold_seconds,
        note=req.note,
        source=source
    )
    db.add(session_rec)
    db.commit()
    db.refresh(session_rec)

    return {
        "success": True,
        "session_id": session_rec.id,
        "message": "Session recorded successfully."
    }
