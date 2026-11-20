import pytest
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from app.db import Base
from app.models import User, Doctor, Assignment, SessionRecord
from app.services.report_service import compute_adherence, compute_streak, get_patient_report_data


@pytest.fixture
def test_db():
    engine = create_engine("sqlite:///:memory:")
    Base.metadata.create_all(bind=engine)
    TestingSession = sessionmaker(bind=engine)
    db = TestingSession()
    yield db
    db.close()


def test_adherence_calculation():
    assert compute_adherence(done=8, skipped=2, pain=0) == 80
    assert compute_adherence(done=10, skipped=0, pain=0) == 100
    assert compute_adherence(done=0, skipped=5, pain=0) == 0
    assert compute_adherence(done=0, skipped=0, pain=0) == 0


def test_streak_calculation():
    from datetime import datetime, timedelta
    today = datetime.now().date()
    d0 = today.strftime("%Y-%m-%d")
    d1 = (today - timedelta(days=1)).strftime("%Y-%m-%d")
    d2 = (today - timedelta(days=2)).strftime("%Y-%m-%d")
    d3 = (today - timedelta(days=3)).strftime("%Y-%m-%d")

    # 3-day streak ending today
    status_map = {d0: "done", d1: "done", d2: "done", d3: "skipped"}
    assert compute_streak(status_map) == 3


def test_report_strictly_excludes_source_self(test_db):
    # Setup test doctor and patient
    doc = Doctor(identifier="dr.test@hospital.com", name="Dr. Test")
    patient = User(identifier="patient@test.com", name="Test Patient", id_type="email")
    test_db.add_all([doc, patient])
    test_db.commit()

    from datetime import datetime
    today_str = datetime.now().strftime("%Y-%m-%d")

    # Add 1 doctor-assigned session
    s_doc = SessionRecord(
        patient_identifier="patient@test.com",
        date=today_str,
        pose_id="tadasana",
        status="done",
        best_angle=175.0,
        hold_seconds=25,
        source="doctor"
    )
    # Add 1 private self session (e.g. user exploring home screen)
    s_self = SessionRecord(
        patient_identifier="patient@test.com",
        date=today_str,
        pose_id="neck_rolls",
        status="done",
        best_angle=None,
        hold_seconds=30,
        source="self"
    )
    test_db.add_all([s_doc, s_self])
    test_db.commit()

    report = get_patient_report_data(
        db=test_db,
        patient_identifier="patient@test.com",
        doctor_identifier="dr.test@hospital.com",
        days=14
    )

    # All poses in days_grid must only be from source="doctor"
    all_logged_poses = []
    for day in report["days_grid"]:
        for p in day["poses"]:
            all_logged_poses.append(p["pose_id"])

    assert "tadasana" in all_logged_poses
    assert "neck_rolls" not in all_logged_poses, "Privacy violation: source='self' session leaked into doctor report!"
