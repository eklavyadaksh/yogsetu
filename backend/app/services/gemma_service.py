import json
import logging
import re
from typing import Any, Dict, List, Optional

from google import genai
from google.genai import types

from ..config import settings
from ..schemas import PlanItem, PlanResponse
from .plan_service import VALID_POSE_IDS, generate_fallback_plan
from .safety import check_medical_safety

logger = logging.getLogger(__name__)


def _clean_json_text(text: str) -> str:
    """Strips markdown code fences and extraneous text."""
    trimmed = text.strip()
    match = re.search(r"```(?:json)?\s*([\s\S]*?)\s*```", trimmed)
    if match:
        return match.group(1).strip()
    return trimmed


def _filter_and_validate_plan(raw_data: Dict[str, Any], minutes: int) -> PlanResponse:
    """Validates raw parsed JSON against allowed pose IDs and schema."""
    plan_items: List[PlanItem] = []
    not_covered: List[str] = raw_data.get("not_covered", [])

    for item in raw_data.get("plan", []):
        pid = item.get("pose_id", "").strip()
        if pid in VALID_POSE_IDS:
            plan_items.append(PlanItem(
                pose_id=pid,
                hold_seconds=int(item.get("hold_seconds", 20)),
                sets=int(item.get("sets", 1)),
                days=item.get("days", ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"]),
                tip=item.get("tip", "Gentle stretching")
            ))
        else:
            if pid:
                not_covered.append(pid)

    return PlanResponse(
        needs_doctor=bool(raw_data.get("needs_doctor", False)),
        summary=raw_data.get("summary", "Draft routine based on your inputs."),
        plan=plan_items,
        total_minutes=int(raw_data.get("total_minutes", minutes)),
        not_covered=list(set(not_covered)),
        disclaimer=raw_data.get("disclaimer", "Yeh doctor ki salah nahi hai. Dard ho to rukein.")
    )


def _get_client() -> Optional[genai.Client]:
    if not settings.GEMINI_API_KEY or settings.GEMINI_API_KEY.startswith("your_"):
        return None
    try:
        return genai.Client(api_key=settings.GEMINI_API_KEY)
    except Exception as e:
        logger.warning(f"Could not initialize genai client: {e}")
        return None


def generate_plan_from_text(goal_or_concern: str, minutes_available: int = 15, age_group: str = "adult") -> PlanResponse:
    is_safe, flagged_reason = check_medical_safety(goal_or_concern)
    if not is_safe:
        return PlanResponse(
            needs_doctor=True,
            summary=flagged_reason or "Emergency or severe symptom detected.",
            plan=[],
            total_minutes=0,
            not_covered=[],
            disclaimer="Kripya pehle doctor se paramarsh lein."
        )

    if settings.DEMO_MODE or not settings.GEMINI_API_KEY:
        return generate_fallback_plan(goal_or_concern, minutes_available, age_group)

    client = _get_client()
    if not client:
        return generate_fallback_plan(goal_or_concern, minutes_available, age_group)

    prompt = f"""You are an assistant for YogSetu, a therapeutic guided yoga bridge.
RULES:
1. Poses MUST ONLY be chosen from these exact IDs: {list(VALID_POSE_IDS)}. Never invent a pose.
2. Never claim to cure, treat, diagnose, or increase height.
3. If age_group is 'child', shorter holds (10-15s), fewer sets, add tip 'Do with a parent present'.
4. Total routine time must fit within {minutes_available} minutes.
5. All tips and summary must be in simple conversational Hinglish.
Return JSON ONLY:
{{
  "needs_doctor": false,
  "summary": "Short 2 sentence Hinglish summary",
  "plan": [{{"pose_id": "...", "hold_seconds": 20, "sets": 2, "days": ["Mon","Tue"], "tip": "..."}}],
  "total_minutes": {minutes_available},
  "not_covered": [],
  "disclaimer": "Yeh doctor ki salah nahi hai. Dard ho to rukein."
}}
User Goal/Concern: {goal_or_concern}
Age group: {age_group}
"""
    for attempt in range(2):
        try:
            resp = client.models.generate_content(
                model=settings.GEMMA_MODEL_ID,
                contents=prompt
            )
            cleaned = _clean_json_text(resp.text)
            parsed = json.loads(cleaned)
            return _filter_and_validate_plan(parsed, minutes_available)
        except Exception as e:
            logger.warning(f"Gemma plan attempt {attempt+1} failed: {e}")

    return generate_fallback_plan(goal_or_concern, minutes_available, age_group)


def generate_plan_from_image(image_bytes: bytes, mime_type: str, minutes_available: int = 15, age_group: str = "adult") -> PlanResponse:
    if settings.DEMO_MODE or not settings.GEMINI_API_KEY:
        return generate_fallback_plan(
            goal_or_concern="Prescription note: morning mobility & spine care",
            minutes_available=minutes_available,
            age_group=age_group,
            not_covered=["lumbar-traction-device", "ultrasound-heat"]
        )

    client = _get_client()
    if not client:
        return generate_fallback_plan("Prescription note draft", minutes_available, age_group)

    image_part = types.Part.from_bytes(data=image_bytes, mime_type=mime_type)
    prompt = f"""Read this handwritten or printed doctor/therapist prescription note.
Extract exercises and map them ONLY to available pose IDs: {list(VALID_POSE_IDS)}.
Anything written on the note that is not in this pose list must be placed in 'not_covered'.
Never invent a pose. Return JSON ONLY:
{{
  "needs_doctor": false,
  "summary": "Extracted draft routine from note in Hinglish",
  "plan": [{{"pose_id": "...", "hold_seconds": 20, "sets": 2, "days": ["Mon","Wed","Fri"], "tip": "..."}}],
  "total_minutes": {minutes_available},
  "not_covered": ["unsupported items"],
  "disclaimer": "Yeh doctor ki salah nahi hai. Dard ho to rukein."
}}
"""
    for attempt in range(2):
        try:
            resp = client.models.generate_content(
                model=settings.GEMMA_MODEL_ID,
                contents=[image_part, prompt]
            )
            cleaned = _clean_json_text(resp.text)
            parsed = json.loads(cleaned)
            return _filter_and_validate_plan(parsed, minutes_available)
        except Exception as e:
            logger.warning(f"Gemma image draft attempt {attempt+1} failed: {e}")

    return generate_fallback_plan("Prescription note draft", minutes_available, age_group)


def generate_doctor_summary(session_stats: Dict[str, Any]) -> str:
    """Generates 3-4 factual lines for the doctor based on session data."""
    done = session_stats.get("done_count", 0)
    skipped = session_stats.get("skipped_count", 0)
    pain = session_stats.get("pain_count", 0)
    adherence = session_stats.get("adherence_pct", 0)
    angles = session_stats.get("angle_summary", "Angles stable")
    pain_notes = session_stats.get("pain_notes", [])

    fallback = (
        f"Patient completed {done} sessions ({adherence}% adherence) in the last 14 days, with {skipped} skipped. "
        f"Pain flags reported: {pain} time(s){' (' + ', '.join(pain_notes[:2]) + ')' if pain_notes else ''}. "
        f"Posture metrics show {angles} across camera-assisted sessions."
    )

    if settings.DEMO_MODE or not settings.GEMINI_API_KEY:
        return fallback

    client = _get_client()
    if not client:
        return fallback

    prompt = f"""Write exactly 3 to 4 factual lines for a doctor reviewing this patient's home yoga logs.
DO NOT give medical advice. DO NOT claim clinical cure or health improvement.
State strictly what happened based on these numbers:
- Adherence: {adherence}%
- Sessions completed: {done}
- Sessions skipped: {skipped}
- Pain occurrences: {pain} (Notes: {pain_notes})
- Angle trends: {angles}
Keep it professional, concise, and purely factual.
"""
    try:
        resp = client.models.generate_content(
            model=settings.GEMMA_MODEL_ID,
            contents=prompt
        )
        return resp.text.strip()
    except Exception as e:
        logger.warning(f"Gemma doctor summary failed: {e}")
        return fallback
