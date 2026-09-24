#!/usr/bin/env bash
# CampusEats API launcher (macOS / Linux)
set -e
python3 -m venv .venv 2>/dev/null || true
source .venv/bin/activate
pip install -q -r requirements.txt
echo "CampusEats API -> http://localhost:8000     docs -> http://localhost:8000/docs"
uvicorn main:app --reload --port 8000
