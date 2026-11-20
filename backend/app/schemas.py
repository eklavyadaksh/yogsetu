from typing import Any, Dict, List, Optional

from pydantic import BaseModel, Field


class PlanItem(BaseModel):
    pose_id: str
    hold_seconds: int = 20
    sets: int = 1
    days: List[str] = Field(default_factory=lambda: ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"])
    tip: str = ""


class PlanResponse(BaseModel):
    needs_doctor: bool = False
    summary: str = ""
    plan: List[PlanItem] = Field(default_factory=list)
    total_minutes: int = 15
    not_covered: List[str] = Field(default_factory=list)
    disclaimer: str = "Yeh doctor ki salah nahi hai. Dard ho to rukein."


class PlanRequest(BaseModel):
    goal_or_concern: str
    minutes_available: int = Field(default=15, ge=5, le=120)
    age_group: str = Field(default="adult")  # "adult", "senior", "child"


class DoctorDraftRequest(BaseModel):
    goal_or_concern: Optional[str] = Field(default="", max_length=1000)
    minutes_available: int = Field(default=15, ge=5, le=120)
    age_group: str = Field(default="adult")


class AssignRequest(BaseModel):
    patient_identifier: str = Field(..., min_length=3, max_length=255)
    patient_name: Optional[str] = Field(default=None, max_length=255)
    plan: Dict[str, Any]
    weeks: int = Field(default=2, ge=1, le=52)
    start_date: Optional[str] = None


class SessionLogRequest(BaseModel):
    patient_identifier: str = Field(..., min_length=3, max_length=255)
    assignment_id: Optional[int] = None
    date: str = Field(..., min_length=8, max_length=10)  # YYYY-MM-DD
    pose_id: str = Field(..., min_length=1, max_length=100)
    status: str = Field(..., min_length=3, max_length=20)  # 'done' | 'skipped' | 'pain'
    best_angle: Optional[float] = None
    hold_seconds: int = Field(default=0, ge=0, le=7200)
    note: Optional[str] = Field(default=None, max_length=500)
    source: str = Field(default="self", max_length=20)  # 'doctor' | 'self'


class SummaryRequest(BaseModel):
    patient_identifier: str = Field(..., min_length=3, max_length=255)
    days: int = Field(default=14, ge=1, le=90)


class ErrorDetail(BaseModel):
    code: str
    message: str


class StandardError(BaseModel):
    error: ErrorDetail
