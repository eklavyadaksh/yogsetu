# YogSetu (योगसेतु) • Therapeutic Guided Yoga Bridge

> **"We do not replace the therapist. We show the therapist what happens at home."**

[![CI Status](https://img.shields.io/badge/CI-Passing-emerald.svg)](#)
[![Python 3.11+](https://img.shields.io/badge/python-3.11+-blue.svg)](https://www.python.org/)
[![FastAPI](https://img.shields.io/badge/FastAPI-0.115-teal.svg)](https://fastapi.tiangolo.com/)
[![React 18](https://img.shields.io/badge/React-18.3-61dafb.svg)](https://react.dev/)
[![TailwindCSS](https://img.shields.io/badge/Tailwind-3.4-38bdf8.svg)](https://tailwindcss.com/)
[![MediaPipe](https://img.shields.io/badge/MediaPipe-Tasks--Vision-orange.svg)](https://developers.google.com/mediapipe)
[![Gemma 4](https://img.shields.io/badge/Gemma%204-Google%20GenAI-blueviolet.svg)](https://ai.google.dev/)

---

## 🌐 Live Deployments

- **Frontend (Vercel):** [https://yogsetu.vercel.app](https://yogsetu.vercel.app) *(Live client interface)*
- **Backend (Render):** [https://yogsetu.onrender.com](https://yogsetu.onrender.com) *(API health: `/api/health`)*

---

## 🩺 The Real-World Problem

Millions of people suffer from postural disorders, chronic back pain, and musculoskeletal injuries. Doctors and physical therapists (PTs) routinely prescribe corrective yoga exercises, but home rehabilitation suffers from two critical points of failure:

1. **Incorrect Home Posture & Injury Risk:** When practicing at home, patients lack professional feedback. Incorrect joint angles, excessive lumbar hyperextension, or improper alignment can worsen existing injuries.
2. **The "Black Box" of Clinical Compliance:** Doctors have zero visibility into what happens between clinic visits. Did the patient practice daily? Which poses triggered discomfort? Were hold durations sufficient? When patients return 4 weeks later without improvement, therapists cannot distinguish between treatment failure and poor or unsafe adherence.

---

## 👥 Who YogSetu Helps

- **Patients / Home Yogis:** Receive real-time angle verification, friendly Hinglish voice corrections, and strict hold timers that only advance when form is correct. Private self-care sessions are completely isolated and never leaked.
- **Doctors & Physiotherapists:** Prescribe customized therapeutic regimens from handwritten notes or clinical goals, review verified 14-day adherence calendars, track joint angle progression over time, and receive instant alerts for pain-stopped sessions.
- **General Wellness Users:** Anyone with sedentary work fatigue or minor stiffness can generate safe, structured morning and evening routines with automated emergency red-flag safeguards.

---

## 🤖 How AI is Used Responsibly

| AI Capability | Model / Engine | Execution Location | Clinical Role |
|---|---|---|---|
| **Prescription OCR & Plan Drafting** | **Gemma 4 Vision** (`gemma-4-31b-it`) | Cloud Backend API | Transcribes doctor handwritten prescription notes or photo inputs, strictly mapping them to 10 clinically validated poses in `poses.json`. |
| **Doctor Telemetry Summarization** | **Gemma 4** (`gemma-4-31b-it`) | Cloud Backend API | Synthesizes 14 days of compliance logs, angle metrics, and pain notes into a concise, factual 3-sentence clinical brief (zero hallucinated medical claims). |
| **Real-Time Pose Angle Tracking** | **MediaPipe Tasks Vision** (WASM) | 100% In-Browser (Client) | Detects 33 skeletal body landmarks at 30 FPS. Evaluates joint angles (spine vertical tilt, knee angles) without streaming video or images to any server. |
| **Emergency Safety Gatekeeper** | Deterministic Keyword Classifier | Backend (`safety.py`) | Flags red-flag emergency symptoms (chest pain, numbness, surgery, fainting) across English, Hindi, and Hinglish, redirecting the user to immediate emergency medical care. |

---

## 🏗️ Architecture & Data Flow

```mermaid
graph TD
    subgraph "Doctor Clinical Workflow"
        Doc[Physiotherapist / Doctor] -->|Upload Prescription Note / Prompt| D_UI[Doctor Dashboard / New Assignment]
        D_UI -->|POST /api/doctor/plan-draft| GemmaSvc[Gemma 4 Vision Service]
        GemmaSvc -->|Filtered Pose Plan JSON| D_UI
        D_UI -->|POST /api/assign| DB[(SQLite / PostgreSQL DB)]
    end

    subgraph "Patient Home Practice (100% Private)"
        Patient[Patient at Home] -->|Logs In| P_UI[Assigned Dashboard]
        P_UI -->|GET /api/assignments| DB
        P_UI -->|Start Pose| Session[Live Session Screen / Sequential Runner]
        Webcam[Webcam Video Stream] --> MP[MediaPipe PoseLandmarker (WASM)]
        MP --> Angles[Joint Angle Calculator]
        Angles --> Rules[Clinical Angle Rules & Thresholds]
        Rules --> Voice[Hinglish / English Voice Coach]
        Rules --> Timer[Form-Dependent Hold Timer]
        Session -->|POST /api/session (source='doctor')| DB
    end

    subgraph "Longitudinal Telemetry & Reporting"
        DB -->|source='doctor' rows only| RepSvc[Report Telemetry Service]
        RepSvc --> GemmaSumm[Gemma Factual Summary Engine]
        GemmaSumm --> RepUI[14-Day Clinical Report & PDF]
        RepUI --> WhatsApp[One-Click WhatsApp Share / Print Export]
    end
```

---

## 📦 Monorepo Structure

```
yogsetu/
├── .github/workflows/
│   └── ci.yml                   # Automated backend pytest & frontend vitest + build CI pipeline
├── backend/
│   ├── app/
│   │   ├── main.py              # FastAPI application, security headers, global error handlers
│   │   ├── config.py            # Pydantic Settings & environment variables
│   │   ├── db.py                # SQLAlchemy engine & session factory
│   │   ├── models.py            # Indexed User, Doctor, Assignment, SessionRecord models
│   │   ├── schemas.py           # Pydantic v2 validation schemas
│   │   ├── deps.py              # Demo identity header handlers (with security notice)
│   │   ├── data/poses.json      # Single source of truth for 10 therapeutic poses
│   │   ├── routers/             # auth, plans, doctor, patient, reports, seed
│   │   └── services/            # gemma_service, plan_service, report_service, safety, identity
│   ├── tests/                   # 22 integration tests (health, poses, safety, plans, seed guard)
│   ├── ruff.toml                # Ruff backend linter configuration
│   ├── requirements.txt         # Pinned Python dependencies
│   └── pytest.ini
├── frontend/
│   ├── public/
│   │   ├── models/              # Local MediaPipe pose_landmarker_lite.task (5.7MB)
│   │   └── wasm/                # Local MediaPipe WASM runtime assets
│   ├── src/
│   │   ├── api/client.ts        # Typed fetch client with demo identity headers
│   │   ├── components/          # Navbar, Footer, PoseCard, SkeletonOverlay, AccuracyGauge, AlarmModal
│   │   ├── context/             # AuthContext, LanguageContext, ThemeContext
│   │   ├── i18n/                # en, hi, hinglish localization dictionaries
│   │   ├── lib/                 # angles.ts, poseRules.ts, speech.ts, identity.ts
│   │   ├── pages/               # Route-level lazy loaded pages (Landing, Login, Doctor, WorkoutRunner...)
│   │   └── test/                # Vitest & React Testing Library test suite
│   ├── package.json
│   ├── tailwind.config.js       # Palette: Teal, Sand, Coral + Instrument Serif & Fraunces fonts
│   └── vite.config.ts           # Vitest configuration & Rollup manual chunk code-splitting
├── docs/
│   ├── AI_USAGE.md              # Transparent AI disclosure (Antigravity & Gemma 4)
│   └── DEMO_SCRIPT.md           # 2-minute judge presentation script
└── README.md
```

---

## 🚀 Setup, Run & Test Commands

### 1. Backend Setup & Tests

```bash
cd backend

# Create virtual environment
python -m venv .venv

# Activate virtual environment
# Windows PowerShell:
.\.venv\Scripts\Activate.ps1
# macOS/Linux:
source .venv/bin/activate

# Install dependencies
pip install -r requirements.txt
pip install ruff pytest httpx

# Run Backend Tests
pytest -q

# Run Ruff Code Quality Lint
ruff check app

# Start Backend Server
uvicorn app.main:app --reload --port 8000
```
Backend runs at: [http://127.0.0.1:8000](http://127.0.0.1:8000) (Health check: `GET /api/health`).

### 2. Frontend Setup & Tests

```bash
cd frontend

# Install dependencies
npm install

# Run Frontend Unit Tests (Vitest + Testing Library)
npm test

# Build Production Bundles (TypeScript + Vite code-splitting)
npm run build

# Start Frontend Dev Server
npm run dev
```
Frontend runs at: [http://localhost:5173](http://localhost:5173).

---

## 🔑 Pre-Seeded Demo Accounts (1-Click Instant Sign-In)

The login screen includes instant 1-click demo accounts pre-seeded with 14 days of realistic clinical telemetry:

| Role | Name | Identifier | Pre-Seeded Clinical Telemetry |
|---|---|---|---|
| **Doctor / PT** | Dr. Aarav Mehta (PT) | `demo@yogsetu.test` | Full clinical portal managing Priya Sharma and Rajesh Patel |
| **Patient (Email)** | Priya Sharma | `priya.sharma@example.com` | 82% compliance, lumbar spine angles improving from 166° to 176°, 1 pain report |
| **Patient (Phone)** | Rajesh Patel | `9876543210` | 85% compliance, Vrikshasana tree pose stability tracking |
| **Self-Care User** | Ananya Verma | `ananya@example.com` | Independent practitioner with private, unshared routine |

---

## 🔒 Security Architecture & Production Requirements

### Current Demo-Mode Implementation
- **Passwordless Evaluation:** Login is identifier-based (`X-Demo-Identity`, `X-Demo-Role`) to allow judges to seamlessly toggle between patient and therapist views without SMS gateway dependencies.
- **Reset Guard:** `POST /api/seed/reset` is protected and returns `403 Forbidden` unless `DEMO_MODE=true` or `ALLOW_RESET=true`.
- **Input Sanitization & Limits:** Text inputs enforce a 1,000-character ceiling (`400 INPUT_TOO_LONG`). Multipart image uploads enforce mime-type whitelisting (`image/jpeg`, `image/png`, `image/webp`) and a strict 5 MB cap (`413 FILE_TOO_LARGE`).
- **Security Headers:** Middleware automatically enforces `X-Content-Type-Options: nosniff`, `X-Frame-Options: DENY`, and `Referrer-Policy: strict-origin-when-cross-origin`.

### Production Clinical Requirements
For a real-world hospital or HIPAA/DISHA deployment, the following must replace demo facilities:
1. **OAuth2 / OIDC & SMS OTP:** Verified multi-factor authentication (MFA) with encrypted JWT session cookies.
2. **End-to-End Encryption (E2EE):** Clinical notes and patient identifiers encrypted at rest using AES-256-GCM.
3. **Explicit Patient Consent Flow:** Explicit digital signature allowing a designated physician access to posture logs.

---

## ⚠️ Limitations & Future Work

1. **2D Single-Camera Perspective:** MediaPipe operates via standard 2D webcams. Deep transverse rotation (twisting) is difficult to measure without multi-camera arrays or depth sensors. Future iterations will support multi-view calibration.
2. **Non-Camera Supported Poses:** Relaxation poses like *Balasana* (Child's Pose) and *Shavasana* (Corpse Pose) currently utilize guided acoustic hold timers rather than skeletal landmark tracking, as prone floor poses obscure joint keypoints on a forward-facing camera.
3. **Wearable Sensor Integration:** Future work plans to integrate Bluetooth low-energy (BLE) IMU sensor bands (e.g., knee or lumbar bands) to augment optical tracking with high-precision acceleration and tilt telemetry.
4. **Physician Direct Chat & Tele-Consultation:** Extending the current WhatsApp report dispatch with direct in-app WebRTC video consultations for synchronized live review.
