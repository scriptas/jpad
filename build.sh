#!/bin/bash
# Production build script for JPad
# Builds for the current platform

set -e

echo "🚀 Building JPad for production..."
echo "Platform: $(uname -s)"
echo ""

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
