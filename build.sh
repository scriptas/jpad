#!/bin/bash
# Production build script for JPad
# Builds for the current platform

set -e

echo "🚀 Building JPad for production..."
echo "Platform: $(uname -s)"
echo ""

# Ensure Node 22 is available
if [ -n "$NVM_DIR" ]; then
    # shellcheck source=/dev/null
    [ -s "$NVM_DIR/nvm.sh" ] && . "$NVM_DIR/nvm.sh"
    nvm use 22 2>/dev/null && echo "🟢 Using Node $(node -v) via NVM"
elif command -v node &>/dev/null; then
    echo "🟡 Using system Node $(node -v)"
else
    echo "❌ Node.js not found. Please install Node 22+."
    exit 1
fi

# Clean previous builds
echo "🧹 Cleaning previous builds..."
rm -rf dist
rm -rf src-tauri/target/release/bundle

# Install dependencies if needed
if [ ! -d "node_modules" ]; then
    echo "📦 Installing dependencies..."
    npm install
fi

# Build frontend
echo "🔨 Building frontend..."
npm run build

# Build Tauri app
echo "🦀 Building Tauri application..."
npm run tauri:build

echo ""
echo "✅ Build complete!"
echo "📦 Installers can be found in: src-tauri/target/release/bundle/"
