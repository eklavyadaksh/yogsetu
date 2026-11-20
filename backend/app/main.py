from contextlib import asynccontextmanager

from fastapi import FastAPI, Request
from fastapi.exceptions import RequestValidationError
from fastapi.middleware.cors import CORSMiddleware
from fastapi.middleware.gzip import GZipMiddleware
from fastapi.responses import JSONResponse
from starlette.exceptions import HTTPException as StarletteHTTPException

from .config import settings
from .db import Base, SessionLocal, engine
from .routers import auth, doctor, patient, plans, reports, seed
from .routers.seed import seed_demo_data


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Initialize database tables
    Base.metadata.create_all(bind=engine)
    # Seed default demo data if empty
    db = SessionLocal()
    try:
        seed_demo_data(db)
    finally:
        db.close()
    yield


app = FastAPI(
    title="YogSetu API",
    description="Therapeutic Yoga Bridge connecting doctors and patients with camera-assisted home tracking.",
    version="1.0.0",
    lifespan=lifespan
)

# GZip compression for responses > 1KB (enhances network efficiency)
app.add_middleware(GZipMiddleware, minimum_size=1000)

# Secure CORS policy: allows local development and verified deployed origins
if settings.DEMO_MODE:
    app.add_middleware(
        CORSMiddleware,
        allow_origin_regex=r"^https?://(localhost|127\.0\.0\.1|.*\.vercel\.app|.*\.onrender\.com)(:\d+)?$",
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )
else:
    app.add_middleware(
        CORSMiddleware,
        allow_origins=settings.cors_origin_list,
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )


@app.middleware("http")
async def add_security_headers(request: Request, call_next):
    response = await call_next(request)
    response.headers["X-Content-Type-Options"] = "nosniff"
    response.headers["X-Frame-Options"] = "DENY"
    response.headers["Referrer-Policy"] = "strict-origin-when-cross-origin"
    response.headers["Permissions-Policy"] = "camera=(self), microphone=(self)"
    response.headers["X-XSS-Protection"] = "1; mode=block"
    return response


@app.exception_handler(StarletteHTTPException)
async def http_exception_handler(request: Request, exc: StarletteHTTPException):
    detail = exc.detail
    if isinstance(detail, dict) and "error" in detail:
        return JSONResponse(status_code=exc.status_code, content=detail)
    return JSONResponse(
        status_code=exc.status_code,
        content={"error": {"code": f"HTTP_{exc.status_code}", "message": str(detail)}}
    )


@app.exception_handler(RequestValidationError)
async def validation_exception_handler(request: Request, exc: RequestValidationError):
    errors = exc.errors()
    first_error = errors[0]["msg"] if errors else "Invalid request data"
    return JSONResponse(
        status_code=422,
        content={"error": {"code": "VALIDATION_ERROR", "message": first_error}}
    )


@app.get("/api/health")
def health_check():
    return {
        "status": "ok",
        "service": "yogsetu-backend",
        "demo_mode": settings.DEMO_MODE,
        "model_id": settings.GEMMA_MODEL_ID
    }


app.include_router(auth.router)
app.include_router(plans.router)
app.include_router(doctor.router)
app.include_router(patient.router)
app.include_router(reports.router)
app.include_router(seed.router)
