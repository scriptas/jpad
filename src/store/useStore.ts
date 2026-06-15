import { create } from "zustand";
import { invoke } from "@tauri-apps/api/core";
import type { VimMode } from "../hooks/useVimMode";

export interface VimState {
    mode: VimMode;
    commandBuffer: string;
    searchTerm: string;
    yankBuffer: string;
    count: string;
    searchMatches: number;
    currentMatch: number;
}

export interface FileNode {
    id: string; // path (forward-slash normalized)
    name: string;
    type: "file" | "folder";
    content?: string;
    children?: FileNode[];
    parentId?: string | null;
}

export interface SearchResult {
    path: string;
    name: string;
    match_type: "filename" | "content";
    preview?: string;
}

interface AppState {
    files: FileNode[];
    activeFileId: string | null;
    sidebarVisible: boolean;
    editorContent: string;
    selectedContent: string;
    isSaving: boolean;
    notesRoot: string;
    searchResults: SearchResult[];
    isSearching: boolean;
    vimState: VimState | null;
    selectedFiles: Set<string>;
    lastSelectedId: string | null;

    // Actions
    refreshFiles: () => Promise<void>;
    setActiveFileId: (id: string | null) => void;
    toggleSidebar: () => void;
    setSidebarVisible: (visible: boolean) => void;
    saveActiveFile: (content: string) => Promise<void>;
    loadFileContent: (id: string) => Promise<string>;
    createFile: (path: string) => Promise<void>;
    createFolder: (path: string) => Promise<void>;
    deletePath: (path: string) => Promise<void>;
    deletePaths: (paths: string[]) => Promise<void>;
    renamePath: (oldPath: string, newPath: string) => Promise<void>;
    movePath: (oldPath: string, newPath: string) => Promise<void>;
    setEditorContent: (content: string) => void;
    setSelectedContent: (content: string) => void;
    searchFiles: (query: string) => Promise<void>;
    clearSearch: () => void;
    setVimState: (state: VimState | null) => void;
    setSelectedFiles: (files: Set<string>) => void;
    setLastSelectedId: (id: string | null) => void;
    clearSelection: () => void;
}

/** Helper to find a file node recursively. */
export function findFileNode(nodes: FileNode[], id: string): FileNode | null {
    for (const node of nodes) {
        if (node.id === id) return node;
        if (node.children) {
            const found = findFileNode(node.children, id);
            if (found) return found;
        }
    }
    return null;
}

const triggerSync = () => {
    import("./useSyncStore").then(({ useSyncStore }) => {
        if (useSyncStore.getState().config.enabled) {
            useSyncStore.getState().syncNow().catch(console.error);
        }
    }).catch(console.error);
};

