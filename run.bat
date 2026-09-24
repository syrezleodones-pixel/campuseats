@echo off
REM CampusEats API launcher (Windows)
python -m venv .venv
call .venv\Scripts\activate
pip install -q -r requirements.txt
echo CampusEats API -^> http://localhost:8000     docs -^> http://localhost:8000/docs
uvicorn main:app --reload --port 8000
