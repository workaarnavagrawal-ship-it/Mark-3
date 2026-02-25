#!/bin/bash
set -euo pipefail

# Only run in remote (Claude Code on the web) environments
if [ "${CLAUDE_CODE_REMOTE:-}" != "true" ]; then
  exit 0
fi

APP_DIR="$CLAUDE_PROJECT_DIR/offr"

echo "==> Installing Next.js dependencies..."
cd "$APP_DIR"
npm install

echo "==> Installing Python dependencies..."
pip install -q fastapi uvicorn pandas pydantic google-genai

echo "==> Starting Next.js dev server on port 3000..."
nohup npm run dev -- --port 3000 > /tmp/next-dev.log 2>&1 &
echo "Dev server PID: $!"

echo "==> Session start complete."
