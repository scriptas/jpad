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
import { useThemeStore, initializeTheme } from "./store/useThemeStore";
import { useSettingsStore } from "./store/useSettingsStore";
import Settings from "./components/Settings";
import NeonIcon from "./components/NeonIcon";
import { platform } from "@tauri-apps/plugin-os";

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export default function App() {
  const { sidebarVisible, toggleSidebar, refreshFiles, activeFileId, files } =
    useStore();
  const { settingsOpen } = useThemeStore();
  const [sidebarWidth, setSidebarWidth] = useState(260);
  const [isResizing, setIsResizing] = useState(false);
  const [isMaximized, setIsMaximized] = useState(false);
  const [isMacOS, setIsMacOS] = useState(false);
  const [isLinux, setIsLinux] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const appWindowRef = useRef<any>(null);

  const activeFile = activeFileId ? findFileNode(files, activeFileId) : null;

  useEffect(() => {
    refreshFiles();
    initializeTheme();
    const p = platform();
    setIsMacOS(p === "macos");
    setIsLinux(p === "linux");
    const mobile = p === "android" || p === "ios";
    setIsMobile(mobile);

    if (!mobile) {
      import("@tauri-apps/api/window").then((m) => {
        appWindowRef.current = m.getCurrentWindow();
        m.getCurrentWindow().isMaximized().then(setIsMaximized).catch(() => { });
      });
    }

    // Periodic file system refresh to detect external changes
    const refreshInterval = setInterval(() => {
      refreshFiles();
    }, 3000); // Refresh every 3 seconds

    // Also refresh when window regains focus
    const handleFocus = () => {
      refreshFiles();
    };
    window.addEventListener("focus", handleFocus);

    return () => {
      clearInterval(refreshInterval);
      window.removeEventListener("focus", handleFocus);
    };
  }, [refreshFiles]);

  // Listen for maximize/unmaximize
  useEffect(() => {
    if (isMobile) return;

    let unlisten: (() => void) | undefined;
    (async () => {
      const checkAndListen = async () => {
        if (appWindowRef.current) {
          setIsMaximized(await appWindowRef.current.isMaximized());
          unlisten = await appWindowRef.current.onResized(async () => {
            setIsMaximized(await appWindowRef.current.isMaximized());
          });
        } else if (!isMobile) {
          setTimeout(checkAndListen, 500);
        }
      };
      checkAndListen();
    })();
    return () => {
      unlisten?.();
    };
  }, [isMobile]);

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
      if (newWidth > 210 && newWidth < 450) {
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
    if (isMobile) return;
    const el = titleBarRef.current;
    if (!el) return;

    const onMouseDown = (e: MouseEvent) => {
      // Don't drag if clicking on a button
      if ((e.target as HTMLElement).closest("button")) return;
      // Primary (left) button only
      if (e.buttons !== 1) return;

      if (e.detail === 2) {
        // Double-click → maximize/restore
        appWindowRef.current?.toggleMaximize();
      } else {
        // Single click → start dragging
        appWindowRef.current?.startDragging();
      }
    };

    el.addEventListener("mousedown", onMouseDown);
    return () => el.removeEventListener("mousedown", onMouseDown);
  }, [isMobile]);

  // ── Global Navigation Prevention ──
  useEffect(() => {
    const handleNavigation = (e: MouseEvent | KeyboardEvent) => {
      const isBack =
        (e instanceof MouseEvent && e.button === 3) ||
        (e instanceof KeyboardEvent &&
          ((e.altKey && e.key === "ArrowLeft") || e.key === "BrowserBack"));

      const isForward =
        (e instanceof MouseEvent && e.button === 4) ||
        (e instanceof KeyboardEvent &&
          ((e.altKey && e.key === "ArrowRight") || e.key === "BrowserForward"));

      if (isBack || isForward) {
        const isEditing = document.activeElement?.closest(".jpad-editor") ||
          ["INPUT", "TEXTAREA"].includes(document.activeElement?.tagName || "");

        e.preventDefault();

        if (isBack && isEditing) {
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
        const { fileNamePrefix } = useSettingsStore.getState();
        const date = new Date();
        const timestamp = `${date.getHours()}${date.getMinutes()}${date.getSeconds()}`;
        const defaultName = `${fileNamePrefix}-${timestamp}.jt`;
        createFile(`${notesRoot}/${defaultName}`);
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  return (
    <div className={cn(
      "flex flex-col h-screen w-full bg-background text-text overflow-hidden",
      isMobile ? "border-[8px] border-border" : "border-2 border-border",
      isMacOS ? "rounded-[10px]" : (isLinux || isMobile) ? "rounded-none" : "rounded-[8px]"
    )}>
      {/* Custom Title Bar */}
      <div
        ref={titleBarRef}
        className={cn(
          "flex items-center bg-sidebar border-b-2 border-border flex-shrink-0 select-none cursor-default overflow-hidden",
          isMobile ? "min-h-[calc(env(safe-area-inset-top,44px)+52px)] pt-[max(env(safe-area-inset-top,44px),44px)] pb-3" : "h-10",
          isMacOS ? "rounded-t-[10px]" : (isLinux || isMobile) ? "rounded-none" : "rounded-t-[8px]"
        )}
      >
        {isMobile ? (
          // Mobile layout: simple branding
          <div className="flex items-center justify-between w-full px-5">
            <div className="flex items-center gap-3">
              <NeonIcon size={24} />
              <span className="text-[14px] font-bold tracking-wider text-text uppercase">
                JPad
              </span>
            </div>
            {/* Center: File Name (smaller on mobile) */}
            <div className="flex-1 h-full flex items-center justify-center overflow-hidden pointer-events-none px-4">
              {activeFile && (
                <span className="text-[12px] text-text/30 font-medium truncate tracking-wider uppercase">
                  {activeFile.name}
                </span>
              )}
            </div>
            <div className="w-10" />
          </div>
        ) : isMacOS ? (
          // macOS layout...
          <>
            <div className="flex items-center gap-2 pl-3 pr-3 h-full flex-shrink-0">
              <button
                onClick={() => appWindowRef.current?.close()}
                className="w-3 h-3 rounded-full bg-[#ff5f57] hover:bg-[#ff5f57]/80 transition-colors flex items-center justify-center group"
                title="Close"
              >
                <X size={8} className="opacity-0 group-hover:opacity-100 transition-opacity" strokeWidth={3} />
              </button>
              <button
                onClick={() => appWindowRef.current?.minimize()}
                className="w-3 h-3 rounded-full bg-[#febc2e] hover:bg-[#febc2e]/80 transition-colors flex items-center justify-center group"
                title="Minimize"
              >
                <Minus size={8} className="opacity-0 group-hover:opacity-100 transition-opacity" strokeWidth={3} />
              </button>
              <button
                onClick={() => appWindowRef.current?.toggleMaximize()}
                className="w-3 h-3 rounded-full bg-[#28c840] hover:bg-[#28c840]/80 transition-colors flex items-center justify-center group"
                title="Maximize"
              >
                <Maximize2 size={6} className="opacity-0 group-hover:opacity-100 transition-opacity" strokeWidth={3} />
              </button>
            </div>

            <div className="flex items-center gap-2 pr-3 h-full flex-shrink-0">
              <NeonIcon size={32} />
              <span className="text-[11px] font-bold tracking-wide text-text uppercase">
                JPad
              </span>
            </div>

            <div className="flex-1 h-full flex items-center justify-center overflow-hidden pointer-events-none">
              {activeFile && (
                <span className="text-[11px] text-text/30 font-medium truncate max-w-[300px] tracking-wider uppercase">
                  {activeFile.name}
                </span>
              )}
            </div>

            <div className="w-[140px] flex-shrink-0" />
          </>
        ) : (
          // Windows/Linux layout...
          <>
            <div className="flex items-center gap-2 px-3 h-full flex-shrink-0">
              <NeonIcon size={32} />
              <span className="text-[11px] font-bold tracking-wide text-text uppercase">
                JPad
              </span>
            </div>

            <div className="flex-1 h-full flex items-center justify-center overflow-hidden pointer-events-none">
              {activeFile && (
                <span className="text-[11px] text-text/30 font-medium truncate max-w-[300px] tracking-wider uppercase">
                  {activeFile.name}
                </span>
              )}
            </div>

            <div className="flex items-center h-full flex-shrink-0">
              <button
                onClick={() => appWindowRef.current?.minimize()}
                className="h-full px-3.5 hover:bg-surface-hover/80 transition-colors flex items-center"
              >
                <Minus size={14} className="opacity-90" />
              </button>
              <button
                onClick={() => appWindowRef.current?.toggleMaximize()}
                className="h-full px-3.5 hover:bg-surface-hover/80 transition-colors flex items-center"
              >
                {isMaximized ? (
                  <Square size={10} className="opacity-90" />
                ) : (
                  <Maximize2 size={12} className="opacity-90" />
                )}
              </button>
              <button
                onClick={() => appWindowRef.current?.close()}
                className="h-full px-3.5 hover:bg-red-500/80 hover:text-white transition-colors flex items-center"
              >
                <X size={14} className="opacity-90" />
              </button>
            </div>
          </>
        )}
      </div>

      <div className="flex flex-1 overflow-hidden">
        {!sidebarVisible && (
          <button
            onClick={toggleSidebar}
            className="fixed bottom-12 left-6 z-50 p-4 bg-primary/95 text-white rounded-[2rem] shadow-2xl shadow-primary/30 hover:bg-primary hover:scale-105 active:scale-95 transition-all backdrop-blur-md border-2 border-white/20"
            title="Show Sidebar"
          >
            <PanelLeftOpen size={24} />
          </button>
        )}

        {sidebarVisible && (
          <>
            {/* Sidebar Backdrop (Mobile only) */}
            {isMobile && (
              <div
                className="fixed inset-0 bg-black/80 backdrop-blur-[4px] z-[90] animate-in fade-in duration-300"
                onClick={toggleSidebar}
              />
            )}
            <div
              style={{ width: isMobile ? "85%" : sidebarWidth }}
              className={cn(
                "flex-shrink-0 relative h-full transition-all duration-300",
                isMobile && "fixed inset-y-0 left-0 z-[100] bg-sidebar shadow-2xl border-r-[8px] border-border animate-in slide-in-from-left duration-300"
              )}
            >
              <Sidebar />
              {!isMobile && (
                <div
                  onMouseDown={startResizing}
                  className={cn(
                    "absolute top-0 right-0 w-[4px] h-full cursor-col-resize transition-colors z-20",
                    "hover:bg-primary/30",
                    isResizing && "bg-primary/50"
                  )}
                />
              )}
            </div>
          </>
        )}

        <main className="flex-1 flex flex-col h-full overflow-hidden bg-background relative">
          <div className="flex-1 overflow-hidden relative">
            <Editor />
          </div>
          <StatusBar />
        </main>
      </div>
      {settingsOpen && <Settings />}
    </div>
  );
}
