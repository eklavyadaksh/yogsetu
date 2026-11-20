# YogSetu: 2-Minute Judge Walkthrough & Demo Script

> **Positioning Statement:**  
> *"We do not replace the therapist. We show the therapist what happens at home."*

---

## ⏱️ Timeline Overview

| Time | Stage | Action / Highlights |
|---|---|---|
| **0:00 - 0:25** | **The Doctor's Dashboard** | Log in as Dr. Demo (`demo@yogsetu.test`), review 14-day patient compliance & pain flags. |
| **0:25 - 0:50** | **Gemma 4 Clinical Summary & WhatsApp Share** | Open Priya Sharma's report: review angle trends, read Gemma's factual summary, test WhatsApp link. |
| **0:50 - 1:15** | **New Assignment Flow** | Upload a prescription photo / type clinical goal: Gemma drafts plan; doctor fine-tunes before assigning. |
| **1:15 - 1:40** | **Patient Home Experience** | Log in as Priya (`priya.sharma@example.com`), launch Tadasana camera session with Hinglish audio feedback. |
| **1:40 - 2:00** | **Privacy Isolation (Normal User)** | Log in as Ananya (`ananya@example.com`), create a private self-routine; show that `source="self"` is never sent to doctors. |

---

## Detailed Step-by-Step Walkthrough

### 1. Doctor's Clinical Portal (0:00 - 0:25)
1. Open [http://localhost:5173/login](http://localhost:5173/login).
2. Click **"🩺 Dr. Demo"** in the *Try Demo Accounts* box (or enter `demo@yogsetu.test` and select "Doctor").
3. **What to point out to judges:**
   - The roster displays Priya Sharma (82% adherence) and Rajesh Patel (phone patient, 85% adherence).
   - Notice the **Red "Pain Report" Flag** next to Priya Sharma: immediately alerts the therapist before the patient even walks through the clinic door.

### 2. Clinical Telemetry & Gemma Summary (0:25 - 0:50)
1. Click on **Priya Sharma** to open her 14-Day Clinical Telemetry Report (`/doctor/report/priya.sharma@example.com`).
2. **Key highlights:**
   - **Gemma 4 Clinical Telemetry Summary**: 3 to 4 purely factual lines summarizing adherence, skipped sessions, pain occurrences, and posture angle stabilization.
   - **Pain Reports Box**: Highlights Day 9 ("Mild tingling in lower back while arching up in Bhujangasana").
   - **14-Day Calendar Compliance Grid**: Visual green/red/gray badges showing exactly when sessions happened.
   - **Angle Trends (Recharts)**: Demonstrates that Priya's spinal extension in Tadasana steadily improved from 166.0° to 176.5°.
   - **Sharing**: Click **"Send on WhatsApp"** (if phone) or **"Copy Summary"** (if email) to share with the patient or medical records. Click **"Print Report"** to view the clean printable layout.

### 3. Prescribing with Gemma 4 (0:50 - 1:15)
1. Click **"New Assignment"** in the top bar.
2. Enter patient identifier: `9876543210` (or a test email).
3. Select **"Prescription Photo"** (or **"Type Clinical Goal"**).
4. Type: *"Postural alignment and lower back decompression for remote worker"* and click **"Draft with Gemma 4"**.
5. **Notice:**
   - Gemma drafts a structured routine using ONLY approved poses from the clinical library (`tadasana`, `marjaryasana_bitilasana`, etc.).
   - The doctor can adjust hold seconds, set counts, and days of week (Mon-Sun toggles).
   - **Crucial Rule:** Nothing reaches the patient until the doctor clicks **"Assign to Patient"**.

### 4. Patient Home Experience (1:15 - 1:40)
1. Log out and click **"👤 Priya"** in demo accounts (or enter `priya.sharma@example.com` as Normal User).
2. **Auto-Redirect:** Because Priya has an active prescription from Dr. Demo, she is automatically redirected to `/assigned` (**"Today's Prescribed Routine"**).
3. The badge **"Shared with your doctor"** is clearly visible.
4. Click **"Start Pose"** on **Tadasana**:
   - The browser webcam activates with on-device MediaPipe PoseLandmarker.
   - The skeleton overlay glows green when posture is vertically aligned, or amber/red when bent.
   - **The Hold Timer ticks ONLY when posture is aligned!**
   - The **Hinglish Voice Coach** speaks: *"Reeda seedhi rakhein aur dono pairo par samaan vajan rakhein."*
   - Add `?debug=1` to the URL to show judges raw joint angles and confidence metrics.
5. Click **"Pain, I stopped"**:
   - A modal allows the patient to explain discomfort. Logging pain safely ends the session and flags the incident in the doctor's portal.

### 5. Normal User Mode & Privacy Isolation (1:40 - 2:00)
1. Click **"Use as normal user (my own plan)"** or log in as **"🧘 Ananya"** (`ananya@example.com`).
2. Point out the badge: **"Only you can see this"**.
3. Normal users can ask Gemma 4 for routines (e.g. *"Homemaker, only 30 minutes in morning"*).
4. **Privacy Isolation Verification:**
   - Sessions completed in self-mode are tagged with `source="self"`.
   - Run the backend test: `pytest tests/test_reports.py` — it mathematically proves that `source="self"` sessions are strictly filtered out and never leak into doctor reports.
5. Open **"Daily Reminder"** in the top bar to test the temple bell acoustic chime.
