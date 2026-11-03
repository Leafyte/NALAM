# Multilingual General Healthcare Assistant (educational prototype)

A mobile app (React Native + Expo) and API (FastAPI + SQLite) that helps a patient describe a general
health concern in **English, Kannada, Hindi or Tamil** (more languages can be added, see §2a), then produces a structured summary for a **healthcare
professional to review**.

> **Safety:** this is a proof of concept, not a clinically validated product. It never diagnoses,
> never recommends medication or doses, and never says a patient is "safe". Use **synthetic data only**.

```
HealthAssistant/
  backend/   FastAPI + SQLite (questionnaire rules, summary, STT/translation interfaces, clinician page)
  mobile/    Expo + TypeScript + Expo Router app
  model-servers/   self-hosted AI4Bharat IndicTrans2 (translation) + IndicConformer (speech) servers, see its README
```

## 1. Status of every feature (from tests actually run)

| Area | Status | How it was checked |
|---|---|---|
| Backend API, questionnaire rules, summary, safety scan, clinician workflow | **Working** | 106 backend + 40 model-server automated tests pass (backend and mobile language lists are checked against each other); live `curl` smoke test of the running server |
| Mobile app: compiles | **Verified** | `tsc --noEmit` clean; `expo export --platform android` (Metro/Hermes bundle) succeeded |
| Mobile app: UI flow in a browser | **Verified** | Web build driven end to end with a headless browser (English at 390px, Kannada at 360px) against the live backend: welcome, consent, questions, quick options, urgent bar, chat, review, submit, summary. Screenshots in `docs/screenshots/` (desktop browser rendering; fonts differ from a phone) |
| Mobile app: runs on a real phone/emulator (mic, read-aloud, keyboard behaviour, safe areas) | **NOT tested by me** | No device was available. The mic, `expo-speech` and Android keyboard handling only exist on a device |
| Hindi and Tamil: questions, urgent-care message, red-flag detection, follow-ups, UI | **Working as DRAFTS** | pytest (red flags, negation, triggers, full flow); Hindi and Tamil flows driven in a headless browser at 360px. **Wording was written by an AI and has not been checked by a native-speaking clinician** |
| Text questionnaire EN/KN, follow-ups, edit, review, summary | **Working (backend)** / untested on device | pytest covers the logic; UI not exercised on a device |
| Original answer preserved when edited/translated | **Working** | pytest |
| Model servers (`model-servers/`): HTTP contract, API keys, audio conversion, wiring to the backend over real HTTP | **Working with a `fake` engine** | 40 tests, including two real servers driven through the real backend; README commands run as written |
| Real IndicTrans2 / IndicConformer model output | **NOT tested** | The build sandbox could not download model weights. Follow `model-servers/README.md` Steps 1-2 and check real output |
| Speech-to-text | **Partially integrated** | Service interface + `openai` and `local` (faster-whisper) providers written but **never run** (no API key / model here). `mock` provider and the "unavailable" path are tested |
| Translation Kannada→English | **Partially integrated** | `google` and `indictrans2_http` providers written but **never run**. `mock` (clearly labelled) and the "unavailable" path are tested |
| Text-to-speech | **Untested** | Uses the phone's own voices via `expo-speech`. The app checks for a Kannada voice and tells the user if none exists |
| Clinician review (web page) | **Working (API)**, page untested in a browser | API workflow in pytest; page JS syntax-checked only |
| Deployment / EAS build | **Not attempted** | Documented below, nothing deployed |

By default `STT_PROVIDER=none` and `TRANSLATION_PROVIDER=none`: the app works fully with typing, the mic
is hidden, and Kannada answers are shown in the original language with a note that no translation exists.

## 2a. Languages

Supported now: **English** (source language), **Kannada, Hindi, Tamil** (all *draft*).
`draft` means the wording was drafted by an AI and **not** checked by a native-speaking clinician. Draft languages are
labelled on the welcome screen and every summary for them carries an "UNREVIEWED DRAFT" uncertainty note.
Treat red-flag detection in draft languages as a helpful extra net, never as a safety guarantee.

**Add a language** (all 22 scheduled languages have translation and speech models available; the work is the wording):
1. `backend/app/languages.py`: add an entry (set `draft=True`).
2. `backend/app/questionnaire/questions.py`: text (and hint) for every question.
3. `backend/app/questionnaire/safety.py`: red-flag phrases, body-part/symptom `PAIRS`, negation and "and/but" words, urgent message.
4. `backend/app/questionnaire/rules.py`: follow-up trigger words.
5. `mobile/constants/languages.ts`, `strings.ts` (the compiler fails if a key is missing), `suggestions.ts`.
6. Run `python -m pytest`. `test_languages.py` and `test_mobile_parity.py` fail if any piece is missing or the two sides disagree.
7. Have a native-speaking clinician review 2-5, then set `draft=False` (backend and mobile).

