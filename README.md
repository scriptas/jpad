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

<div align="center">
  <img src="https://github.com/user-attachments/assets/3ae0ffe9-6218-486c-ae07-16037462962d" height="48" alt="Windows" />
  <img src="https://github.com/user-attachments/assets/7f8025f0-b5e8-42a5-b529-7a884faf12cf" height="48" alt="macOS" />
  <img src="https://github.com/user-attachments/assets/e99545cc-c018-483d-ad3c-4f51e0b3d940" height="48" alt="Linux" />
  <img src="https://github.com/user-attachments/assets/99401665-57ac-4811-9c8f-8e2eb4494cca" height="48" alt="ios" />
  <img src="https://github.com/user-attachments/assets/6b73bca4-f8c8-447f-a0e8-eef3b19f0476" height="48" alt="android" />

</div>




<img height="902" src="https://github.com/user-attachments/assets/ea4eb713-4915-4beb-8bd5-09aa6a3dfa5a" height="600" alt="main app design"/>
<img height="902" src="https://github.com/user-attachments/assets/e52322a6-8147-4e2f-882a-8abf2c4b6964" height="600" alt="settings app design"/>

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

Works on windows, mac and linux.
