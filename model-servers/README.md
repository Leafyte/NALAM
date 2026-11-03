# Model servers: IndicTrans2 (translation) + IndicConformer (speech-to-text)

These two small servers let the healthcare backend use AI4Bharat's open models for Indian languages.
You run them yourself, so **patient text and audio never go to a third-party service**.

```
phone app ──► backend (port 8000) ──► IndicTrans2 server (port 8001)   translation   Hindi/Tamil/Kannada/... ⇄ English
                                  └─► IndicConformer server (port 8002)  speech-to-text   22 Indian languages (no English)
```

## What was and was not tested (read this first)

| Piece | Status |
|---|---|
| Both servers' HTTP behaviour, API keys, error handling, language maps, long-text splitting, audio conversion with ffmpeg | **Tested** (40 automated tests) |
| Backend ⇄ servers wiring over real HTTP (URLs, `X-API-Key`, multipart upload of phone-style `.m4a`, language codes, error mapping) | **Tested** with the `fake` engine |
| `IndicTransToolkit` `preprocess_batch` / `postprocess_batch` for Hindi, Tamil, Kannada, English | **Tested** offline (and found two traps, see "Gotchas") |
| **Real model inference** (the actual IndicTrans2 / IndicConformer weights) | **NOT tested.** The build sandbox could not download model weights. The code follows the official model cards, but run Step 1 and Step 2 yourself and check real output |
| Translation / transcription **quality** for your patients | **Not evaluated.** Use `tools/review_sheet.py` and a clinician (see "Check the quality") |

## Step 0. Smoke-test the wiring in 5 minutes (no models, no downloads)

`ENGINE=fake` returns clearly labelled fake output, so you can prove everything is connected before downloading gigabytes.

```bash
# terminal 1: translation server (fake)
cd model-servers/indictrans2
python3 -m venv .venv && source .venv/bin/activate        # Windows: .venv\Scripts\activate
pip install fastapi "uvicorn[standard]" pydantic          # fake mode needs only these
ENGINE=fake uvicorn server:app --port 8001                # Windows PowerShell: $env:ENGINE="fake"; uvicorn server:app --port 8001

# terminal 2: speech server (fake). Needs ffmpeg installed (see Step 2)
cd model-servers/indicconformer
python3 -m venv .venv && source .venv/bin/activate
pip install fastapi "uvicorn[standard]" python-multipart
ENGINE=fake uvicorn server:app --port 8002

# terminal 3: check them
curl -s http://127.0.0.1:8001/health
curl -s -X POST http://127.0.0.1:8001/translate -H "Content-Type: application/json" \
     -d '{"text":"मुझे बुखार है","source":"hi","target":"en"}'
# -> {"translation":"[FAKE hin_Deva->eng_Latn] मुझे बुखार है", ...}
```

Then point the backend at them (`backend/.env`):

```ini
TRANSLATION_PROVIDER=indictrans2_http
INDICTRANS2_URL=http://127.0.0.1:8001/translate
STT_PROVIDER=indicconformer_http
INDICCONFORMER_URL=http://127.0.0.1:8002/transcribe
STT_ENGLISH_PROVIDER=none
```

Restart the backend and open `http://localhost:8000/api/services/status`: translation and speech-to-text should say
`available: true`, and speech `languages` should list `kn, hi, ta`. (English is missing on purpose: see "English speech".)

## Step 1. Real translation with IndicTrans2

You need Python 3.10-3.12. A GPU is optional; the default `dist-200M` checkpoints are the lightest. The first request
downloads the model from Hugging Face (needs internet and disk space; see the model page for sizes).

```bash
cd model-servers/indictrans2
python3 -m venv .venv && source .venv/bin/activate
pip install -r requirements.txt          # keep the transformers<4.50 pin, see Gotchas
PRELOAD=1 uvicorn server:app --host 127.0.0.1 --port 8001
```

Test with a real sentence (no `ENGINE=fake`):

```bash
curl -s -X POST http://127.0.0.1:8001/translate -H "Content-Type: application/json" \
     -d '{"text":"मुझे तीन दिन से बुखार है।","source":"hi","target":"en"}'
```

Expected: an English sentence about three days of fever. **Check it yourself**, then use the same `.env` as Step 0.

Options (environment variables): `INDICTRANS2_INDIC_EN` / `INDICTRANS2_EN_INDIC` to use the larger `-1B` checkpoints
(better quality, more memory), `DEVICE=cpu|cuda`, `NUM_BEAMS=2` (faster on CPU), `API_KEY=...` (see Security).

## Step 2. Real speech-to-text with IndicConformer

**This model is gated.** Before it will download you must:
1. Create a free Hugging Face account.
2. Open https://huggingface.co/ai4bharat/indic-conformer-600m-multilingual and accept the conditions.
3. On the server machine run `huggingface-cli login` (or set the `HF_TOKEN` environment variable).

Also install **ffmpeg** (phones record `.m4a`, ffmpeg converts it): Ubuntu `sudo apt install ffmpeg`, macOS
`brew install ffmpeg`, Windows `winget install ffmpeg`.

