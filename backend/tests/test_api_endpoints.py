import pytest
from fastapi.testclient import TestClient
from app.main import app
from app.config import settings


@pytest.fixture
def client():
    return TestClient(app)


def test_health_check(client):
    res = client.get("/api/health")
    assert res.status_code == 200
    data = res.json()
    assert data["status"] == "ok"
    assert data["service"] == "yogsetu-backend"
    assert "demo_mode" in data


def test_get_poses(client):
    res = client.get("/api/poses")
    assert res.status_code == 200
    poses = res.json()
    assert isinstance(poses, list)
    assert len(poses) >= 10
    ids = [p["id"] for p in poses]
    assert "tadasana" in ids
    assert "vrikshasana" in ids


def test_plan_generation_demo_mode(client):
    res = client.post("/api/plan/self", json={
        "goal_or_concern": "Gentle morning spine mobility for desk sitting",
        "minutes_available": 15,
        "age_group": "adult"
    })
    assert res.status_code == 200
    data = res.json()
    assert "plan" in data
    assert len(data["plan"]) > 0
    assert "summary" in data
    assert "disclaimer" in data


def test_invalid_input_text_too_long(client):
    res = client.post("/api/plan/self", json={
        "goal_or_concern": "A" * 1001,
        "minutes_available": 15,
        "age_group": "adult"
    })
    assert res.status_code == 400
    err = res.json()
    assert "error" in err
    assert err["error"]["code"] == "INPUT_TOO_LONG"


def test_invalid_image_upload_mime(client):
    files = {"note_image": ("notes.txt", b"plain text prescription", "text/plain")}
    res = client.post("/api/plan/from-note", files=files, data={"minutes_available": 15})
    assert res.status_code == 400
    err = res.json()
    assert "error" in err
    assert err["error"]["code"] == "INVALID_FILE_TYPE"


def test_reset_guard_forbidden(client, monkeypatch):
    monkeypatch.setattr(settings, "DEMO_MODE", False)
    monkeypatch.setattr(settings, "ALLOW_RESET", False)
    res = client.post("/api/seed/reset")
    assert res.status_code == 403
    err = res.json()
    assert "error" in err
    assert err["error"]["code"] == "FORBIDDEN"


def test_security_headers_present(client):
    res = client.get("/api/health")
    assert res.headers.get("X-Content-Type-Options") == "nosniff"
    assert res.headers.get("X-Frame-Options") == "DENY"
    assert res.headers.get("Referrer-Policy") == "strict-origin-when-cross-origin"
