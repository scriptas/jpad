#!/bin/bash

# Script to generate Android icons from the main icon
# Uses sips (macOS built-in tool)

SOURCE_ICON="public/jpad_icon.png"
ANDROID_ICONS_DIR="src-tauri/icons/android"
ANDROID_RES_DIR="src-tauri/gen/android/app/src/main/res"

# Check if source icon exists
if [ ! -f "$SOURCE_ICON" ]; then
    echo "Error: Source icon not found at $SOURCE_ICON"
    exit 1
fi

echo "Generating Android icons from $SOURCE_ICON..."

# Android icon sizes for different densities
# mdpi: 48x48 (baseline)
# hdpi: 72x72 (1.5x)
# xhdpi: 96x96 (2x)
# xxhdpi: 144x144 (3x)
# xxxhdpi: 192x192 (4x)

# Function to resize icon and copy to both locations
resize_icon() {
    local size=$1
    local filename=$2
    local density=$3
    
    # Create in icons directory
    local icons_output="$ANDROID_ICONS_DIR/$density/$filename"
    sips -z $size $size "$SOURCE_ICON" --out "$icons_output" > /dev/null 2>&1
    echo "Created: $icons_output ($size x $size)"
    
    # Copy to res directory if it exists
    if [ -d "$ANDROID_RES_DIR/$density" ]; then
        cp "$icons_output" "$ANDROID_RES_DIR/$density/$filename"
        echo "  Copied to: $ANDROID_RES_DIR/$density/$filename"
    fi
}

# Create mdpi icons (48x48)
resize_icon 48 "ic_launcher.png" "mipmap-mdpi"
resize_icon 48 "ic_launcher_round.png" "mipmap-mdpi"
resize_icon 48 "ic_launcher_foreground.png" "mipmap-mdpi"

# Create hdpi icons (72x72)
resize_icon 72 "ic_launcher.png" "mipmap-hdpi"
resize_icon 72 "ic_launcher_round.png" "mipmap-hdpi"
resize_icon 72 "ic_launcher_foreground.png" "mipmap-hdpi"

# Create xhdpi icons (96x96)
resize_icon 96 "ic_launcher.png" "mipmap-xhdpi"
resize_icon 96 "ic_launcher_round.png" "mipmap-xhdpi"
resize_icon 96 "ic_launcher_foreground.png" "mipmap-xhdpi"

# Create xxhdpi icons (144x144)
resize_icon 144 "ic_launcher.png" "mipmap-xxhdpi"
resize_icon 144 "ic_launcher_round.png" "mipmap-xxhdpi"
resize_icon 144 "ic_launcher_foreground.png" "mipmap-xxhdpi"

# Create xxxhdpi icons (192x192)
resize_icon 192 "ic_launcher.png" "mipmap-xxxhdpi"
resize_icon 192 "ic_launcher_round.png" "mipmap-xxxhdpi"
resize_icon 192 "ic_launcher_foreground.png" "mipmap-xxxhdpi"

echo ""
echo "✓ Android icons generated successfully!"
echo ""
echo "Next steps:"
echo "1. Run: npm run tauri android build"
echo "2. The new icons will be included in your APK"