Things the code does NOT handle yet for more languages: right-to-left layout (Urdu, Kashmiri, Sindhi), a searchable
language picker (the welcome screen shows a grid, fine up to about 8 languages), fonts for Ol Chiki (Santali) and
Meetei Mayek (Manipuri), and server-side text-to-speech (read-aloud uses the phone's voices, which may not exist for a language).

## 2. Backend

Requirements: Python 3.10+.

```bash
cd backend
python3 -m venv .venv
source .venv/bin/activate            # Windows: .venv\Scripts\activate
pip install -r requirements.txt
cp .env.example .env                 # then edit .env (placeholders only in the example)
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

- Interactive API docs: http://localhost:8000/docs
- Tests: `python -m pytest -q`
- `--host 0.0.0.0` is required so a phone on your Wi-Fi can reach it.

### Environment variables (`backend/.env`)

| Variable | Meaning |
|---|---|
| `HEALTH_DB_PATH` | SQLite file (default `./data/health.db`) |
| `CLINICIAN_USERNAME` / `CLINICIAN_PASSWORD` | HTTP Basic login for the clinician page. **Empty password = clinician interface disabled** |
| `STT_PROVIDER` | `none` \| `openai` \| `local` \| `indicconformer_http` \| `mock` |
| `INDICCONFORMER_URL`, `INDICCONFORMER_API_KEY` | for `indicconformer_http`, see `model-servers/README.md` |
| `STT_ENGLISH_PROVIDER` | `none` \| `openai` \| `local` \| `mock`: IndicConformer has no English, so English speech is routed here |
| `OPENAI_API_KEY`, `OPENAI_STT_MODEL` | for `openai` (Whisper API) |
| `LOCAL_WHISPER_MODEL` | for `local`; also run `pip install faster-whisper` |
| `STT_LOW_CONFIDENCE` | below this (0–1) a transcript is flagged as uncertain (default 0.6) |
| `TRANSLATION_PROVIDER` | `none` \| `google` \| `indictrans2_http` \| `mock` |
| `GOOGLE_TRANSLATE_API_KEY` | for `google` (Cloud Translation v2) |
| `INDICTRANS2_URL`, `INDICTRANS2_API_KEY` | for `indictrans2_http`, see `model-servers/README.md` |
| `CORS_ORIGINS` | only needed for Expo Web |

`mock` providers return text prefixed `[MOCK TRANSCRIPT]` / `[MOCK TRANSLATION]` and are flagged in the
summary. They exist only to demo the flow without credentials.

### Using AI4Bharat models (IndicTrans2 + IndicConformer)
Self-hosted servers for Indian-language translation and speech are in **`model-servers/`**, with a step-by-step guide
(`model-servers/README.md`): a 5-minute wiring smoke test with no downloads, then the real models, security, troubleshooting
and a review-sheet tool so a clinician can check translation quality. Heads-up from that work: `pip install transformers`
installs 5.x, which breaks `IndicTransToolkit`; the servers pin `transformers<4.50`.

### Endpoints
`GET /health` · `POST /api/sessions` · `GET /api/sessions/{id}` · `GET /api/sessions/{id}/next` ·
`POST /api/sessions/{id}/answers` (save **or edit**) · `POST /api/sessions/{id}/submit` ·
`GET /api/sessions/{id}/summary` · `POST /api/transcribe` · `POST /api/translate` ·
`GET /api/services/status` · clinician (Basic auth): `GET /clinician`, `GET|PUT /clinician/api/summaries[/{id}]`,
`POST /clinician/api/summaries/{id}/review`.

### Clinician interface (screen 6)
Open `http://localhost:8000/clinician` after setting `CLINICIAN_PASSWORD`. It lists submissions, shows
original vs machine-translated answers side by side, lets the clinician correct the summary (the
system-generated copy is never overwritten) and mark it reviewed. **Local prototype only.**

### How the questionnaire works
Fixed questions: concern → onset → duration → severity (0–10, optional) → conditional follow-ups
(fever / pain / cough-breathing / vomiting-stomach, chosen by keyword rules in English, Kannada script and
Roman-script Kannada) → other symptoms → anything else. No AI chooses questions.
The summary is rule-based and only restates answers; missing fields say **"Not provided."**

### Red-flag handling
`app/questionnaire/safety.py` scans every answer for serious symptoms (chest pain, trouble breathing,
fainting, seizure, severe bleeding, stroke signs, self-harm, poisoning, severe allergy, snake/dog bite) and
shows a persistent "seek urgent care, call 112" banner. Negated mentions ("no chest pain", "ಎದೆ ನೋವು ಇಲ್ಲ")
do not trigger the banner but are listed for the clinician. Ambiguous cases such as "no fever and chest pain"
are flagged on purpose. It can only add caution; it never concludes a patient is fine.

## 3. Mobile app

Requirements: Node 20+, the **Expo Go** app on your phone (or an Android emulator / iOS simulator).

```bash
cd mobile
npm install
npx expo start
```
Scan the QR code with Expo Go (or press `w` to preview in a browser). Screens: Welcome + consent → Questionnaire (one question at a time) →
Follow-up chat → Review/edit/confirm → Summary. The clinician view is the backend web page.

### UI notes
Pinned Continue/Send buttons, step progress (core questions are a stable 4 steps; follow-ups are counted separately),
a Back button, tappable chips for answers already given, tap-to-fill quick options (English/Kannada) for common answers,
a colour-coded 0-10 severity scale, a slim urgent bar with a one-tap "Call 112", and an at-a-glance summary.
Quick-option wording lives in `mobile/constants/suggestions.ts` and UI text in `mobile/constants/strings.ts`.

### Connecting the phone to the backend
`localhost` on a phone is the phone itself. The app therefore picks the backend URL in this order:
1. `EXPO_PUBLIC_API_URL` if set (put it in `mobile/.env`), 2. `http://<your computer's IP>:8000`, taken from
the Expo dev server address, 3. `http://10.0.2.2:8000` on the Android emulator.
Your phone and computer must be on the **same Wi-Fi**, and your firewall must allow port 8000. The Welcome
screen prints the URL it is using. If it cannot connect it says so instead of failing silently.

For a deployed backend use HTTPS and set `EXPO_PUBLIC_API_URL=https://your-backend.example.com`.

### Voice and read-aloud
- Microphone: `expo-audio` records an `.m4a`, the backend transcribes it, the text appears in the answer box
  so the patient can correct it. Low confidence and mock transcripts are flagged. Needs a configured
  `STT_PROVIDER`; otherwise the mic button is replaced by a message.
- Read aloud: `expo-speech`. Kannada voices are often missing on phones; the app tells the user when so.
- Whisper's Kannada accuracy is limited. Treat every transcript as untrusted until the patient confirms it.

### Production build (EAS)
```bash
npm install -g eas-cli
eas login
eas build:configure                 # check eas.json; set EXPO_PUBLIC_API_URL to your HTTPS backend
eas build --platform android --profile preview
```
Not attempted here. Change the placeholder `bundleIdentifier` / `package` (`com.example.healthassistant`) in `app.json` first.

## 4. Deployment notes
- **Backend**: any Python host (Render, Railway, Fly.io, a VM). Start command:
  `uvicorn app.main:app --host 0.0.0.0 --port $PORT`. Set env vars in the host's dashboard, never in the repo.
- **SQLite** is fine locally. Most free hosts have **ephemeral disks**, so data vanishes on redeploy; use
  PostgreSQL for anything persistent. Migration path: keep the three tables in `app/db.py`, replace that module
  with SQLAlchemy/psycopg and change `?` placeholders to the driver's style.
- Never deploy the clinician page, or any instance holding real patient data, with the prototype's auth.

## 5. Security and privacy limitations (read before any real use)
- No patient accounts. A session ID (random UUID) is the only secret protecting a patient's own summary.
- Clinician auth is a single shared HTTP Basic password. No roles, audit log, lockout or MFA.
- Health data is stored **unencrypted** in SQLite. No retention/deletion policy, no backup, no consent record beyond a timestamp.
- Name/phone are not asked for, but patients can type anything in free text.
- Server code avoids logging request bodies; hosting platforms and uvicorn access logs still record URLs.
- Audio is sent to the STT provider you configure; the audio file is not stored by this backend (not persisted), but the provider's own retention rules apply. The same applies to text sent to a translation provider.
- Phone side: answers are held in memory only, nothing is written to device storage.
- Red-flag and negation logic is keyword based and will miss paraphrases, misspellings, dialect words and many spelling variants, especially in Kannada, Hindi and Tamil. Roman-script (typed-in-English-letters) Hindi/Tamil/Kannada is only partly covered.
- **All Kannada, Hindi and Tamil text (questions, UI, urgent message, keyword lists) was written by an AI without native-speaker review.** Have a clinician who speaks each language review it before any real use.
- Compliance (India's DPDP Act, HIPAA, clinical safety review) has not been assessed.

## 6. Known issues / not done
- Mobile app never run on a real device or emulator by the author of this code.
- STT, Google/IndicTrans2 translation: written, not run against real services.
- Severity accepts digits only (including Kannada digits); no spoken-number parsing.
- Backend does not do text-to-speech (done on-device).
- No pagination or search in the clinician list; no database migrations tool.
- Keyword triggers can over-trigger follow-ups (for example "cold" triggers the cough question). That is intentional and conservative.
