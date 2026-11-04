#!/usr/bin/env bash
# ==============================================================================
# Nalam - Development Orchestrator
# Starts backend, mock/real AI model servers, and mobile client
# ==============================================================================
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT_DIR"

echo "=================================================="
echo "  🌿 Nalam - Clinical Intake & Triage OS  "
echo "=================================================="

usage() {
  echo "Usage: ./scripts/dev.sh [command]"
  echo ""
  echo "Commands:"
  echo "  all          Start Backend + Mock AI Model Servers + Mobile Client"
  echo "  backend      Start FastAPI core backend on :8000"
  echo "  mobile       Start Expo mobile development server"
  echo "  web          Serve standalone Web Clinician Dashboard"
  echo "  ai-mock      Start lightweight AI4Bharat mock servers (:8001, :8002)"
  echo "  check        Run TypeScript and Python syntax checks"
  echo ""
  exit 1
}

MODE="${1:-all}"

case "$MODE" in
  backend)
    echo "Starting Nalam Backend API on http://localhost:8000..."
    cd "$ROOT_DIR/backend"
    uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
    ;;

  mobile)
    echo "Starting Nalam Mobile App (Expo)..."
    cd "$ROOT_DIR/mobile"
    npx expo start
    ;;

  web)
    echo "Serving Nalam Web Dashboard on http://localhost:3000..."
    cd "$ROOT_DIR/web"
    NODE_BIN="$(command -v /usr/local/bin/node || command -v node)"
    "$NODE_BIN" -e "const http = require('http'); const fs = require('fs'); const path = require('path');
http.createServer((req, res) => {
  let file = req.url === '/' ? '/index.html' : req.url.split('?')[0];
  let filePath = path.join(__dirname, file);
  if (!fs.existsSync(filePath)) { res.writeHead(404); res.end('Not Found'); return; }
  let ext = path.extname(filePath);
  let ct = ext === '.html' ? 'text/html' : ext === '.css' ? 'text/css' : ext === '.js' ? 'text/javascript' : ext === '.ts' ? 'text/javascript' : 'application/octet-stream';
  res.writeHead(200, { 'Content-Type': ct });
  fs.createReadStream(filePath).pipe(res);
}).listen(3000, () => console.log('Dashboard ready at http://localhost:3000'));"
    ;;

  ai-mock)
    echo "Starting AI4Bharat IndicTrans2 Mock on :8001..."
    ENGINE=fake uvicorn server:app --app-dir "$ROOT_DIR/model-servers/indictrans2" --host 127.0.0.1 --port 8001 &
    PID_TRANS=$!
    echo "Starting AI4Bharat IndicConformer Mock on :8002..."
    ENGINE=fake uvicorn server:app --app-dir "$ROOT_DIR/model-servers/indicconformer" --host 127.0.0.1 --port 8002 &
    PID_ASR=$!

    trap "kill $PID_TRANS $PID_ASR 2>/dev/null || true" EXIT INT TERM
    wait
    ;;

  check)
    echo "Verifying Python syntax..."
    PY_BIN="$(command -v /usr/bin/python3 || command -v python3)"
    "$PY_BIN" -m py_compile backend/app/main.py backend/app/api/sessions.py model-servers/indicconformer/server.py
    echo "Verifying Mobile TypeScript..."
    NODE_BIN="$(command -v /usr/local/bin/node || command -v node)"
    cd "$ROOT_DIR/mobile" && "$NODE_BIN" ./node_modules/typescript/bin/tsc --noEmit
    echo "Verifying Web Dashboard TypeScript..."
    cd "$ROOT_DIR" && "$NODE_BIN" mobile/node_modules/typescript/bin/tsc --project web/tsconfig.json --noEmit
    echo "✅ All checks passed!"
    ;;

  all)
    echo "Launching full Nalam development stack..."
    echo "  -> API:      http://localhost:8000"
    echo "  -> Portal:   http://localhost:8000/clinician"
    echo "  -> Docs:     http://localhost:8000/docs"
    echo ""
    echo "Run services in separate terminals:"
    echo "  1. Backend: ./scripts/dev.sh backend"
    echo "  2. Mobile:  ./scripts/dev.sh mobile"
    echo "  3. AI Mock: ./scripts/dev.sh ai-mock"
    ;;

  *)
    usage
    ;;
esac
