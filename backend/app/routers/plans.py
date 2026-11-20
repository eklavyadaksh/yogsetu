from typing import Any, Dict, List, Optional

from fastapi import APIRouter, File, Form, HTTPException, UploadFile

from ..schemas import PlanRequest, PlanResponse
from ..services.gemma_service import generate_plan_from_image, generate_plan_from_text
from ..services.plan_service import load_poses

router = APIRouter(prefix="/api", tags=["plans"])


ALLOWED_IMAGE_TYPES = {"image/jpeg", "image/png", "image/webp"}
MAX_IMAGE_SIZE = 5 * 1024 * 1024  # 5 MB
MAX_TEXT_LENGTH = 1000


@router.get("/poses", response_model=List[Dict[str, Any]])
def get_poses():
    return load_poses()


@router.post("/plan/self", response_model=PlanResponse)
def create_self_plan(req: PlanRequest):
    if len(req.goal_or_concern) > MAX_TEXT_LENGTH:
        raise HTTPException(
            status_code=400,
            detail={"error": {"code": "INPUT_TOO_LONG", "message": f"Goal or concern exceeds maximum length of {MAX_TEXT_LENGTH} characters."}}
        )
    return generate_plan_from_text(
        goal_or_concern=req.goal_or_concern,
        minutes_available=req.minutes_available,
        age_group=req.age_group
    )


@router.post("/plan/from-note", response_model=PlanResponse)
async def create_plan_from_note(
    note_image: UploadFile = File(...),
    minutes_available: int = Form(15),
    age_group: str = Form("adult")
):
    if not note_image.content_type or note_image.content_type.lower() not in ALLOWED_IMAGE_TYPES:
        raise HTTPException(
            status_code=400,
            detail={"error": {"code": "INVALID_FILE_TYPE", "message": "Only JPEG, PNG, and WEBP image files are supported."}}
        )

    content = await note_image.read()
    if len(content) > MAX_IMAGE_SIZE:
        raise HTTPException(
            status_code=413,
            detail={"error": {"code": "FILE_TOO_LARGE", "message": "Image size exceeds 5MB limit."}}
        )

    return generate_plan_from_image(
        image_bytes=content,
        mime_type=note_image.content_type,
        minutes_available=minutes_available,
        age_group=age_group
    )


@router.post("/doctor/plan-draft", response_model=PlanResponse)
async def create_doctor_draft(
    goal_or_concern: Optional[str] = Form(""),
    minutes_available: int = Form(15),
    age_group: str = Form("adult"),
    note_image: Optional[UploadFile] = File(None)
):
    if goal_or_concern and len(goal_or_concern) > MAX_TEXT_LENGTH:
        raise HTTPException(
            status_code=400,
            detail={"error": {"code": "INPUT_TOO_LONG", "message": f"Goal or concern exceeds maximum length of {MAX_TEXT_LENGTH} characters."}}
        )

    if note_image and note_image.filename:
        if not note_image.content_type or note_image.content_type.lower() not in ALLOWED_IMAGE_TYPES:
            raise HTTPException(
                status_code=400,
                detail={"error": {"code": "INVALID_FILE_TYPE", "message": "Only JPEG, PNG, and WEBP image files are supported."}}
            )
        content = await note_image.read()
        if len(content) > MAX_IMAGE_SIZE:
            raise HTTPException(
                status_code=413,
                detail={"error": {"code": "FILE_TOO_LARGE", "message": "Image size exceeds 5MB limit."}}
            )
        return generate_plan_from_image(
            image_bytes=content,
            mime_type=note_image.content_type,
            minutes_available=minutes_available,
            age_group=age_group
        )

    return generate_plan_from_text(
        goal_or_concern=goal_or_concern or "Spine mobility and posture routine",
        minutes_available=minutes_available,
        age_group=age_group
    )
