# AI Usage Disclosure

In compliance with hackathon transparency guidelines and ground rules, this document provides an honest and complete account of the AI tools, models, and workflows used in the design, development, and runtime operations of **YogSetu ("योगसेतु")**.

---

## 1. Development & Engineering Assistant

* **Coding Environment**: [Google Antigravity IDE](https://deepmind.google/technologies/)
* **AI Model**: **Gemini 3.8 Flash (High)** by Google DeepMind
* **Role**: Senior Full-Stack Pair Programming Engineer
* **Scope of Autonomous Engineering**:
  - Full project scaffolding: backend FastAPI service and React + Vite frontend monorepo architecture.
  - Designing SQLite relational models and Pydantic v2 schemas.
  - Compiling the 10-pose therapeutic library (`poses.json`) with bilingual anatomical cues.
  - Implementing multi-lingual red-flag medical symptom filters in Hindi, English, and Hinglish (`safety.py`).
  - Integrating browser-based MediaPipe PoseLandmarker with offline WASM and Lite models.
  - Authoring comprehensive pytest suites for identity normalization, safety regex, adherence telemetry, and privacy isolation.
  - Designing high-contrast, calm clinical UI with Tailwind CSS and Fraunces/DM Sans typography.

---

## 2. In-App Runtime AI: Gemma 4 Vision & Analysis

YogSetu runs in hackathon category **"Best Use of Gemma 4"** through the official Google GenAI Python SDK (`google-genai`).

Gemma 4 performs three critical tasks in the therapeutic loop:

1. **Prescription Note & Exercise Sheet OCR / Entity Mapping**:
   - Reads doctor handwritten or typed exercise sheets directly from camera/upload in memory.
   - Strictly maps detected therapeutic movements to clinically validated poses in the library. Unrecognized items are flagged under `not_covered`.
2. **Personalized Therapeutic Routine Generation**:
   - Synthesizes goal-oriented stretching plans (e.g. "desk worker with lumbar stiffness, 15 minutes in morning") into structured JSON routines.
   - Customizes hold durations, sets, and parental presence cues based on age group (`child`, `senior`, `adult`).
3. **Objective Clinical Telemetry Summaries**:
   - Generates 3 to 4 factual summary lines for the physician based strictly on 14-day recorded session logs.
   - Refrains from making unverified medical cure claims, focusing purely on adherence %, angle changes, and pain flags.
4. **Resilient Stage Presentation Mode (`DEMO_MODE=true`)**:
   - If an API key is not yet configured or internet drops on stage, an intelligent deterministic rules engine falls back seamlessly so the demo never fails for judges.

---

## 3. Human Oversight & Code Integrity

* All code in this repository was written fresh for this hackathon with zero copy-pasting from older repositories.
* Secrets and API keys are strictly kept in `backend/.env` (git-ignored) with sanitized templates provided in `.env.example`.
* No patient video, camera frames, or biometric recordings ever leave the user's browser: MediaPipe runs 100% on-device.
