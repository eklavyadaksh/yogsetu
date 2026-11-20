import pytest
from fastapi.testclient import TestClient
from app.main import app


@pytest.fixture
def client():
    return TestClient(app)


def test_auth_login_user(client):
    res = client.post("/api/auth/login", json={
        "identifier": "test.patient@example.com",
        "name": "Test Patient",
        "role": "user"
    })
    assert res.status_code == 200
    data = res.json()
    assert data["role"] == "user"
    assert data["identifier"] == "test.patient@example.com"
    assert data["name"] == "Test Patient"


def test_auth_login_doctor(client):
    res = client.post("/api/auth/login", json={
        "identifier": "dr.smith@example.com",
        "name": "Dr. Smith",
        "role": "doctor"
    })
    assert res.status_code == 200
    data = res.json()
    assert data["role"] == "doctor"
    assert data["identifier"] == "dr.smith@example.com"


def test_auth_login_validation_bounds(client):
    # Too short identifier (< 3 chars)
    res = client.post("/api/auth/login", json={
        "identifier": "ab",
        "role": "user"
    })
    assert res.status_code == 422


def test_get_patient_assignments(client):
    res = client.get("/api/assignments?identifier=priya@example.com")
    assert res.status_code == 200
    assignments = res.json()
    assert isinstance(assignments, list)


def test_log_session_done(client):
    res = client.post("/api/session", json={
        "patient_identifier": "priya@example.com",
        "date": "2026-11-20",
        "pose_id": "tadasana",
        "status": "done",
        "hold_seconds": 35,
        "best_angle": 178.5,
        "source": "self"
    })
    assert res.status_code == 200
    data = res.json()
    assert data["success"] is True
    assert "session_id" in data


def test_log_session_pain_flag(client):
    res = client.post("/api/session", json={
        "patient_identifier": "priya@example.com",
        "date": "2026-11-20",
        "pose_id": "bhujangasana",
        "status": "pain",
        "note": "Sharp pinch in lower back upon lifting chest",
        "source": "self"
    })
    assert res.status_code == 200
    data = res.json()
    assert data["success"] is True
    assert "session_id" in data


def test_doctor_patients_list(client):
    res = client.get("/api/doctor/patients", headers={"X-Demo-Identity": "demo@yogsetu.test"})
    assert res.status_code == 200
    patients = res.json()
    assert isinstance(patients, list)


def test_doctor_patient_report(client):
    res = client.get("/api/report/priya@example.com", headers={"X-Demo-Identity": "demo@yogsetu.test"})
    assert res.status_code == 200
    report = res.json()
    assert "days_grid" in report
    assert "adherence_pct" in report
    assert "pain_reports" in report


def test_doctor_ai_summary(client):
    res = client.post("/api/summary", json={
        "patient_identifier": "priya@example.com",
        "days": 14
    }, headers={"X-Demo-Identity": "demo@yogsetu.test"})
    assert res.status_code == 200
    data = res.json()
    assert "summary" in data
    assert isinstance(data["summary"], str)


def test_doctor_assign_flow(client):
    res = client.post("/api/assign", json={
        "patient_identifier": "arjun.kapoor@example.com",
        "patient_name": "Arjun Kapoor",
        "weeks": 3,
        "plan": {
            "plan": [
                {
                    "id": "tadasana",
                    "primary_name": "Tadasana",
                    "subtitle_name": "Mountain Pose",
                    "hold_seconds": 30,
                    "sets": 3,
                    "target_angle": 180,
                    "camera_supported": True,
                    "instructions": ["Stand tall", "Feet hip-width apart"],
                    "precautions": ["Avoid if dizzy"]
                }
            ]
        }
    }, headers={"X-Demo-Identity": "demo@yogsetu.test"})
    assert res.status_code == 200
    data = res.json()
    assert data["success"] is True
    assert "assignment_id" in data
