import { create } from "zustand";
import { invoke } from "@tauri-apps/api/core";

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

    // Actions
    refreshFiles: () => Promise<void>;
    setActiveFileId: (id: string | null) => void;
    toggleSidebar: () => void;
    saveActiveFile: (content: string) => Promise<void>;
    loadFileContent: (id: string) => Promise<string>;
    createFile: (path: string) => Promise<void>;
    createFolder: (path: string) => Promise<void>;
    deletePath: (path: string) => Promise<void>;
    renamePath: (oldPath: string, newPath: string) => Promise<void>;
    movePath: (oldPath: string, newPath: string) => Promise<void>;
    setEditorContent: (content: string) => void;
    setSelectedContent: (content: string) => void;
    searchFiles: (query: string) => Promise<void>;
    clearSearch: () => void;
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
            if (activeFileId && !findFileNode(files, activeFileId)) {
                // Active file was deleted externally, clear it
                set({ activeFileId: null, editorContent: "" });
            }
            
            set({ files });
        } catch (error) {
            console.error("Failed to list files:", error);
        }
    },

    setActiveFileId: (id) => set({ activeFileId: id }),

    toggleSidebar: () => set((state) => ({ sidebarVisible: !state.sidebarVisible })),

    saveActiveFile: async (content) => {
        const { activeFileId } = get();
        if (!activeFileId) return;
        set({ isSaving: true });
        try {
            await invoke("write_file", { path: activeFileId, content });
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
            set({ activeFileId: path }); // Instantly activate the new file
        } catch (error) {
            console.error("Failed to create file:", error);
        }
    },

    createFolder: async (path) => {
        try {
            await invoke("create_folder", { path });
            await get().refreshFiles();
        } catch (error) {
            const message = error instanceof Error ? error.message : String(error);
            console.error("Failed to create folder:", message);
            throw new Error(message);
        }
    },

    deletePath: async (path) => {
        try {
            await invoke("delete_path", { path });
            // If the deleted file was the active one, clear selection
            const { activeFileId } = get();
            if (activeFileId === path) {
                set({ activeFileId: null, editorContent: "" });
            }
            await get().refreshFiles();
        } catch (error) {
            console.error("Failed to delete:", error);
        }
    },

    renamePath: async (oldPath, newPath) => {
        try {
            await invoke("rename_path", { oldPath, newPath });
            // If the renamed file was active, update the active ID
            const { activeFileId } = get();
            if (activeFileId === oldPath) {
                set({ activeFileId: newPath });
            }
            await get().refreshFiles();
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
}));
