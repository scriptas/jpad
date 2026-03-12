import { useState, useEffect, useCallback, useRef } from "react";
import Sidebar from "./components/Sidebar";
import Editor from "./components/Editor";
import StatusBar from "./components/StatusBar";
import { useStore, findFileNode } from "./store/useStore";
import {
  PanelLeftOpen,
  Maximize2,
  X,
  Square,
  Minus,
} from "lucide-react";
import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";
import { getCurrentWindow } from "@tauri-apps/api/window";
import { useThemeStore, initializeTheme } from "./store/useThemeStore";
import Settings from "./components/Settings";
import NeonIcon from "./components/NeonIcon";
import { platform } from "@tauri-apps/plugin-os";

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

const appWindow = getCurrentWindow();

export default function App() {
  const { sidebarVisible, toggleSidebar, refreshFiles, activeFileId, files } =
    useStore();
  const { settingsOpen } = useThemeStore();
  const [sidebarWidth, setSidebarWidth] = useState(260);
  const [isResizing, setIsResizing] = useState(false);
  const [isMaximized, setIsMaximized] = useState(false);
  const [isMacOS, setIsMacOS] = useState(false);

  const activeFile = activeFileId ? findFileNode(files, activeFileId) : null;

  useEffect(() => {
    refreshFiles();
    initializeTheme();
    // Detect platform
    setIsMacOS(platform() === "macos");
  }, []);

  // Listen for maximize/unmaximize
  useEffect(() => {
    let unlisten: (() => void) | undefined;
    (async () => {
      setIsMaximized(await appWindow.isMaximized());
      unlisten = await appWindow.onResized(async () => {
        setIsMaximized(await appWindow.isMaximized());
      });
    })();
    return () => {
      unlisten?.();
    };
  }, []);

  // ── Sidebar resize via document-level listeners ──
  const isResizingRef = useRef(false);

  const startResizing = useCallback((e: React.MouseEvent) => {
    isResizingRef.current = true;
    setIsResizing(true);
    e.preventDefault();
  }, []);

  useEffect(() => {
    const onMouseMove = (e: MouseEvent) => {
      if (!isResizingRef.current) return;
      const newWidth = e.clientX;
      if (newWidth > 180 && newWidth < 450) {
        setSidebarWidth(newWidth);
      }
    };
    const onMouseUp = () => {
      if (isResizingRef.current) {
        isResizingRef.current = false;
        setIsResizing(false);
      }
    };
    document.addEventListener("mousemove", onMouseMove);
    document.addEventListener("mouseup", onMouseUp);
    return () => {
      document.removeEventListener("mousemove", onMouseMove);
      document.removeEventListener("mouseup", onMouseUp);
    };
  }, []);


  // ── Titlebar drag: exactly matches Tauri v2 official pattern ──
  const titleBarRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = titleBarRef.current;
    if (!el) return;

    const onMouseDown = (e: MouseEvent) => {
      // Don't drag if clicking on a button
      if ((e.target as HTMLElement).closest("button")) return;
      // Primary (left) button only
      if (e.buttons !== 1) return;

      if (e.detail === 2) {
        // Double-click → maximize/restore
        appWindow.toggleMaximize();
      } else {
        // Single click → start dragging
        appWindow.startDragging();
      }
    };

    el.addEventListener("mousedown", onMouseDown);
    return () => el.removeEventListener("mousedown", onMouseDown);
  }, []);

  // ── Global Navigation Prevention ──
  // Blocks mouse side-buttons and Alt+Arrows to prevent navigating away from the SPA state
  useEffect(() => {
    const handleNavigation = (e: MouseEvent | KeyboardEvent) => {
      // Determine if it is a back/forward navigation attempt
      const isBack =
        (e instanceof MouseEvent && e.button === 3) ||
        (e instanceof KeyboardEvent &&
          ((e.altKey && e.key === "ArrowLeft") || e.key === "BrowserBack"));

      const isForward =
        (e instanceof MouseEvent && e.button === 4) ||
        (e instanceof KeyboardEvent &&
          ((e.altKey && e.key === "ArrowRight") || e.key === "BrowserForward"));

      if (isBack || isForward) {
        // Find if we are currently in an input/editor context
        const isEditing = document.activeElement?.closest(".jpad-editor") ||
          ["INPUT", "TEXTAREA"].includes(document.activeElement?.tagName || "");

        // If it's a back button and we are editing, we want to allow the event 
        // to propagate so the editor can handle it as 'undo' if we implement it there,
        // OR we just prevent default here and trigger undo manually.

        // For now, prevent the default navigation behavior (exiting window/going back in history)
        e.preventDefault();

        // If it's back and we're editing, dispatch a custom undo if it's the editor
        if (isBack && isEditing) {
          // If it's a mouse button, the editor won't see it as a keyboard undo,
          // so we could manually trigger undo if we have a way.
          // Since Editor is a separate component, let's use a custom event.
          window.dispatchEvent(new CustomEvent("jpad-undo"));
        }
      }
    };

    window.addEventListener("mousedown", handleNavigation);
    window.addEventListener("keydown", handleNavigation);
    return () => {
      window.removeEventListener("mousedown", handleNavigation);
      window.removeEventListener("keydown", handleNavigation);
    };
  }, []);

  // ── Global Shortcuts ──
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Ctrl+N (or Cmd+N) for New Note
      if ((e.ctrlKey || e.metaKey) && e.key === "n") {
        e.preventDefault();
        const { notesRoot, createFile } = useStore.getState();
        const date = new Date();
        const timestamp = `${date.getHours()}${date.getMinutes()}${date.getSeconds()}`;
        const defaultName = `Untitled-${timestamp}.jt`;
        createFile(`${notesRoot}/${defaultName}`);
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  return (
    <div className="flex flex-col h-screen w-full bg-background text-text overflow-hidden">
      {/* Custom Title Bar */}
      <div
        ref={titleBarRef}
        className="h-10 flex items-center bg-sidebar border-b border-border flex-shrink-0 select-none cursor-default"
      >
        {isMacOS ? (
          // macOS layout: traffic lights (left) | JPAD text (left) | filename (center) | icon (right)
          <>
            {/* Left: Space for traffic lights + JPAD text */}
            <div className="flex items-center gap-2 pl-20 pr-3 h-full flex-shrink-0">
              <span className="text-[11px] font-bold tracking-wide text-text uppercase">
                JPad
              </span>
            </div>

            {/* Center: File Name */}
            <div className="flex-1 h-full flex items-center justify-center overflow-hidden pointer-events-none">
              {activeFile && (
                <span className="text-[11px] text-text/30 font-medium truncate max-w-[300px] tracking-wider uppercase">
                  {activeFile.name}
                </span>
              )}
            </div>

            {/* Right: Icon only */}
            <div className="flex items-center px-3 h-full flex-shrink-0">
              <NeonIcon size={32} />
            </div>
          </>
        ) : (
          // Windows/Linux layout: icon + text (left) | filename (center) | window controls (right)
          <>
            {/* Left: App Branding */}
            <div className="flex items-center gap-2 px-3 h-full flex-shrink-0">
              <NeonIcon size={32} />
              <span className="text-[11px] font-bold tracking-wide text-text uppercase">
                JPad
              </span>
            </div>

            {/* Center: File Name */}
            <div className="flex-1 h-full flex items-center justify-center overflow-hidden pointer-events-none">
              {activeFile && (
                <span className="text-[11px] text-text/30 font-medium truncate max-w-[300px] tracking-wider uppercase">
                  {activeFile.name}
                </span>
              )}
            </div>

            {/* Right: Window Controls */}
            <div className="flex items-center h-full flex-shrink-0">
              <button
                onClick={() => appWindow.minimize()}
                className="h-full px-3.5 hover:bg-surface-hover/80 transition-colors flex items-center"
              >
                <Minus size={14} className="opacity-90" />
              </button>
              <button
                onClick={() => appWindow.toggleMaximize()}
                className="h-full px-3.5 hover:bg-surface-hover/80 transition-colors flex items-center"
              >
                {isMaximized ? (
                  <Square size={10} className="opacity-90" />
                ) : (
                  <Maximize2 size={12} className="opacity-90" />
                )}
              </button>
              <button
                onClick={() => appWindow.close()}
                className="h-full px-3.5 hover:bg-red-500/80 hover:text-white transition-colors flex items-center"
              >
                <X size={14} className="opacity-90" />
              </button>
            </div>
          </>
        )}
      </div>

      {/* Main Content Row */}
      <div className="flex flex-1 overflow-hidden">
        {/* Sidebar Toggle FAB (when sidebar hidden) */}
        {!sidebarVisible && (
          <button
            onClick={toggleSidebar}
            className="fixed top-12 left-4 z-50 p-2.5 bg-primary/90 text-white rounded-lg shadow-lg shadow-primary/20 hover:bg-primary hover:scale-105 active:scale-95 transition-all backdrop-blur-sm"
            title="Show Sidebar"
          >
            <PanelLeftOpen size={18} />
          </button>
        )}

        {/* Sidebar */}
        {sidebarVisible && (
          <div
            style={{ width: sidebarWidth }}
            className="flex-shrink-0 relative h-full"
          >
            <Sidebar />
            {/* Resize Handle */}
            <div
              onMouseDown={startResizing}
              className={cn(
                "absolute top-0 right-0 w-[3px] h-full cursor-col-resize transition-colors z-20",
                "hover:bg-primary/30",
                isResizing && "bg-primary/50"
              )}
            />
          </div>
        )}

        {/* Main Editor Area */}
        <main className="flex-1 flex flex-col h-full overflow-hidden bg-background relative">
          {/* Editor */}
          <div className="flex-1 overflow-hidden relative">
            <Editor />
            {/* Ambient decorative glow */}
            <div className="absolute top-[-15%] right-[-10%] w-[40%] h-[40%] bg-primary/[0.03] blur-[120px] rounded-full pointer-events-none" />
            <div className="absolute bottom-[-10%] left-[-10%] w-[30%] h-[30%] bg-primary/[0.02] blur-[100px] rounded-full pointer-events-none" />
          </div>

          {/* StatusBar */}
          <StatusBar />
        </main>
      </div>
      {/* Settings Modal */}
      {settingsOpen && <Settings />}
    </div>
  );
}
