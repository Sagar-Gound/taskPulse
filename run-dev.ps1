# Launches TaskPulse backend and frontend in separate terminal windows
Start-Process pwsh -ArgumentList "-NoExit", "-Command", "python -m uvicorn app.main:app --app-dir backend --reload --port 8000"
Start-Process pwsh -ArgumentList "-NoExit", "-Command", "cd frontend; npm run dev"

