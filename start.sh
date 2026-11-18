#!/usr/bin/env bash
set -e

DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
cd "$DIR"

echo "=========================================================="
echo " Starting CastVoice — Full-Cast Audio Play Platform"
echo "=========================================================="

# Check venv
if [ ! -d "venv" ]; then
    echo "Creating virtual environment..."
    python3 -m venv venv
    ./venv/bin/pip install -r backend/requirements.txt audioop-lts
fi

# Ensure .env exists
if [ ! -f ".env" ]; then
    echo "Creating .env from .env.example..."
    cp .env.example .env
fi

# Ensure sound library exists
if [ ! -f "data/sound_library/rain.wav" ]; then
    echo "Generating starter Foley sound library..."
    PYTHONPATH=backend ./venv/bin/python3 backend/app/services/generate_starter_sounds.py
fi

# Ensure frontend is built
if [ ! -f "frontend/dist/index.html" ]; then
    echo "Building frontend..."
    cd frontend && npm install && npm run build && cd ..
fi

# Determine configured port
PORT=$(grep -E '^PORT=' .env 2>/dev/null | cut -d '=' -f2 | tr -d ' "\r' || echo "8000")
PORT=${PORT:-8000}

# Free port if already in use by a previous instance
OLD_PIDS=$(lsof -ti :$PORT 2>/dev/null || true)
if [ -n "$OLD_PIDS" ]; then
    echo "Port $PORT is currently in use. Stopping previous instance (PID: $OLD_PIDS)..."
    kill -9 $OLD_PIDS 2>/dev/null || true
    sleep 1
fi

echo ""
echo "🚀 Server launching at: http://localhost:$PORT"
echo "Press Ctrl+C to stop."
echo ""

PYTHONPATH=backend ./venv/bin/python3 backend/app/main.py
