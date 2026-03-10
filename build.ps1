# Production build script for JPad (Windows)
# Builds for Windows platform

$ErrorActionPreference = "Stop"

Write-Host "🚀 Building JPad for production..." -ForegroundColor Green
Write-Host "Platform: Windows"
Write-Host ""

# Clean previous builds
Write-Host "🧹 Cleaning previous builds..." -ForegroundColor Yellow
if (Test-Path "dist") { Remove-Item -Recurse -Force "dist" }
if (Test-Path "src-tauri/target/release/bundle") { Remove-Item -Recurse -Force "src-tauri/target/release/bundle" }

# Install dependencies if needed
if (-not (Test-Path "node_modules")) {
    Write-Host "📦 Installing dependencies..." -ForegroundColor Yellow
    npm install
}

# Build frontend
Write-Host "🔨 Building frontend..." -ForegroundColor Yellow
npm run build

# Build Tauri app
Write-Host "🦀 Building Tauri application..." -ForegroundColor Yellow
npm run tauri:build

Write-Host ""
Write-Host "✅ Build complete!" -ForegroundColor Green
Write-Host "📦 Installers can be found in: src-tauri/target/release/bundle/" -ForegroundColor Cyan
