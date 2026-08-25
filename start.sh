#!/bin/bash
set -e

echo "========================================="
echo "  Scholar — AI Academic OS"
echo "  Starting up on Replit..."
echo "========================================="

# ── 1. Python backend setup ──────────────────
echo ""
echo "[1/4] Setting up Python environment..."
cd backend

if [ ! -d "venv" ]; then
  python3 -m venv venv
fi

source venv/bin/activate
pip install -r requirements.txt --quiet

# Check for API key
if [ -z "$ANTHROPIC_API_KEY" ]; then
  echo ""
  echo "⚠️  WARNING: ANTHROPIC_API_KEY is not set."
  echo "   Go to Replit Secrets (lock icon in sidebar) and add:"
  echo "   Key: ANTHROPIC_API_KEY"
  echo "   Value: your sk-ant-... key"
  echo ""
fi

# Write .env from Replit secrets
echo "ANTHROPIC_API_KEY=${ANTHROPIC_API_KEY:-missing}" > .env
echo "CHROMA_PERSIST_DIR=./chroma_db" >> .env

echo "[2/4] Starting FastAPI backend on port 8000..."
uvicorn main:app --host 0.0.0.0 --port 8000 &
BACKEND_PID=$!

# ── 2. Frontend setup ────────────────────────
cd ..

echo "[3/4] Installing frontend dependencies..."
npm install --silent

echo "[4/4] Starting Next.js frontend on port 3000..."
npm run dev &
FRONTEND_PID=$!

# ── 3. Wait for both ─────────────────────────
echo ""
echo "========================================="
echo "  ✅ Scholar is running!"
echo "  Open the Webview tab above ↑"
echo "========================================="
echo ""

# Keep script alive; kill children on exit
trap "kill $BACKEND_PID $FRONTEND_PID 2>/dev/null" EXIT
wait
