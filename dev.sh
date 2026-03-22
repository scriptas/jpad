#!/bin/bash
# Development script for JPad
# This script ensures Node.js 22 is used (required for Vite 7)

# Try to find Node 22 via NVM
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

echo "🚀 Starting JPad in development mode..."
fuser -k 1420/tcp 2>/dev/null || true

# ── Wayland / Hyprland optimisation ──
# Let GDK auto-detect the backend (wayland-native on Wayland, x11 on X11).
# Only force x11 if native Wayland is explicitly broken for you:
#   export GDK_BACKEND=x11
export GDK_BACKEND=wayland,x11

# WebKitGTK Wayland-safe rendering flags
export WEBKIT_DISABLE_DMABUF_RENDERER=1

npm run tauri:dev