export const useStore = create<AppState>((set, get) => ({
    files: [],
    activeFileId: null,
    sidebarVisible: true,
    editorContent: "",
    selectedContent: "",
    isSaving: false,
    notesRoot: "",
    searchResults: [],
    isSearching: false,
    vimState: null,
    selectedFiles: new Set<string>(),
    lastSelectedId: null,

    refreshFiles: async () => {
        let { notesRoot, activeFileId } = get();
        try {
            // Resolve absolute notes root from Rust on first call
            if (!notesRoot) {
                notesRoot = await invoke<string>("get_notes_root");
                set({ notesRoot });
            }
            const files = await invoke<FileNode[]>("list_files", { path: notesRoot });

            // Check if the currently active file still exists
            const nextActiveId = activeFileId && findFileNode(files, activeFileId) ? activeFileId : null;
            if (activeFileId && !nextActiveId) {
                set({ editorContent: "" });
            }

            // Sync selectedFiles
            const { selectedFiles } = get();
            const nextSelected = new Set<string>();
            selectedFiles.forEach((id) => {
                if (findFileNode(files, id)) {
                    nextSelected.add(id);
                }
            });

            set({ files, activeFileId: nextActiveId, selectedFiles: nextSelected });
        } catch (error) {
            console.error("Failed to list files:", error);
        }
    },

    setActiveFileId: (id) => set({ activeFileId: id }),

    toggleSidebar: () => set((state) => ({ sidebarVisible: !state.sidebarVisible })),

    setSidebarVisible: (visible) => set({ sidebarVisible: visible }),

    saveActiveFile: async (content) => {
        const { activeFileId, notesRoot } = get();
        if (!activeFileId) return;
        set({ isSaving: true });
        try {
            await invoke("write_file", { path: activeFileId, content });

            // Push to cloud if enabled
            const { useSyncStore } = await import("./useSyncStore");
            const { config } = useSyncStore.getState();
            if (config.enabled) {
                const { syncService } = await import("../services/syncService");
                const { supabaseSyncService } = await import("../services/supabaseService");

                if (config.mode === "webdav") {
                    await syncService.pushFile(notesRoot, activeFileId);
                } else {
                    await supabaseSyncService.pushFile(notesRoot, activeFileId);
                }
            }
        } catch (error) {
            console.error("Failed to save file:", error);
        } finally {
            set({ isSaving: false });
        }
    },

    loadFileContent: async (id) => {
        try {
            const content = await invoke<string>("read_file", { path: id });
            set({ editorContent: content });
            return content;
        } catch (error) {
            console.error("Failed to read file:", error);
            // File might have been deleted externally
            set({ activeFileId: null, editorContent: "" });
            await get().refreshFiles();
            return "";
        }
    },

    createFile: async (path) => {
        try {
            await invoke("create_file", { path });
            await get().refreshFiles();
            set({ activeFileId: path, lastSelectedId: path, selectedFiles: new Set([path]) }); // Instantly activate and select the new file
            triggerSync();
        } catch (error) {
            console.error("Failed to create file:", error);
        }
    },

    createFolder: async (path) => {
        try {
            await invoke("create_folder", { path });
            await get().refreshFiles();
            set({ lastSelectedId: path, selectedFiles: new Set([path]) });
            triggerSync();
        } catch (error) {
            const message = error instanceof Error ? error.message : String(error);
            console.error("Failed to create folder:", message);
            throw new Error(message);
        }
    },

    deletePath: async (path: string) => {
        try {
            const { activeFileId, setActiveFileId, refreshFiles, notesRoot } = get();

            // Notify cloud sync if enabled
            const { useSyncStore } = await import("./useSyncStore");
            const { config } = useSyncStore.getState();
            if (config.enabled) {
                const { syncService } = await import("../services/syncService");
                const { supabaseSyncService } = await import("../services/supabaseService");
                
                let relativePath = path.replace(notesRoot, '');
                relativePath = relativePath.replace(/\\/g, '/');
                const cleanPath = relativePath.startsWith('/') ? relativePath.slice(1) : relativePath;

                try {
                    if (config.mode === "webdav") {
                        await (syncService as any).deleteRemoteFile(cleanPath);
                    } else {
                        await (supabaseSyncService as any).deleteRemoteFile(cleanPath);
                    }
                } catch (e) {
                    console.error('Failed to delete from cloud:', e);
                }
            }

            await invoke("delete_path", { path });
            await refreshFiles();
            if (activeFileId === path) {
                setActiveFileId(null);
            }
            triggerSync();
        } catch (error) {
            console.error("Failed to delete path:", error);
            throw error;
        }
    },
    deletePaths: async (paths: string[]) => {
        try {
            const { activeFileId, setActiveFileId, refreshFiles, notesRoot } = get();

            // Notify cloud sync if enabled
            const { useSyncStore } = await import("./useSyncStore");
            const { config } = useSyncStore.getState();
            if (config.enabled) {
                const { syncService } = await import("../services/syncService");
                const { supabaseSyncService } = await import("../services/supabaseService");
                
                for (const path of paths) {
                    let relativePath = path.replace(notesRoot, '');
                    relativePath = relativePath.replace(/\\/g, '/');
                    const cleanPath = relativePath.startsWith('/') ? relativePath.slice(1) : relativePath;
                    
                    try {
                        if (config.mode === "webdav") {
                            await (syncService as any).deleteRemoteFile(cleanPath);
                        } else {
                            await (supabaseSyncService as any).deleteRemoteFile(cleanPath);
                        }
                    } catch (e) {
                        console.error('Failed to delete from cloud:', e);
                    }
                }
            }

            await invoke("delete_paths", { paths });
            await refreshFiles();
            if (activeFileId && paths.includes(activeFileId)) {
                setActiveFileId(null);
            }
            triggerSync();
        } catch (error) {
            console.error("Failed to delete paths:", error);
            throw error;
        }
    },

    renamePath: async (oldPath, newPath) => {
        try {
            await invoke("rename_path", { oldPath, newPath });
            // If the renamed path was the active file or a parent folder of the active file
            const { activeFileId } = get();
            if (activeFileId === oldPath) {
                set({ activeFileId: newPath });
            } else if (activeFileId?.startsWith(oldPath + "/")) {
                const updatedPath = activeFileId.replace(oldPath, newPath);
                set({ activeFileId: updatedPath });
            }
            await get().refreshFiles();
            triggerSync();
        } catch (error) {
            console.error("Failed to rename:", error);
        }
    },

    movePath: async (oldPath, newPath) => {
        try {
            await invoke("rename_path", { oldPath, newPath });
            const { activeFileId } = get();
            if (activeFileId === oldPath) {
                set({ activeFileId: newPath });
            }
            await get().refreshFiles();
            triggerSync();
        } catch (error) {
            console.error("Failed to move:", error);
        }
    },

    setEditorContent: (content) => set({ editorContent: content }),

    setSelectedContent: (content) => set({ selectedContent: content }),

    searchFiles: async (query) => {
        const { notesRoot } = get();
        if (!query.trim()) {
            set({ searchResults: [], isSearching: false });
            return;
        }

        set({ isSearching: true });
        try {
            const results = await invoke<SearchResult[]>("search_files", {
                rootPath: notesRoot,
                query: query.trim(),
            });
            set({ searchResults: results, isSearching: false });
        } catch (error) {
            console.error("Search failed:", error);
            set({ searchResults: [], isSearching: false });
        }
    },

    clearSearch: () => set({ searchResults: [], isSearching: false }),

    setVimState: (state) => set({ vimState: state }),

    setSelectedFiles: (files) => set({ selectedFiles: files }),

    setLastSelectedId: (id) => set({ lastSelectedId: id }),

    clearSelection: () => set({ selectedFiles: new Set(), lastSelectedId: null }),
}));
