# Android App Icons Setup

## Overview
The Android app now uses your custom JPad icon (the same transparent neon icon used on desktop) instead of the default Tauri icon.

## What Was Done

### 1. Generated Android Icon Sizes
Android requires multiple icon sizes for different screen densities:
- **mdpi** (48x48) - baseline density
- **hdpi** (72x72) - 1.5x density
- **xhdpi** (96x96) - 2x density
- **xxhdpi** (144x144) - 3x density
- **xxxhdpi** (192x192) - 4x density

All icons were generated from `public/jpad_icon.png` (1024x1024) using the `generate-android-icons.sh` script.

### 2. Updated Icon Background
Changed the adaptive icon background color from white (`#fff`) to match your app's dark theme (`#0d0a08`).

**File:** `src-tauri/icons/android/values/ic_launcher_background.xml`

This ensures your transparent icon looks good on the Android home screen with a dark background that matches your app's aesthetic.

### 3. Icon Files Generated
The following icon files were created/updated:
```
src-tauri/icons/android/
├── mipmap-mdpi/
│   ├── ic_launcher.png (48x48)
│   ├── ic_launcher_round.png (48x48)
│   └── ic_launcher_foreground.png (48x48)
├── mipmap-hdpi/
│   ├── ic_launcher.png (72x72)
│   ├── ic_launcher_round.png (72x72)
│   └── ic_launcher_foreground.png (72x72)
├── mipmap-xhdpi/
│   ├── ic_launcher.png (96x96)
│   ├── ic_launcher_round.png (96x96)
│   └── ic_launcher_foreground.png (96x96)
├── mipmap-xxhdpi/
│   ├── ic_launcher.png (144x144)
│   ├── ic_launcher_round.png (144x144)
│   └── ic_launcher_foreground.png (144x144)
└── mipmap-xxxhdpi/
    ├── ic_launcher.png (192x192)
    ├── ic_launcher_round.png (192x192)
    └── ic_launcher_foreground.png (192x192)
```

## How to Rebuild

To apply these icon changes to your Android app:

```bash
# Build the Android APK
npm run tauri android build

# Or for development
npm run tauri android dev
```

The new icons will be automatically included in the APK.

## Updating Icons in the Future

If you want to update the app icon in the future:

1. Replace `public/jpad_icon.png` with your new icon (recommended size: 1024x1024)
2. Run the generation script:
   ```bash
   ./generate-android-icons.sh
   ```
3. Rebuild the Android app

## Icon Types

- **ic_launcher.png** - Standard square icon
- **ic_launcher_round.png** - Circular icon (for launchers that support round icons)
- **ic_launcher_foreground.png** - Foreground layer for adaptive icons (Android 8.0+)

The adaptive icon system allows Android to apply different shapes (circle, square, rounded square) depending on the device manufacturer's launcher.
