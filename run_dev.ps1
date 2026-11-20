Write-Host "=============================================" -ForegroundColor Cyan
Write-Host "   Starting YogSetu Full-Stack Application   " -ForegroundColor Cyan
Write-Host "=============================================" -ForegroundColor Cyan

# Check backend venv
$BackendPython = Join-Path $PSScriptRoot "backend\.venv\Scripts\python.exe"
if (-not (Test-Path $BackendPython)) {
    Write-Host "Setting up Python virtual environment..." -ForegroundColor Yellow
    py -3.13 -m venv (Join-Path $PSScriptRoot "backend\.venv")
    & (Join-Path $PSScriptRoot "backend\.venv\Scripts\pip.exe") install -r (Join-Path $PSScriptRoot "backend\requirements.txt")
}

# Start backend in a separate background job or window
Write-Host "Starting FastAPI Backend on http://127.0.0.1:8000 ..." -ForegroundColor Green
$BackendProc = Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd '$PSScriptRoot\backend'; .\.venv\Scripts\uvicorn.exe app.main:app --reload --port 8000" -PassThru

# Start frontend in this window
Write-Host "Starting Vite React Frontend on http://localhost:5173 ..." -ForegroundColor Green
Set-Location "$PSScriptRoot\frontend"
npm run dev
