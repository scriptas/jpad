# JPad Build Guide

## Building for Production

### Prerequisites

- Node.js (v18 or higher)
- Rust (latest stable)
- Platform-specific requirements:
  - **Windows**: Visual Studio Build Tools or Visual Studio with C++ development tools
  - **macOS**: Xcode Command Line Tools
  - **Linux**: Development packages (see below)

### Linux Dependencies

```bash
# Debian/Ubuntu
sudo apt update
sudo apt install libwebkit2gtk-4.1-dev \
  build-essential \
  curl \
  wget \
  file \
  libxdo-dev \
  libssl-dev \
  libayatana-appindicator3-dev \
  librsvg2-dev

# Fedora
sudo dnf install webkit2gtk4.1-devel \
  openssl-devel \
  curl \
  wget \
  file \
  libappindicator-gtk3-devel \
  librsvg2-devel

# Arch
sudo pacman -S webkit2gtk-4.1 \
  base-devel \
  curl \
  wget \
  file \
  openssl \
  appmenu-gtk-module \
  gtk3 \
  libappindicator-gtk3 \
  librsvg \
  libvips
```

## Quick Build

### Windows
```powershell
.\build.ps1
```

### macOS/Linux
```bash
chmod +x build.sh
./build.sh
```

## Manual Build

```bash
# Install dependencies
npm install

# Build frontend
npm run build

# Build Tauri app
npm run tauri:build
```

## Output Locations

After building, installers will be in `src-tauri/target/release/bundle/`:

- **Windows**: 
  - `msi/` - MSI installer
  - `nsis/` - NSIS installer (if configured)
  
- **macOS**: 
  - `dmg/` - DMG disk image
  - `macos/` - .app bundle
  
- **Linux**: 
  - `deb/` - Debian package
  - `appimage/` - AppImage
  - `rpm/` - RPM package (if configured)

## Cross-Platform Building

Tauri doesn't support true cross-compilation. To build for multiple platforms:

1. Build on each target platform natively, OR
2. Use CI/CD with GitHub Actions (see `.github/workflows/build.yml`)

## Debug Build

For faster builds during testing:

```bash
npm run tauri:build:debug
```

## Troubleshooting

### Terminal Window Appears (Windows)
The app is configured to hide the console window in release builds. If you still see it:
- Make sure you're building in release mode (not debug)
- Check that `#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]` is in `src-tauri/src/main.rs`

### Build Fails
- Ensure all dependencies are installed
- Try cleaning: `rm -rf dist src-tauri/target`
- Update Rust: `rustup update`
- Clear npm cache: `npm cache clean --force`
