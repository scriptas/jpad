#!/bin/bash
# Production build script for JPad
# Builds for the current platform

set -e

echo "🚀 Building JPad for production..."
echo "Platform: $(uname -s)"
echo ""

# Ensure Node 22 is used
NVM_NODE_22="/home/antanas/.nvm/versions/node/v22.22.1/bin"
if [ -d "$NVM_NODE_22" ]; then
    echo "🟢 Found Node 22 at $NVM_NODE_22"
    export PATH="$NVM_NODE_22:$PATH"
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
