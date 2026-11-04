# Nalam — Multilingual Indic Clinical Intake & Triage OS

A responsive web application and mobile app (React Native + Expo) backed by a FastAPI + SQLite service that helps patients describe general health concerns in their native language (**English, Kannada, Hindi, or Tamil**, with architecture ready for all 22 Indian scheduled languages), producing a structured clinical summary for **healthcare professional triage and review**.

> **Safety Notice:** This is an educational proof-of-concept, not a clinically validated medical device. It never diagnoses, never recommends medication or dosages, and never concludes that a patient is "safe". Use **synthetic data only**.

```
nalam/
  apps/
    api/              FastAPI + SQLite (intake rules, safety scanner, clinical dashboard)
    mobile/           Expo + TypeScript + React Native app (patient intake, 0-10 severity, voice)
  services/           Self-hosted AI4Bharat IndicTrans2 (translation) + IndicConformer (STT)
  scripts/            Development orchestration & verification tooling (./scripts/dev.sh)
  docker-compose.yml  One-command container orchestration for backend & database
```

---

## 1. Feature Status & Verification

| Area | Status | Verification & Implementation |
|---|---|---|
| **Clinician Web Dashboard** (`/clinician`) | **Production-grade Web UI** | Fully responsive web dashboard: fixed sidebar, grouped navigation with active pills, topbar with `⌘ F` global search, mixed-treatment metric cards, categorical SVG bar chart with solid & patterned/striped bars, progress gauge, active session timer widget, duty team list, and slide-over review drawer. |
| **Mobile App: Unified Questionnaire** | **Verified** | All questions (core concern, onset, duration, severity, and conditional follow-ups) run in a **unified, cohesive card questionnaire**. Eliminated jarring mid-flow jumps to chat systems and fixed Back-button redirect loops. |
| **Health Rating (Severity Scale 0–10)** | **Verified** | Redesigned 2-row layout (`0–5` and `6–10`) with a prominent score readout badge, descriptive helper text, and an 11-segment color spectrum bar. Guaranteed 48px touch targets; `"10"` is clearly visible and never clipped on any screen size. |
| **Spoken Number Parsing** | **Working** | Spoken severity ratings parsed in English, Kannada, Hindi, and Tamil (e.g. `"ten"`, `"ಹತ್ತು"`, `"दस"`, `"பத்து"`). |
| **Backend API & Safety Engine** | **Optimized** | Async event-loop non-blocking (`asyncio.to_thread`), singleton model caching for Faster-Whisper, SQLite WAL mode with index optimizations, and dynamic multi-language uncertainty notes. |
| **Mobile App Compiles** | **Clean** | TypeScript `tsc --noEmit` compiles with **0 errors**; Web, Android, and iOS targets supported. |
| **Docker Orchestration** | **Ready** | `Dockerfile` and `docker-compose.yml` preconfigured for instant 1-command deployment. |

---

## 2. Quick Start: Running Web & Mobile

### Prerequisites
* **Python 3.10+** (Backend)
* **Node.js 18+ or 20+** (Mobile)
* **Expo Go** app on your phone (optional, for physical device testing)

---

### A. Run the Backend & Clinician Web Dashboard

```bash
cd backend

# 1. Create and activate a Python virtual environment
python3 -m venv .venv
source .venv/bin/activate       # Windows: .venv\Scripts\activate

# 2. Install dependencies
pip install -r requirements.txt

# 3. Start the FastAPI server
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

* **Clinician Web Dashboard:** [http://localhost:8000/clinician](http://localhost:8000/clinician)
  * **Default Username:** `clinician`
  * **Default Password:** `admin` *(configured in `backend/.env`)*
* **Interactive API Documentation:** [http://localhost:8000/docs](http://localhost:8000/docs)
* **Health Check Endpoint:** [http://localhost:8000/health](http://localhost:8000/health)

---

### B. Run the Mobile App (Expo / React Native)

Open a second terminal window:

```bash
cd mobile

# 1. Install Node dependencies
npm install

