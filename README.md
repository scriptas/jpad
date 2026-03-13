# JPad

With Simplenote being too simple and not supporting images or formatting;

With Obsidian being too complex and ugly and weird image copy paste method;

With Notion being too complex, paid and having AI;

With Google Keep??? Who dfq uses google keep?;

With Microsoft OneNote being part of a huge paid stack and not open for other platforms;

With notepad, notepad++, MS word being one file focused;

With apple notes being OS locked;

Made JPad, note taking software. Free. Light. Colorful. Simple, yet supports ALL the notedown features + clipboards.

This is a v1.0 version. With v2, I plan to add:

- Cloud sync -> free self hosted or paid remote storage;
- Code snippet copy paste tool for simple development workflow management;
- File type animations by extension;
- Vim motions.

---

<img width="1095" height="753" alt="image" src="https://github.com/user-attachments/assets/b5e7ee29-1db0-4537-9210-0e53795b6a0b" />
<img width="791" height="642" alt="image" src="https://github.com/user-attachments/assets/a0b5afbe-4feb-4e4f-adf4-f59c9f50e933" />
<img width="1102" height="754" alt="image" src="https://github.com/user-attachments/assets/41b8b9f5-5616-41f6-9ffe-f7270188daa7" />

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
- **Full-Text Search**: Search across both filenames and file content with live results (Ctrl+F / Cmd+F).

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
