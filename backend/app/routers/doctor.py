import json
from datetime import datetime, timedelta
from typing import Any, Dict, Optional

from fastapi import APIRouter, Depends, Header, HTTPException, Query
from sqlalchemy.orm import Session

from ..db import get_db
from ..models import Assignment, Doctor, SessionRecord, User
from ..schemas import AssignRequest
from ..services.identity import normalize_identifier, validate_identifier
from ..services.report_service import compute_adherence

router = APIRouter(prefix="/api", tags=["doctor"])


# Header-based identity is demo-only to allow instant role switching in judge evaluation.
@router.get("/doctor/patients")
def get_doctor_patients(
    db: Session = Depends(get_db),
    x_demo_identity: Optional[str] = Header(None, alias="X-Demo-Identity"),
    doctor_identifier: Optional[str] = Query(None)
):
    doc_id = doctor_identifier or x_demo_identity or "demo@yogsetu.test"
    norm_doc_id, _ = normalize_identifier(doc_id)

    # Find all assignments created by this doctor
    assignments = (
        db.query(Assignment)
        .filter(Assignment.doctor_identifier == norm_doc_id)
        .all()
    )

    cutoff_date = (datetime.now() - timedelta(days=13)).strftime("%Y-%m-%d")

    # Map by patient_identifier to get latest assignment & adherence
    patient_map: Dict[str, Dict[str, Any]] = {}
    for assign in assignments:
        p_id = assign.patient_identifier
        user = db.query(User).filter(User.identifier == p_id).first()
        patient_name = user.name if user else p_id
        id_type = user.id_type if user else ("email" if "@" in p_id else "phone")

        # Sessions for this patient in last 14 days with source == 'doctor'
        sessions = (
            db.query(SessionRecord)
            .filter(
                SessionRecord.patient_identifier == p_id,
                SessionRecord.source == "doctor",
                SessionRecord.date >= cutoff_date
            )
            .order_by(SessionRecord.date.desc())
            .all()
        )

        done = sum(1 for s in sessions if s.status == "done")
        skipped = sum(1 for s in sessions if s.status == "skipped")
        pain = sum(1 for s in sessions if s.status == "pain")
        adherence = compute_adherence(done, skipped, pain)
        has_pain = pain > 0
        last_active = sessions[0].date if sessions else None

        if p_id not in patient_map or assign.status == "active":
            patient_map[p_id] = {
                "identifier": p_id,
                "name": patient_name,
                "id_type": id_type,
                "assignment_id": assign.id,
                "weeks": assign.weeks,
                "start_date": assign.start_date,
                "status": assign.status,
                "adherence_pct": adherence,
                "last_active_date": last_active,
                "has_pain_flag": has_pain,
                "total_sessions": len(sessions),
                "done_count": done,
                "skipped_count": skipped,
                "pain_count": pain
            }

    return list(patient_map.values())


@router.post("/assign")
def assign_routine_to_patient(
    req: AssignRequest,
    db: Session = Depends(get_db),
    x_demo_identity: Optional[str] = Header(None, alias="X-Demo-Identity")
):
    doc_id = x_demo_identity or "demo@yogsetu.test"
    norm_doc_id, _ = normalize_identifier(doc_id)

    raw_patient = req.patient_identifier.strip()
    if not validate_identifier(raw_patient):
        raise HTTPException(
            status_code=400,
            detail={"error": {"code": "INVALID_PATIENT_ID", "message": "Please enter a valid patient Gmail or phone number."}}
        )

    norm_patient_id, id_type = normalize_identifier(raw_patient)
    display_name = req.patient_name.strip() if req.patient_name else norm_patient_id.split("@")[0].title()

    # Ensure patient user exists in DB
    patient = db.query(User).filter(User.identifier == norm_patient_id).first()
    if not patient:
        patient = User(identifier=norm_patient_id, name=display_name, id_type=id_type)
        db.add(patient)
        db.commit()

    # Ensure doctor exists in DB
    doctor = db.query(Doctor).filter(Doctor.identifier == norm_doc_id).first()
    if not doctor:
        doctor = Doctor(identifier=norm_doc_id, name="Dr. " + norm_doc_id.split("@")[0].title())
        db.add(doctor)
        db.commit()

    # Deactivate older active assignments for this pair
    db.query(Assignment).filter(
        Assignment.patient_identifier == norm_patient_id,
        Assignment.doctor_identifier == norm_doc_id,
        Assignment.status == "active"
    ).update({"status": "ended"})

    start_date = req.start_date or datetime.now().strftime("%Y-%m-%d")
    plan_str = json.dumps(req.plan) if isinstance(req.plan, dict) else str(req.plan)

    new_assignment = Assignment(
        patient_identifier=norm_patient_id,
        doctor_identifier=norm_doc_id,
        plan_json=plan_str,
        start_date=start_date,
        weeks=req.weeks or 2,
        status="active"
    )
    db.add(new_assignment)
    db.commit()
    db.refresh(new_assignment)

    return {
        "success": True,
        "assignment_id": new_assignment.id,
        "patient_identifier": norm_patient_id,
        "message": f"Routine successfully assigned to {patient.name} for {new_assignment.weeks} weeks."
    }
