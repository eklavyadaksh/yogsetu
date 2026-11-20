import hashlib
import json
from pathlib import Path
from typing import Any, Dict, List

from ..schemas import PlanItem, PlanResponse

POSES_FILE = Path(__file__).parent.parent / "data" / "poses.json"


def load_poses() -> List[Dict[str, Any]]:
    """Loads all clinical yoga poses from the local poses.json seed file."""
    with open(POSES_FILE, "r", encoding="utf-8") as f:
        return json.load(f)


VALID_POSES = load_poses()
VALID_POSE_IDS = {p["id"] for p in VALID_POSES}


def generate_fallback_plan(
    goal_or_concern: str,
    minutes_available: int = 15,
    age_group: str = "adult",
    not_covered: List[str] = None
) -> PlanResponse:
    """
    Dynamic rule-based generator for DEMO_MODE or when GEMINI_API_KEY is not set.
    Selects varied poses from all 10 poses in poses.json based on goal, duration, and age.
    """
    lower_goal = (goal_or_concern or "").lower().strip()
    is_child = age_group == "child"
    is_senior = age_group == "senior"

    # Determine desired pose count based on minutes (min 3, max 7)
    if minutes_available <= 10:
        desired_count = 3
    elif minutes_available <= 15:
        desired_count = 4
    elif minutes_available <= 20:
        desired_count = 5
    else:
        desired_count = 6

    # Keyword categorization
    is_height_or_spine = any(k in lower_goal for k in ["hegiht", "height", "tall", "grow", "lambai", "spine", "posture", "tadasana"])
    is_back_or_stiffness = any(k in lower_goal for k in ["back", "peeth", "kamar", "stiff", "sitting", "desk", "lumbar"])
    is_balance_or_legs = any(k in lower_goal for k in ["balance", "leg", "pair", "focus", "standing", "knee", "ghutna"])
    is_neck_or_shoulders = any(k in lower_goal for k in ["neck", "gardan", "shoulder", "kandha", "cervical", "headache"])
    is_flexibility_or_hips = any(k in lower_goal for k in ["hip", "flexibility", "stretch", "khinchaav", "butterfly"])
    is_relaxation_or_stress = any(k in lower_goal for k in ["relax", "sleep", "stress", "calm", "shaant", "tension"])

    candidate_pool: List[str] = []

    if is_height_or_spine:
        candidate_pool = [
            "tadasana",
            "bhujangasana",
            "marjaryasana_bitilasana",
            "setu_bandhasana",
            "vrikshasana",
            "balasana",
            "ardha_matsyendrasana",
        ]
        summary = (
            "Spinal decompression and posture elongation routine. "
            "Regular practice corrects slouching, decompresses vertebrae, and optimizes natural vertical alignment."
        )
    elif is_back_or_stiffness:
        candidate_pool = [
            "marjaryasana_bitilasana",
            "bhujangasana",
            "setu_bandhasana",
            "balasana",
            "ardha_matsyendrasana",
            "vajrasana",
        ]
        summary = "Therapeutic lower back decompression and gentle spinal mobilization plan."
    elif is_balance_or_legs:
        candidate_pool = [
            "tadasana",
            "vrikshasana",
            "vajrasana",
            "baddha_konasana",
            "setu_bandhasana",
            "balasana",
        ]
        summary = "Lower body stabilization, knee strengthening, and core balance sequence."
    elif is_neck_or_shoulders:
        candidate_pool = [
            "neck_rolls",
            "tadasana",
            "marjaryasana_bitilasana",
            "balasana",
            "ardha_matsyendrasana",
            "bhujangasana",
        ]
        summary = "Cervical spine release, upper trapezius relaxation, and desk fatigue relief."
    elif is_flexibility_or_hips:
        candidate_pool = [
            "baddha_konasana",
            "ardha_matsyendrasana",
            "balasana",
            "tadasana",
            "marjaryasana_bitilasana",
            "setu_bandhasana",
        ]
        summary = "Pelvic mobility, hip flexor release, and full-body flexibility routine."
    elif is_relaxation_or_stress:
        candidate_pool = [
            "balasana",
            "vajrasana",
            "marjaryasana_bitilasana",
            "neck_rolls",
            "baddha_konasana",
            "tadasana",
        ]
        summary = "Restorative parasympathetic flow for nervous system calming and stress release."
    else:
        # Balanced general flow
        candidate_pool = [
            "tadasana",
            "vrikshasana",
            "marjaryasana_bitilasana",
            "bhujangasana",
            "balasana",
            "baddha_konasana",
            "setu_bandhasana",
        ]
        summary = f"Custom {minutes_available}-minute functional yoga routine tailored to your goals."

    # Use a deterministic hash of goal string so different inputs yield diverse, stable outputs
    seed_num = int(hashlib.md5((lower_goal or "general").encode()).hexdigest()[:6], 16)
    offset = seed_num % max(1, len(candidate_pool))
    rotated_candidates = candidate_pool[offset:] + candidate_pool[:offset]

    # Select unique poses up to desired count
    selected_ids: List[str] = []
    for pid in rotated_candidates:
        if pid in VALID_POSE_IDS and pid not in selected_ids:
            selected_ids.append(pid)
        if len(selected_ids) >= desired_count:
            break

    # If still fewer than desired count, fill from VALID_POSES
    for p in VALID_POSES:
        if len(selected_ids) >= desired_count:
            break
        if p["id"] not in selected_ids:
            selected_ids.append(p["id"])

    # Create PlanItems
    items: List[PlanItem] = []
    for pid in selected_ids:
        hold = 12 if is_child else (20 if is_senior else 25)
        sets = 1 if is_child else (2 if minutes_available >= 20 else 1)

        if pid == "tadasana":
            base_tip = "Lengthen spine toward ceiling; distribute weight evenly on both feet."
        elif pid == "vrikshasana":
            base_tip = "Fix eyes at one point; engage core for stability."
        elif pid == "bhujangasana":
            base_tip = "Gently lift chest without forcing lower back."
        elif pid == "marjaryasana_bitilasana":
            base_tip = "Synchronize breath with gentle spinal arch and rounding."
        elif pid == "setu_bandhasana":
            base_tip = "Press feet firmly into mat to lift hips evenly."
        elif pid == "baddha_konasana":
            base_tip = "Keep spine erect and flutter thighs gently."
        elif pid == "neck_rolls":
            base_tip = "Smooth, slow circles without jerking the neck."
        else:
            base_tip = "Maintain steady diaphragmatic breathing during the hold."

        tip = f"{base_tip} (Do with a parent present.)" if is_child else base_tip

        items.append(PlanItem(
            pose_id=pid,
            hold_seconds=hold,
            sets=sets,
            days=["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"],
            tip=tip
        ))

    return PlanResponse(
        needs_doctor=False,
        summary=summary,
        plan=items,
        total_minutes=minutes_available,
        not_covered=not_covered or [],
        disclaimer="Yeh doctor ki salah nahi hai. Dard ho to rukein."
    )
