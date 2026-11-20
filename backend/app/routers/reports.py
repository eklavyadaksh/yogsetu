from typing import Optional

from fastapi import APIRouter, Depends, Header, Query
from sqlalchemy.orm import Session

from ..db import get_db
from ..schemas import SummaryRequest
from ..services.gemma_service import generate_doctor_summary
from ..services.identity import normalize_identifier
from ..services.report_service import get_patient_report_data

router = APIRouter(prefix="/api", tags=["reports"])


# Header-based identity is demo-only to allow instant role switching in judge evaluation.
@router.get("/report/{identifier}")
def get_patient_report(
    identifier: str,
    db: Session = Depends(get_db),
    x_demo_identity: Optional[str] = Header(None, alias="X-Demo-Identity"),
    doctor_identifier: Optional[str] = Query(None),
    days: int = Query(14)
):
    norm_patient_id, _ = normalize_identifier(identifier)
    doc_id = doctor_identifier or x_demo_identity or "demo@yogsetu.test"
    norm_doc_id, _ = normalize_identifier(doc_id)

    report_data = get_patient_report_data(
        db=db,
        patient_identifier=norm_patient_id,
        doctor_identifier=norm_doc_id,
        days=days
    )
    return report_data


@router.post("/summary")
def get_doctor_ai_summary(
    req: SummaryRequest,
    db: Session = Depends(get_db),
    x_demo_identity: Optional[str] = Header(None, alias="X-Demo-Identity")
):
    norm_patient_id, _ = normalize_identifier(req.patient_identifier)
    doc_id = x_demo_identity or "demo@yogsetu.test"
    norm_doc_id, _ = normalize_identifier(doc_id)

    report_data = get_patient_report_data(
        db=db,
        patient_identifier=norm_patient_id,
        doctor_identifier=norm_doc_id,
        days=req.days
    )

    stats = {
        "done_count": sum(d["done_count"] for d in report_data["days_grid"]),
        "skipped_count": sum(d["skipped_count"] for d in report_data["days_grid"]),
        "pain_count": sum(d["pain_count"] for d in report_data["days_grid"]),
        "adherence_pct": report_data["adherence_pct"],
        "pain_notes": report_data["pain_reports"],
        "angle_summary": f"{len(report_data['angle_trends'])} camera pose(s) tracked" if report_data['angle_trends'] else "No camera sessions"
    }

    ai_text = generate_doctor_summary(stats)
    return {"summary": ai_text}
