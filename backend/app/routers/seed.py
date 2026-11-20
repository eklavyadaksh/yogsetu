import json
from datetime import datetime, timedelta

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from ..config import settings
from ..db import Base, engine, get_db
from ..models import Assignment, Doctor, SessionRecord, User

router = APIRouter(prefix="/api/seed", tags=["seed"])


def seed_demo_data(db: Session):
    # 1. Demo Doctor
    doc = db.query(Doctor).filter(Doctor.identifier == "demo@yogsetu.test").first()
    if not doc:
        doc = Doctor(identifier="demo@yogsetu.test", name="Dr. Aarav Mehta (PT)")
        db.add(doc)
        db.commit()

    # 2. Demo Patient 1: Priya Sharma (Email)
    p1 = db.query(User).filter(User.identifier == "priya.sharma@example.com").first()
    if not p1:
        p1 = User(identifier="priya.sharma@example.com", name="Priya Sharma", id_type="email")
        db.add(p1)
        db.commit()

    # 3. Demo Patient 2: Rajesh Patel (Phone)
    p2 = db.query(User).filter(User.identifier == "9876543210").first()
    if not p2:
        p2 = User(identifier="9876543210", name="Rajesh Patel", id_type="phone")
        db.add(p2)
        db.commit()

    # 4. Normal user with no doctor assignment: Ananya Verma
    u_norm = db.query(User).filter(User.identifier == "ananya@example.com").first()
    if not u_norm:
        u_norm = User(identifier="ananya@example.com", name="Ananya Verma", id_type="email")
        db.add(u_norm)
        db.commit()

    # 5. Active Assignment for Priya Sharma (Spine Care & Posture)
    assign1 = db.query(Assignment).filter(
        Assignment.patient_identifier == "priya.sharma@example.com",
        Assignment.doctor_identifier == "demo@yogsetu.test"
    ).first()

    plan1 = {
        "needs_doctor": False,
        "summary": "14-day therapeutic spinal mobilization and posture alignment routine.",
        "plan": [
            {"pose_id": "tadasana", "hold_seconds": 25, "sets": 2, "days": ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"], "tip": "Reeda seedhi rakhein aur dono pairo par barabar vajan dalein."},
            {"pose_id": "marjaryasana_bitilasana", "hold_seconds": 30, "sets": 2, "days": ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"], "tip": "Saans lete hue peeth ko dheere se arch karein."},
            {"pose_id": "bhujangasana", "hold_seconds": 20, "sets": 2, "days": ["Mon", "Wed", "Fri", "Sun"], "tip": "Chhaati ko aage uthayein, kamar par zyada zor na dalein."},
            {"pose_id": "balasana", "hold_seconds": 35, "sets": 1, "days": ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"], "tip": "Kandho ko dheela chhodkar gehra aaram lein."}
        ],
        "total_minutes": 15,
        "not_covered": [],
        "disclaimer": "Yeh doctor ki salah nahi hai. Dard ho to rukein."
    }

    start_date_14 = (datetime.now() - timedelta(days=13)).strftime("%Y-%m-%d")

    if not assign1:
        assign1 = Assignment(
            patient_identifier="priya.sharma@example.com",
            doctor_identifier="demo@yogsetu.test",
            plan_json=json.dumps(plan1),
            start_date=start_date_14,
            weeks=2,
            status="active"
        )
        db.add(assign1)
        db.commit()
        db.refresh(assign1)

    # 6. Active Assignment for Rajesh Patel (Balance & Hip Stability)
    assign2 = db.query(Assignment).filter(
        Assignment.patient_identifier == "9876543210",
        Assignment.doctor_identifier == "demo@yogsetu.test"
    ).first()

    plan2 = {
        "needs_doctor": False,
        "summary": "Lower extremity balance and core stabilization plan.",
        "plan": [
            {"pose_id": "tadasana", "hold_seconds": 20, "sets": 2, "days": ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"], "tip": "Kandhe relaxed rakhein aur samne ek bindu par focus karein."},
            {"pose_id": "vrikshasana", "hold_seconds": 20, "sets": 2, "days": ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"], "tip": "Deewar ka sahara le sakte hain, ghutne par talwa na lagayein."},
            {"pose_id": "vajrasana", "hold_seconds": 35, "sets": 1, "days": ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"], "tip": "Pachan aur dhyan ke liye uttam aasan."}
        ],
        "total_minutes": 12,
        "not_covered": [],
        "disclaimer": "Yeh doctor ki salah nahi hai. Dard ho to rukein."
    }

    if not assign2:
        assign2 = Assignment(
            patient_identifier="9876543210",
            doctor_identifier="demo@yogsetu.test",
            plan_json=json.dumps(plan2),
            start_date=start_date_14,
            weeks=3,
            status="active"
        )
        db.add(assign2)
        db.commit()
        db.refresh(assign2)

    # 7. Generate 14 days of realistic session records for Priya Sharma
    # Days 0 to 13 ago:
    # Most days 'done' with slowly improving angle for tadasana (from 166 deg to 176 deg)
    # Day 5 ago: 'skipped'
    # Day 9 ago: 'pain' on bhujangasana ("Lower back sharp stretch, had to stop early")
    existing_sessions = db.query(SessionRecord).filter(
        SessionRecord.patient_identifier == "priya.sharma@example.com"
    ).count()

    if existing_sessions == 0:
        base_tadasana_angle = 166.0
        today = datetime.now().date()
        for d in range(13, -1, -1):
            cur_date = (today - timedelta(days=d)).strftime("%Y-%m-%d")
            angle_val = round(min(176.5, base_tadasana_angle + (13 - d) * 0.8), 1)

            if d == 5:
                # Skipped day
                db.add(SessionRecord(
                    patient_identifier="priya.sharma@example.com",
                    assignment_id=assign1.id,
                    date=cur_date,
                    pose_id="tadasana",
                    status="skipped",
                    best_angle=None,
                    hold_seconds=0,
                    note="Had early morning travel",
                    source="doctor"
                ))
            elif d == 9:
                # Pain day
                db.add(SessionRecord(
                    patient_identifier="priya.sharma@example.com",
                    assignment_id=assign1.id,
                    date=cur_date,
                    pose_id="bhujangasana",
                    status="pain",
                    best_angle=152.0,
                    hold_seconds=8,
                    note="Mild tingling in lower back while arching up, stopped immediately",
                    source="doctor"
                ))
                db.add(SessionRecord(
                    patient_identifier="priya.sharma@example.com",
                    assignment_id=assign1.id,
                    date=cur_date,
                    pose_id="balasana",
                    status="done",
                    best_angle=None,
                    hold_seconds=35,
                    note="Rested in child's pose after discomfort",
                    source="doctor"
                ))
            else:
                # Normal done day
                db.add(SessionRecord(
                    patient_identifier="priya.sharma@example.com",
                    assignment_id=assign1.id,
                    date=cur_date,
                    pose_id="tadasana",
                    status="done",
                    best_angle=angle_val,
                    hold_seconds=25,
                    note=None,
                    source="doctor"
                ))
                db.add(SessionRecord(
                    patient_identifier="priya.sharma@example.com",
                    assignment_id=assign1.id,
                    date=cur_date,
                    pose_id="marjaryasana_bitilasana",
                    status="done",
                    best_angle=None,
                    hold_seconds=30,
                    note=None,
                    source="doctor"
                ))

        # Also add one private self session for Priya to prove source="self" privacy rule
        db.add(SessionRecord(
            patient_identifier="priya.sharma@example.com",
            assignment_id=None,
            date=today.strftime("%Y-%m-%d"),
            pose_id="neck_rolls",
            status="done",
            best_angle=None,
            hold_seconds=30,
            note="Private evening relaxation",
            source="self"
        ))

        db.commit()

    # 8. Generate 14 days of realistic sessions for Rajesh Patel (9876543210)
    existing_p2 = db.query(SessionRecord).filter(
        SessionRecord.patient_identifier == "9876543210"
    ).count()

    if existing_p2 == 0:
        today = datetime.now().date()
        base_vriksh_angle = 164.0
        for d in range(13, -1, -1):
            cur_date = (today - timedelta(days=d)).strftime("%Y-%m-%d")
            angle_val = round(min(175.0, base_vriksh_angle + (13 - d) * 0.7), 1)

            if d in [3, 8]:
                # Skipped days
                db.add(SessionRecord(
                    patient_identifier="9876543210",
                    assignment_id=assign2.id,
                    date=cur_date,
                    pose_id="vrikshasana",
                    status="skipped",
                    best_angle=None,
                    hold_seconds=0,
                    note="Long office hours",
                    source="doctor"
                ))
            else:
                db.add(SessionRecord(
                    patient_identifier="9876543210",
                    assignment_id=assign2.id,
                    date=cur_date,
                    pose_id="tadasana",
                    status="done",
                    best_angle=172.0,
                    hold_seconds=20,
                    note=None,
                    source="doctor"
                ))
                db.add(SessionRecord(
                    patient_identifier="9876543210",
                    assignment_id=assign2.id,
                    date=cur_date,
                    pose_id="vrikshasana",
                    status="done",
                    best_angle=angle_val,
                    hold_seconds=20,
                    note=None,
                    source="doctor"
                ))
        db.commit()


@router.post("")
def run_seed(db: Session = Depends(get_db)):
    seed_demo_data(db)
    return {"success": True, "message": "Demo data initialized successfully."}


@router.post("/reset")
def reset_seed(db: Session = Depends(get_db)):
    if not (settings.ALLOW_RESET or settings.DEMO_MODE):
        raise HTTPException(
            status_code=403,
            detail={"error": {"code": "FORBIDDEN", "message": "Database reset is only permitted when DEMO_MODE or ALLOW_RESET is enabled."}}
        )
    # Drop all tables and recreate
    Base.metadata.drop_all(bind=engine)
    Base.metadata.create_all(bind=engine)
    seed_demo_data(db)
    return {"success": True, "message": "Database reset and demo data re-seeded."}
