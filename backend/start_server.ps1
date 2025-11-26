# Minitake Backend Startup Script
# This script activates the virtual environment and starts the backend server

# Navigate to the app directory
Set-Location -Path "D:\Minitake\app"

# Activate virtual environment
& ".\.venv\Scripts\Activate.ps1"

# Navigate to backend directory
Set-Location -Path "backend"

# Start the server
uvicorn server:app --reload --host 0.0.0.0 --port 8000
