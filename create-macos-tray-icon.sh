#!/bin/bash

# Create a proper macOS tray icon from the existing icon
# For template icons, we need a monochrome (black) icon with transparency

echo "Creating macOS tray icon..."

# Use sips (built-in macOS tool) to create a smaller version
# First, create a 22x22 version (standard tray size)
sips -z 22 22 src-tauri/icons/icon.png --out src-tauri/icons/tray-icon-temp.png

# For a proper template icon, we need to make it monochrome
# The easiest approach is to use the icon as-is but ensure it's small enough
# macOS will handle the color inversion when iconAsTemplate is true

# Create standard resolution (22x22)
sips -z 22 22 src-tauri/icons/icon.png --out src-tauri/icons/tray-icon.png

# Create @2x resolution (44x44) 
sips -z 44 44 src-tauri/icons/icon.png --out src-tauri/icons/tray-icon@2x.png

echo "Tray icons created at:"
echo "  - src-tauri/icons/tray-icon.png (22x22)"
echo "  - src-tauri/icons/tray-icon@2x.png (44x44)"
echo ""
echo "Note: For best results with macOS template icons, the icon should be:"
echo "  - Monochrome (black/dark with transparency)"
echo "  - Simple, recognizable design"
echo "  - macOS will automatically invert colors for dark menu bars"
