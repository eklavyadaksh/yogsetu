from datetime import datetime, timedelta
from typing import Any, Dict, List

from sqlalchemy.orm import Session

from ..models import Assignment, Doctor, SessionRecord, User
from .gemma_service import generate_doctor_summary


def compute_adherence(done: int, skipped: int, pain: int) -> int:
    total = done + skipped + pain
    if total == 0:
        return 0
    return int(round((done / total) * 100))


def compute_streak(daily_status: Dict[str, str]) -> int:
    """Computes active consecutive day streak ending today/yesterday."""
    today = datetime.now().date()
    streak = 0
    # If today hasn't been logged yet, allow streak to start from yesterday
    today_str = today.strftime("%Y-%m-%d")
    yesterday_str = (today - timedelta(days=1)).strftime("%Y-%m-%d")

    start_date = today if daily_status.get(today_str) == "done" else (
        today - timedelta(days=1) if daily_status.get(yesterday_str) == "done" else None
    )
    if not start_date:
        return 0

    curr = start_date
    while True:
        c_str = curr.strftime("%Y-%m-%d")
        if daily_status.get(c_str) == "done":
            streak += 1
            curr -= timedelta(days=1)
        else:
            break
    return streak


def get_patient_report_data(
    db: Session,
    patient_identifier: str,
    doctor_identifier: str,
    days: int = 14
) -> Dict[str, Any]:
    """
    Fetches the 14-day report for a patient assigned to this doctor.
    PRIVACY GUARANTEE: Excludes all sessions where source != 'doctor'.
    """
    patient = db.query(User).filter(User.identifier == patient_identifier).first()
    doctor = db.query(Doctor).filter(Doctor.identifier == doctor_identifier).first()

    # Active assignment between this doctor and patient
    active_assignment = (
        db.query(Assignment)
        .filter(
            Assignment.patient_identifier == patient_identifier,
            Assignment.doctor_identifier == doctor_identifier,
            Assignment.status == "active"
        )
        .first()
    )

    cutoff_date = (datetime.now() - timedelta(days=days - 1)).strftime("%Y-%m-%d")

    # Strictly filter for source == 'doctor'
    sessions: List[SessionRecord] = (
        db.query(SessionRecord)
        .filter(
            SessionRecord.patient_identifier == patient_identifier,
            SessionRecord.source == "doctor",
            SessionRecord.date >= cutoff_date
        )
        .order_by(SessionRecord.date.asc(), SessionRecord.id.asc())
        .all()
    )

    # Calculate day-by-day stats
    days_grid: Dict[str, Dict[str, Any]] = {}
    today = datetime.now().date()
    for i in range(days):
        d_str = (today - timedelta(days=(days - 1 - i))).strftime("%Y-%m-%d")
        days_grid[d_str] = {
            "date": d_str,
            "done_count": 0,
            "skipped_count": 0,
            "pain_count": 0,
            "poses": []
        }

    daily_primary_status: Dict[str, str] = {}
    done_count = 0
    skipped_count = 0
    pain_count = 0
    pain_notes: List[str] = []
    angle_trends: Dict[str, List[Dict[str, Any]]] = {}

    for s in sessions:
        if s.date in days_grid:
            grid_day = days_grid[s.date]
            if s.status == "done":
                grid_day["done_count"] += 1
                done_count += 1
                daily_primary_status[s.date] = "done"
            elif s.status == "skipped":
                grid_day["skipped_count"] += 1
                skipped_count += 1
                if s.date not in daily_primary_status:
                    daily_primary_status[s.date] = "skipped"
            elif s.status == "pain":
                grid_day["pain_count"] += 1
                pain_count += 1
                daily_primary_status[s.date] = "pain"
                if s.note:
                    pain_notes.append(f"{s.date} ({s.pose_id}): {s.note}")

            grid_day["poses"].append({
                "pose_id": s.pose_id,
                "status": s.status,
                "best_angle": s.best_angle,
                "hold_seconds": s.hold_seconds,
                "note": s.note
            })

            if s.best_angle is not None and s.status == "done":
                if s.pose_id not in angle_trends:
                    angle_trends[s.pose_id] = []
                angle_trends[s.pose_id].append({
                    "date": s.date,
                    "best_angle": s.best_angle
                })

    adherence_pct = compute_adherence(done_count, skipped_count, pain_count)
    streak_days = compute_streak(daily_primary_status)

    stats = {
        "done_count": done_count,
        "skipped_count": skipped_count,
        "pain_count": pain_count,
        "adherence_pct": adherence_pct,
        "pain_notes": pain_notes,
        "angle_summary": f"{len(angle_trends)} camera pose(s) tracked" if angle_trends else "No camera sessions recorded"
    }

    ai_summary = generate_doctor_summary(stats)

    return {
        "patient": {
            "identifier": patient.identifier if patient else patient_identifier,
            "name": patient.name if patient else "Patient",
            "id_type": patient.id_type if patient else "unknown"
        },
        "doctor": {
            "identifier": doctor.identifier if doctor else doctor_identifier,
            "name": doctor.name if doctor else "Doctor"
        },
        "active_assignment": {
            "id": active_assignment.id,
            "start_date": active_assignment.start_date,
            "weeks": active_assignment.weeks,
            "status": active_assignment.status,
            "plan": active_assignment.plan_json
        } if active_assignment else None,
        "streak_days": streak_days,
        "adherence_pct": adherence_pct,
        "days_grid": list(days_grid.values()),
        "angle_trends": angle_trends,
        "pain_reports": pain_notes,
        "summary_text": ai_summary
    }
