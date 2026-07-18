import { useState, useEffect, useCallback, useRef } from "react";
import Sidebar from "./components/Sidebar";
import Editor from "./components/Editor";
import StatusBar from "./components/StatusBar";
import { useStore, findFileNode } from "./store/useStore";
import {
  Maximize2,
  X,
  Square,
  Minus,
  Menu,
} from "lucide-react";
import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";
import { useThemeStore, initializeTheme } from "./store/useThemeStore";
import { useSettingsStore } from "./store/useSettingsStore";
import { useSyncStore } from "./store/useSyncStore";
import { initializeUpdateChecker } from "./store/useUpdateStore";
import Settings from "./components/Settings";
import NeonIcon from "./components/NeonIcon";
import WindowResizeHandles from "./components/WindowResizeHandles";
import { platform } from "@tauri-apps/plugin-os";

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export default function App() {
  const { sidebarVisible, toggleSidebar, refreshFiles, activeFileId, files, setActiveFileId, setSidebarVisible } =
    useStore();
  const { settingsOpen, showNeonBorder } = useThemeStore();
  const { initializeSync } = useSyncStore();
  const [sidebarWidth, setSidebarWidth] = useState(260);
  const [isResizing, setIsResizing] = useState(false);
  const [isMaximized, setIsMaximized] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [isMacOS, setIsMacOS] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const appWindowRef = useRef<any>(null);

  const activeFile = activeFileId ? findFileNode(files, activeFileId) : null;

  // Handle 'file' query parameter on mount
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const fileToOpen = params.get("file");
    if (fileToOpen) {
      const decodedPath = decodeURIComponent(fileToOpen);
      setActiveFileId(decodedPath);
    }

    const showSidebar = params.get("sidebar");
    if (showSidebar === "false") {
      setSidebarVisible(false);
    }
  }, [setActiveFileId, setSidebarVisible]);

  useEffect(() => {
    refreshFiles();
    initializeTheme();
    initializeSync();
    const cleanupUpdater = initializeUpdateChecker();
    const p = platform();
    setIsMacOS(p === "macos");
    const mobile = p === "android" || p === "ios";
    setIsMobile(mobile);
    
    // Handle Android back button
    let backPressHandler: (() => void) | undefined;
    if (mobile) {
      backPressHandler = () => {
        const { activeFileId, setActiveFileId, sidebarVisible, setSidebarVisible } = useStore.getState();
        
        // If a file is open, close it and return to file explorer
        if (activeFileId) {
          setActiveFileId(null);
          return;
        }
        
        // If sidebar is open, close it
        if (sidebarVisible) {
          setSidebarVisible(false);
          return;
        }
        
        // If nothing is open, close the app
        if (window.AndroidNavigation && window.AndroidNavigation.closeApp) {
          window.AndroidNavigation.closeApp();
        }
      };
      
      window.addEventListener('android-back-pressed', backPressHandler);
    }

    if (!mobile) {
      import("@tauri-apps/api/window").then((m) => {
        appWindowRef.current = m.getCurrentWindow();
        m.getCurrentWindow().isMaximized().then(setIsMaximized).catch(() => { });
      });
    }

    // On mobile, resize the app to fit above the soft keyboard.
    // ProseMirror's scrollIntoView is overridden in Editor.tsx to prevent
    // native viewport panning, so we only need height management here.
    let vpHandler: (() => void) | undefined;
    let scrollResetHandler: (() => void) | undefined;
    if (mobile) {
      const rootEl = document.getElementById("root");

      scrollResetHandler = () => {
        window.scrollTo(0, 0);
        document.documentElement.scrollTop = 0;
        document.body.scrollTop = 0;
      };
      window.addEventListener("scroll", scrollResetHandler, { passive: true });

      if (window.visualViewport) {
        vpHandler = () => {
          const vp = window.visualViewport!;
          const heightPx = `${vp.height}px`;
          document.documentElement.style.height = heightPx;
          document.body.style.height = heightPx;
          if (rootEl) rootEl.style.height = heightPx;
          scrollResetHandler!();
        };
        window.visualViewport.addEventListener("resize", vpHandler);
        window.visualViewport.addEventListener("scroll", vpHandler);
        vpHandler();
      }
    }

    // Periodic file system refresh to detect external changes
    const refreshInterval = setInterval(() => {
      refreshFiles();
    }, 3000); // Refresh every 3 seconds

    // Also refresh when window regains focus
    const handleFocus = () => {
      refreshFiles();
      const { config, syncNow } = useSyncStore.getState();
      if (config.enabled) {
        syncNow().catch(console.error);
      }
    };
    window.addEventListener("focus", handleFocus);

    return () => {
      clearInterval(refreshInterval);
      window.removeEventListener("focus", handleFocus);
      cleanupUpdater();
      if (backPressHandler) {
        window.removeEventListener('android-back-pressed', backPressHandler);
      }
      if (scrollResetHandler) {
        window.removeEventListener("scroll", scrollResetHandler);
      }
      if (vpHandler && window.visualViewport) {
        window.visualViewport.removeEventListener("resize", vpHandler);
        window.visualViewport.removeEventListener("scroll", vpHandler);
      }
    };
  }, [refreshFiles]);

  // Listen for maximize/unmaximize and fullscreen
  useEffect(() => {
    if (isMobile) return;

    let unlistenResized: (() => void) | undefined;
    let unlistenMaximized: (() => void) | undefined;
    let unlistenUnmaximized: (() => void) | undefined;
    let unlistenFullscreen: (() => void) | undefined;

    const setupListeners = async () => {
      if (appWindowRef.current) {
        setIsMaximized(await appWindowRef.current.isMaximized());
        setIsFullscreen(await appWindowRef.current.isFullscreen());

        // Use specific maximize/unmaximize events
        unlistenMaximized = await appWindowRef.current.listen("tauri://window/maximized", () => {
          setIsMaximized(true);
        });
        unlistenUnmaximized = await appWindowRef.current.listen("tauri://window/unmaximized", () => {
          setIsMaximized(false);
        });

        // Fullscreen listeners
        unlistenFullscreen = await appWindowRef.current.onResized(async () => {
          const maximized = await appWindowRef.current.isMaximized();
          const fullscreen = await appWindowRef.current.isFullscreen();
          setIsMaximized(maximized);
          setIsFullscreen(fullscreen);
        });
      } else {
        setTimeout(setupListeners, 500);
      }
    };

    setupListeners();

    return () => {
      unlistenResized?.();
      unlistenMaximized?.();
      unlistenUnmaximized?.();
      unlistenFullscreen?.();
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


  // Note: Dragging is now handled via 'data-tauri-drag-region' attribute in the JSX
  // which is more robust for Tauri v2 projects.

  // ── Global Navigation Prevention ──
  useEffect(() => {
    const handleNavigation = (e: MouseEvent | KeyboardEvent) => {
      const isEditing = document.activeElement?.closest(".jpad-editor") ||
        ["INPUT", "TEXTAREA"].includes(document.activeElement?.tagName || "");

      // Alt+ArrowLeft/Right is word-by-word cursor navigation when editing.
      // Do not treat as navigation (history back/forward) when editing is active.
      const isBack =
        (e instanceof MouseEvent && e.button === 3) ||
        (e instanceof KeyboardEvent &&
          ((e.altKey && e.key === "ArrowLeft" && !isEditing) || e.key === "BrowserBack"));

      const isForward =
        (e instanceof MouseEvent && e.button === 4) ||
        (e instanceof KeyboardEvent &&
          ((e.altKey && e.key === "ArrowRight" && !isEditing) || e.key === "BrowserForward"));

      if (isBack || isForward) {
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
        const { notesRoot, createFile, lastSelectedId, activeFileId, files } = useStore.getState();
        const { fileNamePrefix } = useSettingsStore.getState();
        const date = new Date();
        const timestamp = `${date.getHours()}${date.getMinutes()}${date.getSeconds()}`;
        const defaultName = `${fileNamePrefix}-${timestamp}.jt`;

        let basePath: string | undefined;
        const targetId = lastSelectedId || activeFileId;
        if (targetId) {
          const node = findFileNode(files, targetId);
          if (node) {
            if (node.type === "folder") {
              basePath = node.id;
            } else {
              basePath = node.id.substring(0, node.id.lastIndexOf("/"));
            }
          }
        }

        createFile(`${basePath || notesRoot}/${defaultName}`);
      }

      // Ctrl+B (or Cmd+B) for Sidebar Toggle
      if ((e.ctrlKey || e.metaKey) && e.key === "b") {
        e.preventDefault();
        const { toggleSidebar } = useStore.getState();
        toggleSidebar();
      }

      // F11 to toggle fullscreen
      if (e.key === "F11") {
        e.preventDefault();
        if (appWindowRef.current) {
          appWindowRef.current.isFullscreen().then((fullscreen: boolean) => {
            appWindowRef.current.setFullscreen(!fullscreen);
          }).catch(() => { });
        }
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  return (
    <div className={cn(
      "flex flex-col h-full w-full bg-background/85 text-text overflow-hidden relative",
      isMobile && "fixed inset-0", // Prevent browser panning on mobile
      !isMacOS && "backdrop-blur-xl", // Native vibrancy used on macOS instead
      (showNeonBorder && !isMaximized && !isFullscreen)
        ? (isMobile ? "border-[6px] border-primary/20" : "border-2 border-primary/30 shadow-[0_0_40px_rgba(0,0,0,0.5)]")
        : (isMobile || isMaximized || isFullscreen ? "border-none" : "border border-border/30"),
      isMaximized || isFullscreen || isMobile ? "rounded-none" : (isMacOS ? "rounded-[12px]" : "rounded-[10px]")
    )}>
      {/* Invisible resize handles for easier edge/corner grabbing on desktop */}
      {!isMobile && !isMaximized && !isFullscreen && <WindowResizeHandles />}
      {/* Custom Title Bar */}
      {!isFullscreen && (
        <div
          data-tauri-drag-region
          className={cn(
            "flex items-center bg-sidebar/80 border-b-2 border-primary/10 flex-shrink-0 select-none cursor-default overflow-hidden z-50",
            !isMacOS && "backdrop-blur-md",
            isMobile ? "min-h-[calc(env(safe-area-inset-top,44px)+52px)] pt-[max(env(safe-area-inset-top,44px),44px)] pb-3" : "h-11",
            isMaximized || isFullscreen || isMobile ? "rounded-none" : (isMacOS ? "rounded-t-[12px]" : "rounded-t-[10px]")
          )}
        >
          {isMobile ? (
            // Mobile layout: simple branding
            <div className="flex items-center justify-between w-full px-5">
              <div className="flex items-center gap-3">
                <button
                  onClick={toggleSidebar}
                  className="p-2 -ml-2 hover:bg-surface-hover rounded-xl transition-all"
                  title="Sidebar"
                >
                  <Menu size={24} className="text-primary" />
                </button>
                <NeonIcon size={24} />
                <span className="text-[14px] font-bold tracking-wider text-text uppercase">
                  JPad
                </span>
              </div>
              {/* Center: File Name (smaller on mobile) */}
              <div className="flex-1 h-full flex items-center justify-center overflow-hidden pointer-events-none px-4">
                {activeFile && (
                  <span className="text-[12px] text-text/30 font-medium truncate tracking-wider uppercase">
                    {activeFile?.name}
                  </span>
                )}
              </div>
              <div className="w-10" />
            </div>
          ) : isMacOS ? (
            // macOS layout with native traffic lights (decorations: true)
            <>
              {/* Native system traffic lights will appear in the top-left area. 
                  We provide a spacer to keep the branding away from them. */}
              <div className="w-[72px] h-full flex-shrink-0" />

              <div className="flex items-center gap-2 pr-3 h-full flex-shrink-0">
                <button
                  onClick={toggleSidebar}
                  className="p-1.5 hover:bg-surface-hover rounded-md transition-all mr-1"
                  title="Toggle Sidebar (Ctrl+B)"
                >
                  <Menu size={16} className="text-primary" />
                </button>
                <NeonIcon size={32} />
                <span className="text-[11px] font-bold tracking-wide text-text uppercase">
                  JPad
                </span>
              </div>

              <div className="flex-1 h-full flex items-center justify-center overflow-hidden pointer-events-none">
                {activeFile && (
                  <span className="text-[11px] text-text/30 font-medium truncate max-w-[300px] tracking-wider uppercase">
                    {activeFile?.name}
                  </span>
                )}
              </div>

              {/* Spacer for symmetrical title look if needed */}
              <div className="w-[140px] flex-shrink-0" />
            </>
          ) : (
            // Windows/Linux layout...
            <>
              <div className="flex items-center gap-2 px-3 h-full flex-shrink-0">
                <button
                  onClick={toggleSidebar}
                  className="p-1.5 hover:bg-surface-hover rounded-md transition-all mr-1"
                  title="Toggle Sidebar"
                >
                  <Menu size={16} className="text-primary" />
                </button>
                <NeonIcon size={32} />
                <span className="text-[11px] font-bold tracking-wide text-text uppercase">
                  JPad
                </span>
              </div>

              <div className="flex-1 h-full flex items-center justify-center overflow-hidden pointer-events-none">
                {activeFile && (
                  <span className="text-[11px] text-text/30 font-medium truncate max-w-[300px] tracking-wider uppercase">
                    {activeFile?.name}
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
      )}

      <div className="flex flex-1 overflow-hidden">
        {/* Floating Sidebar Toggle - REMOVED for mobile header menu */}

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
              style={{ width: isMobile ? "100%" : sidebarWidth }}
              className={cn(
                "flex-shrink-0 relative h-full transition-all duration-300",
                isMobile && "fixed inset-y-0 left-0 z-[100] bg-sidebar shadow-2xl animate-in slide-in-from-left duration-300"
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

        <main className="flex-1 flex flex-col overflow-hidden bg-transparent relative min-h-0">
          <div className="flex-1 flex flex-col overflow-hidden relative min-h-0 bg-background/20">
            <Editor />
          </div>
          <StatusBar />
        </main>
      </div>
      {settingsOpen && <Settings />}
    </div>
  );
}
