#!/bin/bash

# This script creates a macOS tray icon from your existing icon
# It will create a 22x22 pixel icon with transparency

# Check if ImageMagick is installed
if ! command -v convert &> /dev/null; then
    echo "ImageMagick is not installed. Install it with: brew install imagemagick"
    exit 1
fi

# Create a simple tray icon from the existing 32x32 icon
# For macOS tray, we want:
# - 22x22 pixels (or 44x44 for @2x)
# - Transparent background
# - Dark/black foreground (will be inverted automatically by macOS when iconAsTemplate is true)

echo "Creating tray icon..."

# Create standard resolution (22x22)
convert src-tauri/icons/32x32.png \
    -resize 22x22 \
    -background none \
    -gravity center \
    -extent 22x22 \
    src-tauri/icons/tray-icon.png

# Create @2x resolution (44x44)
convert src-tauri/icons/32x32.png \
    -resize 44x44 \
    -background none \
    -gravity center \
    -extent 44x44 \
    src-tauri/icons/tray-icon@2x.png

echo "Tray icons created!"
echo "Note: For best results, create a custom monochrome icon design"
echo "with a transparent background and dark/black foreground."
