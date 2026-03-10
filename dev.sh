#!/bin/bash
# Development script for JPad
# This script ensures Node.js 22 is used (required for Vite 7)

# Try to find Node 22 in NVM directory
NVM_NODE_22="/home/antanas/.nvm/versions/node/v22.22.1/bin"

if [ -d "$NVM_NODE_22" ]; then
    echo "🟢 Found Node 22 at $NVM_NODE_22"
    export PATH="$NVM_NODE_22:$PATH"
else
    echo "🟡 Node 22 not found in expected NVM path. Relying on system Node."
fi

echo "🚀 Starting JPad in development mode..."
fuser -k 1420/tcp 2>/dev/null || true
export WEBKIT_DISABLE_COMPOSITING_MODE=1
export WEBKIT_DISABLE_GPU_PROCESS=1
export WEBKIT_GPU_ACCELERATION_POLICY_NEVER=1
export WEBKIT_USE_SOFTWARE_RENDERING=1
export GDK_BACKEND=x11
npm run tauri:dev
