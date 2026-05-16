#!/usr/bin/env bash
# ParquetPeek desktop launcher (macOS / Linux)
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

# 1. Frontend build
if [ ! -f "$ROOT/frontend/dist/index.html" ]; then
    echo "[1/3] Building frontend..."
    cd "$ROOT/frontend"
    [ -d node_modules ] || npm install
    npm run build
else
    echo "[1/3] Frontend already built (skipping)"
fi

# 2. venv
if [ ! -f "$ROOT/backend/.venv/bin/activate" ]; then
    echo "[2/3] Creating venv & installing requirements..."
    python3 -m venv "$ROOT/backend/.venv"
    # shellcheck disable=SC1091
    source "$ROOT/backend/.venv/bin/activate"
    pip install -r "$ROOT/backend/requirements.txt"
else
    echo "[2/3] Activating venv"
    # shellcheck disable=SC1091
    source "$ROOT/backend/.venv/bin/activate"
fi

# 3. Launch
echo "[3/3] Launching ParquetPeek..."
cd "$ROOT/backend"
python run_desktop.py