# 2. Start the Expo development server
npx expo start
```

* **Desktop Browser Preview:** Press `w` in your terminal or run `npx expo start --web` (opens [http://localhost:8081](http://localhost:8081)).
* **Physical Mobile Device (iOS / Android):** Open the **Expo Go** app and scan the QR code displayed in the terminal. Ensure phone and computer share the same Wi-Fi.
* **Android Emulator:** Press `a`.
* **iOS Simulator:** Press `i` (macOS).

---

### C. 1-Command Docker Setup

```bash
docker compose up --build
```
Access the clinician dashboard at [http://localhost:8000/clinician](http://localhost:8000/clinician).

---

## 3. Web UX: Clinician Triage Dashboard (`/clinician`)

The clinician interface is an enterprise-grade medical triage dashboard built with pure, self-contained HTML5, CSS3, and modern JavaScript:

### Design System & Layout Tokens
* **Color Palette:**
  * Canvas / Background: Light off-white (`#F8F9FA`).
  * Surfaces: Pure white container cards (`#FFFFFF`) with `18px`–`22px` rounded corners and diffused drop shadows.
  * Brand Accents: Deep forest green (`#064E3B`, `#022C22`) paired with vibrant mint green (`#10B981`, `#34D399`) and semantic alerts (Rose `#E11D48` for critical flags, Amber `#D97706` for warnings).
* **App Shell & Sidebar:**
  * Fixed left sidebar (`270px`) with medical pulse brand logo.
  * Grouped navigation sections (*Care & Triage*, *Analytics & Audit*, *System & AI Models*) with active state indicators (mint pill background + 4px vertical accent bar on the left).
  * Live badge count indicators for pending intakes and urgent alerts.
  * Bottom promotional container with a dark forest gradient and a high-contrast emergency protocol button.
* **Top Navigation Bar:**
  * Global search bar with live filtering and integrated keyboard shortcut badge (`⌘ F` / `Ctrl F`).
  * Right utility slots: Notification icon with unread badge, system status indicator, and on-duty clinician profile block (`Dr. Ananya Rao, MD · Attending Triage Lead`).
* **Metric Cards Grid:**
  * Row of 4 stat cards with mixed visual treatments: 1 solid dark primary accent card (`#064E3B` gradient with mint text and trend indicator) + 3 clean white cards with custom icon slots and micro-trends.
* **Data Visualizations:**
  * **Categorical Bar Chart:** Distribution chart across languages featuring alternating solid and patterned/striped bars (SVG `<pattern id="stripe-pattern">`), hover values, and category axis labels.
  * **Progress Gauge Component:** Semi-circular arc SVG progress ring showing intake completion rates (e.g. `78% Completed`) with segmented status legends.
  * **Media / Shift Timer Widget:** Dark card with an abstract wave gradient background, large monospaced digital clock display (`00:18:42`), and circular playback/pause/reset controls.
  * **Duty Staff Card:** User avatar thumbnails, names, specialties, and color-coded status pills (`On Duty`, `Reviewing`, `Available`, `On Call`).
  * **Actionable Alert Cards:** Compact cards highlighting emergency red-flag cases with inline `"Inspect Urgent Case"` buttons.
* **Slide-Over Detail Drawer:**
  * Smooth right-hand drawer with backdrop blur.
  * Side-by-side table comparing patient's original answers and English neural translations.
  * Severity rating meter and uncertainty disclaimers.
  * Editable clinician verification form fields (chief complaint, onset, duration, severity, symptoms, and clinical evaluation notes).
  * Direct API integration with `PUT /clinician/api/summaries/{id}` and `POST /clinician/api/summaries/{id}/review`.

---

## 4. Mobile UX & Questionnaire Architecture

### Unified Step-by-Step Flow
Previous prototypes abruptly switched from a 4-step card questionnaire into a chat-bubble interface upon reaching follow-up questions. The mobile application now features a **unified questionnaire architecture**:
1. **Consistent Intake:** All questions (chief complaint, onset, duration, health rating, and conditional follow-ups such as fever, pain, cough, or stomach) are answered sequentially in clean, focused question cards.
2. **Accurate Progress Steps:** The progress header dynamically reflects true progress through the full intake flow (`Step X of Y`) rather than resetting mid-way.
3. **Answered Question Chips:** Horizontal scrollable chips at the top allow patients to tap any previously answered question (`✓ Concern`, `✓ Started`, `✓ Duration`, `✓ Severity`) to inspect or edit their response.
4. **Intuitive Back Navigation:** Tapping Back walks backward question-by-question without infinite redirect loops.
5. **Seamless Review:** Once all questions are answered, the app transitions smoothly to the summary review screen (`/review`) where the patient confirms accuracy before final submission.

