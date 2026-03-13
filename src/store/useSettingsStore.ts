import { create } from "zustand";
import { persist } from "zustand/middleware";

interface SettingsState {
    fileNamePrefix: string;
    vimModeEnabled: boolean;
    
    // Actions
    setFileNamePrefix: (prefix: string) => void;
    setVimModeEnabled: (enabled: boolean) => void;
}

export const useSettingsStore = create<SettingsState>()(
    persist(
        (set) => ({
            fileNamePrefix: "note",
            vimModeEnabled: false,
            
            setFileNamePrefix: (prefix) => set({ fileNamePrefix: prefix }),
            setVimModeEnabled: (enabled) => set({ vimModeEnabled: enabled }),
        }),
        {
            name: "jpad-settings",
        }
    )
);