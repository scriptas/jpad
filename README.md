# JPad

With Simplenote being too simple and not supporting images or formatting;

With Obsidian being too complex and ugly and weird image copy paste method;

With Notion being too complex, paid and having AI;

With Google Keep??? Who dfq uses google keep?;

With Microsoft OneNote being part of a huge paid stack and not open for other platforms;

With notepad, notepad++, MS word being one file focused;

With apple notes being OS locked;

Made JPad. Light. Colorful. Simple, yet supports ALL the notedown features + clipboards.

This is a v1.0 version. With v2, I plan to add:

- Cloud sync with locally hosted or paid remote storage;
- Code snippet copy paste tool for simple development workflow management;
- File type animations by extension;
- Vim motions.

---

## Overview

JPad is a high-performance, desktop-native note-taking application designed for speed, flexibility, and a premium visual experience. Built with a focus on modern web technologies and the efficiency of Rust, it provides a seamless writing environment with cloud synchronization and extensive customization.

## Tech Stack

- **Shell & Backend**: [Tauri v2](https://tauri.app/) (Rust) Because it's popular. Also fast, maybe.
- **Frontend Core**: [React 19](https://react.dev/) & [TypeScript](https://www.typescriptlang.org/)
- **Build Tool**: [Vite](https://vitejs.dev/) Because AI decided its best to vibe code with this tool.
- **Editor Engine**: [TipTap](https://tiptap.dev/) (Prototyping rich-text experiences)
- **Styling**: [Tailwind CSS v4](https://tailwindcss.com/) Because I like it.
- **State Management**: [Zustand](https://zustand-demo.pmnd.rs/)
- **Icons**: [Lucide React](https://lucide.dev/)

## Key Features

- **Rich Text Experience**: Powerful WYSIWYG editing with support for images, YouTube embeds, and custom formatting.
- **Universal Sync**: Integrated cloud synchronization via Google Drive and Supabase.
- **Dynamic Theming**: Diverse visual presets (Cyberpunk, High Contrast, etc.) with deep CSS variable customization.
- **Desktop First**: A native feel with low resource overhead, global shortcuts, and system tray integration.
- **Advanced Media**: Seamless drag-and-drop and clipboard support for binary images.
- **File Management**: Built-in explorer for organizing notes and assets.

---

### Development

To get started locally:

```bash
# Install dependencies
npm install

# Run in development mode
npm run tauri:dev

# Build for production
npm run tauri:build
```

Works on windows, mac and linux. Although mac is yet to be tested.