### Redesigned Health Rating (Severity Scale 0–10)
* **Score Readout Card:** Large score badge (`8 / 10`), severity category (`Severe`), and clinical description.
* **11-Segment Spectrum Bar:** Visual color meter from green (0) to dark red (10) showing the full spectrum.
* **2-Row Responsive Grid:**
  * Row 1: `0, 1, 2, 3, 4, 5` (Mild to Moderate)
  * Row 2: `6, 7, 8, 9, 10` (Severe to Critical)
  * Sized with 48px touch targets and dynamic text scaling so `"10"` is never clipped or wrapped.
* **Dual Tap & Voice Input:** Patients can tap the buttons or tap the microphone to speak their rating. Spoken number words in English, Kannada, Hindi, and Tamil are automatically converted into numeric scores.

---

## 5. Supported Languages

Current supported languages: **English**, **Kannada**, **Hindi**, and **Tamil**.

* `draft=True` indicates that non-English wording was AI-drafted and has not yet undergone native clinician review. Draft languages are flagged on the welcome screen and in all generated summaries.
* Red-flag detection operates conservatively using phrase matching and body-part/symptom co-occurrence pairs (`PAIRS`) in both native scripts and Romanized transliteration.

**To add a new language:**
1. `backend/app/languages.py`: Add language entry (`draft=True`).
2. `backend/app/questionnaire/questions.py`: Provide translations and hints.
3. `backend/app/questionnaire/safety.py`: Add red-flag keywords, pairs, negations, and urgent care messages.
4. `backend/app/questionnaire/rules.py`: Add follow-up trigger terms.
5. `mobile/constants/languages.ts`, `strings.ts`, `suggestions.ts`: Add mobile UI strings.
6. Verify parity by running `python -m pytest` or `test_mobile_parity.py`.

---

## 6. Backend Architecture & Performance Optimizations

* **FastAPI Lifespan & SQLite Initialization:** `init_db()` is called once on server startup, creating tables, enabling Write-Ahead Logging (`PRAGMA journal_mode=WAL`), and adding performance indexes on `sessions(created_at)`, `answers(session_id)`, `summaries(created_at)`, and `summaries(status)`. Subsequent connections no longer re-parse DDL scripts.
* **Async Event-Loop Offloading:** Heavy audio transcription (`stt.transcribe`) runs in a worker thread pool via `asyncio.to_thread`, ensuring FastAPI's asyncio event loop remains non-blocking for concurrent users.
* **Local Whisper Model Caching:** Implemented a singleton cache (`_LOCAL_MODELS`) with thread locking for `faster-whisper`, preventing multi-second model reload overhead on every audio chunk.
* **Dynamic Language Summaries:** Uncertainty notes correctly report the actual patient language (e.g. `machine-translated from Hindi` or `machine-translated from Tamil`) rather than hardcoding Kannada.
* **Clinician Review Route Safety:** `PUT /clinician/api/summaries/{id}` verifies review status before writing corrections, and supports optional `status` and search `q` query parameters.

---

## 7. Security and Privacy Guidelines

* **Synthetic Data Only:** This prototype stores health data unencrypted in local SQLite. Do not deploy with real patient data.
* **In-Memory Mobile Storage:** The mobile app stores answers in memory only; zero patient responses are persisted to local device storage.
* **No PII Collected:** Patients are not asked for names, phone numbers, or national identification numbers. Sessions are identified by random UUIDs.
* **Clinician Basic Auth:** Intended strictly for local development and demonstration. For clinical production, integrate multi-factor authentication (MFA), role-based access control (RBAC), database encryption (SQLCipher), and DPDP/HIPAA-compliant audit logs.
