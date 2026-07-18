import { create } from "zustand";
import { persist } from "zustand/middleware";

interface SettingsState {
    fileNamePrefix: string;
    vimModeEnabled: boolean;
    pathColors: Record<string, string>; // mapping path -> color hex
    
    // Actions
    setFileNamePrefix: (prefix: string) => void;
    setVimModeEnabled: (enabled: boolean) => void;
    setPathColor: (path: string, color: string | null) => void;
    removePathColor: (path: string) => void;
    renamePathColors: (oldPath: string, newPath: string) => void;
}

export const useSettingsStore = create<SettingsState>()(
    persist(
        (set) => ({
            fileNamePrefix: "note",
            vimModeEnabled: false,
            pathColors: {},
            
            setFileNamePrefix: (prefix) => set({ fileNamePrefix: prefix }),
            setVimModeEnabled: (enabled) => set({ vimModeEnabled: enabled }),
            setPathColor: (path, color) => set((state) => {
                const newColors = { ...state.pathColors };
                if (color) {
                    newColors[path] = color;
                } else {
                    delete newColors[path];
                }
                return { pathColors: newColors };
            }),
            removePathColor: (path) => set((state) => {
                const newColors = { ...state.pathColors };
                // Also clean up any sub-paths if it's a folder
                Object.keys(newColors).forEach((key) => {
                    if (key === path || key.startsWith(path + "/")) {
                        delete newColors[key];
                    }
                });
                return { pathColors: newColors };
            }),
            renamePathColors: (oldPath, newPath) => set((state) => {
                const newColors = { ...state.pathColors };
                Object.keys(newColors).forEach((key) => {
                    if (key === oldPath) {
                        newColors[newPath] = newColors[oldPath];
                        delete newColors[oldPath];
                    } else if (key.startsWith(oldPath + "/")) {
                        const updatedKey = key.replace(oldPath, newPath);
                        newColors[updatedKey] = newColors[key];
                        delete newColors[key];
                    }
                });
                return { pathColors: newColors };
            }),
        }),
        {
            name: "jpad-settings",
        }
    )
);