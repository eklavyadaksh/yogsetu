import json
import pytest
from app.services.plan_service import load_poses, VALID_POSE_IDS, generate_fallback_plan
from app.services.gemma_service import _clean_json_text, _filter_and_validate_plan


def test_poses_json_validity():
    poses = load_poses()
    assert len(poses) >= 10
    required_fields = ["id", "hindi_name", "english_name", "how_to", "default_hold_seconds", "camera_supported", "caution"]
    for p in poses:
        for f in required_fields:
            assert f in p, f"Field {f} missing in pose {p.get('id')}"
        assert len(p["how_to"]) >= 3


def test_clean_json_code_fences():
    raw_markdown = """```json
{
  "needs_doctor": false,
  "summary": "Sample plan",
  "plan": []
}
```"""
    cleaned = _clean_json_text(raw_markdown)
    parsed = json.loads(cleaned)
    assert parsed["needs_doctor"] is False
    assert parsed["summary"] == "Sample plan"


def test_filter_and_validate_drops_invented_poses():
    raw_response = {
        "needs_doctor": False,
        "summary": "Draft plan",
        "plan": [
            {"pose_id": "tadasana", "hold_seconds": 25, "sets": 2},
            {"pose_id": "invented_alien_pose", "hold_seconds": 30, "sets": 1}
        ],
        "not_covered": ["unknown_exercise"]
    }
    validated = _filter_and_validate_plan(raw_response, minutes=15)
    pose_ids = [p.pose_id for p in validated.plan]
    assert "tadasana" in pose_ids
    assert "invented_alien_pose" not in pose_ids
    assert "invented_alien_pose" in validated.not_covered
    assert "unknown_exercise" in validated.not_covered


def test_child_plan_customization():
    plan = generate_fallback_plan("Daily morning routine", minutes_available=15, age_group="child")
    for item in plan.plan:
        assert item.hold_seconds <= 15
        assert item.sets == 1
        assert "parent" in item.tip.lower()
