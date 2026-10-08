# Welcome-Craft Development Startup Script
Write-Host "🚀 Starting Welcome-Craft Development Environment..." -ForegroundColor Green

# Check if .env file exists in backend
if (-not (Test-Path ".\backend\.env")) {
    Write-Host "⚠️  .env file not found in backend directory!" -ForegroundColor Yellow
    Write-Host "📝 Please copy .env.example to .env and configure your environment variables" -ForegroundColor Yellow
    Write-Host "   cp backend\.env.example backend\.env" -ForegroundColor Cyan
    exit 1
}

# Check if .env file exists in frontend
if (-not (Test-Path ".\frontend\.env")) {
    Write-Host "⚠️  .env file not found in frontend directory!" -ForegroundColor Yellow
    Write-Host "📝 Please copy .env.example to .env and configure your environment variables" -ForegroundColor Yellow
    Write-Host "   cp frontend\.env.example frontend\.env" -ForegroundColor Cyan
}

Write-Host "📦 Installing dependencies..." -ForegroundColor Blue

# Install backend dependencies
Write-Host "🔧 Installing backend dependencies..." -ForegroundColor Yellow
Set-Location ".\backend"
npm install
if ($LASTEXITCODE -ne 0) {
    Write-Host "❌ Backend dependency installation failed!" -ForegroundColor Red
    exit 1
}

# Install frontend dependencies
Write-Host "🔧 Installing frontend dependencies..." -ForegroundColor Yellow
Set-Location "..\frontend"
npm install
if ($LASTEXITCODE -ne 0) {
    Write-Host "❌ Frontend dependency installation failed!" -ForegroundColor Red
    exit 1
}

Set-Location ".."

Write-Host "✅ Dependencies installed successfully!" -ForegroundColor Green

# Start the development servers
Write-Host "🌟 Starting development servers..." -ForegroundColor Blue

# Start backend in a new window
Write-Host "🔙 Starting backend server on port 8081..." -ForegroundColor Yellow
Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd '.\backend'; npm start"

# Wait a moment for backend to start
Start-Sleep -Seconds 3

# Start frontend in a new window
Write-Host "🎨 Starting frontend server..." -ForegroundColor Yellow
Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd '.\frontend'; npm start"

Write-Host "🎉 Development environment started!" -ForegroundColor Green
Write-Host "📱 Backend API: http://localhost:8081" -ForegroundColor Cyan
Write-Host "🌐 Frontend App: http://localhost:3000" -ForegroundColor Cyan
Write-Host "🔍 Health Check: http://localhost:8081/health" -ForegroundColor Cyan

Write-Host ""
Write-Host "🔧 Useful commands:" -ForegroundColor Magenta
Write-Host "   - Initialize admin: POST http://localhost:8081/api/admin/init" -ForegroundColor Gray
Write-Host "   - Manual silver price scrape: POST http://localhost:8081/api/silver/scrape" -ForegroundColor Gray
Write-Host "   - Check today's silver price: GET http://localhost:8081/api/silver/today" -ForegroundColor Gray