```bash
cd model-servers/indicconformer
python3 -m venv .venv && source .venv/bin/activate
pip install -r requirements.txt
# NVIDIA GPU only:  pip install "onnxruntime-gpu==1.20.1"
PRELOAD=1 uvicorn server:app --host 127.0.0.1 --port 8002
```

Test with a short Hindi recording (any audio file ffmpeg can read):

```bash
curl -s -X POST http://127.0.0.1:8002/transcribe -F "file=@hindi_sample.m4a" -F "language=hi"
```

Notes:
- Supported language codes: `as bn brx doi gu hi kn kok ks mai ml mni mr ne or pa sa sat sd ta te ur`. **No English.**
- It returns **no confidence score**, so `confidence` is `null` and the app tells the patient to double-check every transcript.
- `DECODER=ctc` (default) or `rnnt`: compare both on your own recordings.

### English speech
IndicConformer cannot transcribe English, so the backend routes English to another provider. Set one, for example:
```ini
STT_ENGLISH_PROVIDER=openai        # needs OPENAI_API_KEY (audio leaves your server), or
STT_ENGLISH_PROVIDER=local         # faster-whisper on the backend machine (pip install faster-whisper)
```
With `STT_ENGLISH_PROVIDER=none` (the default) the microphone is simply hidden for English and patients type.

## Security (important: this is health data)

- By default the servers bind to `127.0.0.1` (this machine only). Keep that if the backend runs on the same machine.
- If they run on another machine: set `API_KEY=<long random string>` on the server and the same value in the backend
  (`INDICTRANS2_API_KEY`, `INDICCONFORMER_API_KEY`), bind with `--host 0.0.0.0`, restrict the port with a firewall to the
  backend's IP, and **put HTTPS in front** (otherwise patient text travels unencrypted). A reverse proxy such as Caddy does this
  in a few lines (`translate.example.com { reverse_proxy 127.0.0.1:8001 }`; untested here).
- The servers never log request text or transcripts, and error messages never contain patient text. Check your reverse proxy and
  hosting provider's logging too.
- Do not use real patient data until you have done your own privacy and security review.

## Gotchas (found while building this)

| Symptom | Cause and fix |
|---|---|
| `ImportError: cannot import name 'PreTrainedTokenizerBase' from 'transformers.tokenization_utils'` | `transformers` 5.x. A plain `pip install transformers` installs 5.x, which breaks `IndicTransToolkit` 1.1.1. Use `pip install "transformers>=4.44,<4.50"` (already in `requirements.txt`) |
| `IndicProcessor.postprocess_batch(...)` hangs forever | `IndicProcessor` is **stateful**: `preprocess_batch` queues data that `postprocess_batch` waits for. Calling postprocess without a matching preprocess blocks. The server creates a fresh `IndicProcessor` per request and holds a lock, so one failed request can never corrupt the next. If you write your own code, keep that pairing |
| `503 model_unavailable` ... "gated" | You skipped the Hugging Face steps in Step 2 |
| `500 ffmpeg_missing` | Install ffmpeg on the server |
| `422 audio_decode_failed` | The upload is not audio, or is corrupt |
| `422 unsupported_language` on speech | You asked IndicConformer for English; see "English speech" |
| First request very slow | The model loads lazily. Start with `PRELOAD=1` |
| Out of memory | Use the `dist-200M` translation checkpoints; close other programs; try a GPU |
| Backend says `translation_failed` / `stt_failed` (502) | Server down, wrong URL, or wrong API key. Open the server's `/health` in a browser first |

## Check the quality (do this before trusting it)

Machine translation can silently change meaning, especially negations ("no chest pain") and numbers. Make a review sheet
with synthetic sentences and give it to a clinician who speaks the language:

```bash
python tools/review_sheet.py tools/sample_sentences.txt review.csv --url http://127.0.0.1:8001/translate
```

Open `review.csv` in Excel/Sheets, and have the reviewer fill `reviewer_ok` / `reviewer_correction`. Add your own sentences
(one per line: `hi<TAB>sentence`). Repeat for speech with real voices of your patient population (age, accent, noisy rooms).

## Other tools worth knowing about

- **Indic-Transcribe.** AI4Bharat's own IndicConformer page says Indic-Transcribe (25 Indian languages) has better quality and
  recommends it. It is **not integrated or tested here**. Because the backend only needs the `/transcribe` contract above, you can
  put a different model behind `indicconformer/server.py` (replace `HFEngine`) without touching the backend.
- **Indic Parler-TTS** (`ai4bharat/indic-parler-tts`, Apache-2.0): per its model card, text-to-speech for 20 Indic languages plus
  English (Hindi, Tamil, Kannada are among them). It would give you read-aloud on phones that have no voice for the language.
  **Not built yet:** it needs a `/api/tts` endpoint in the backend and audio playback in the app. Ask if you want it.
- **Whisper** (already supported via `STT_PROVIDER=openai|local`) is weaker for many Indian languages. Compare it with
  IndicConformer on your own recordings before choosing.
- Licences (check each model page before you ship): IndicTrans2 and IndicConformer are MIT per their model cards.
