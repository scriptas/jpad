import { create } from "zustand";
import { persist } from "zustand/middleware";

interface SettingsState {
    fileNamePrefix: string;
    
    // Actions
    setFileNamePrefix: (prefix: string) => void;
}

export const useSettingsStore = create<SettingsState>()(
    persist(
        (set) => ({
            fileNamePrefix: "note",
            
            setFileNamePrefix: (prefix) => set({ fileNamePrefix: prefix }),
        }),
        {
            name: "jpad-settings",
        }
    )
);