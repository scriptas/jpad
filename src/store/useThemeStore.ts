import { create } from "zustand";
import { persist } from "zustand/middleware";

export interface ThemeColors {
    primary: string;
    primaryHover: string;
    background: string;
    sidebar: string;
    surface: string;
    surfaceHover: string;
    text: string;
    textMuted: string;
    border: string;
}

export interface Theme {
    id: string;
    name: string;
    colors: ThemeColors;
    isCustom?: boolean;
}

// ── Built-in theme presets ──

export const PRESET_THEMES: Theme[] = [
    {
        id: "cyberpunk-vibe",
        name: "Cyberpunk Vibe",
        colors: {
            primary: "#00f5ff",
            primaryHover: "#70f9ff",
            background: "#020205",
            sidebar: "#050510",
            surface: "#0f0f20",
            surfaceHover: "#1a1a35",
            text: "#ffffff",
            textMuted: "#00f5ff",
            border: "#ff00ff88",
        },
    },
    {
        id: "pure-white",
        name: "Clean Light",
        colors: {
            primary: "#1a73e8",
            primaryHover: "#1557b0",
            background: "#ffffff",
            sidebar: "#f8f9fa",
            surface: "#f1f3f4",
            surfaceHover: "#e8eaed",
            text: "#101010",
            textMuted: "#5f6368",
            border: "#dadce0",
        },
    },
    {
        id: "sandy-warmth",
        name: "Sandy Warmth",
        colors: {
            primary: "#ff8c42",
            primaryHover: "#ffa66a",
            background: "#0c0a09",
            sidebar: "#060504",
            surface: "#1a1614",
            surfaceHover: "#2d241e",
            text: "#ffffff",
            textMuted: "#d4c8b8",
            border: "#3a3028",
        },
    },
    {
        id: "nordic-night",
        name: "Nordic Night",
        colors: {
            primary: "#88c0d0",
            primaryHover: "#8fbcbb",
            background: "#12141a",
            sidebar: "#0b0c10",
            surface: "#1e222a",
            surfaceHover: "#2e3440",
            text: "#ffffff",
            textMuted: "#88c0d0",
            border: "#3b4252",
        },
    },
    {
        id: "solar-light",
        name: "Solarized Light",
        colors: {
            primary: "#b58900",
            primaryHover: "#cb4b16",
            background: "#fdf6e3",
            sidebar: "#eee8d5",
            surface: "#fffcf0",
            surfaceHover: "#f5f0dc",
            text: "#002b36",
            textMuted: "#586e75",
            border: "#ccc1a8",
        },
    },
    {
        id: "midnight-deep",
        name: "Midnight Deep",
        colors: {
            primary: "#7c4dff",
            primaryHover: "#9e7aff",
            background: "#02040a",
            sidebar: "#010204",
            surface: "#0d1117",
            surfaceHover: "#161b22",
            text: "#ffffff",
            textMuted: "#7d8590",
            border: "#30363d",
        },
    },
    {
        id: "sakura-bloom",
        name: "Sakura Bloom",
        colors: {
            primary: "#d23669",
            primaryHover: "#ec4899",
            background: "#fff5f7",
            sidebar: "#ffe4e9",
            surface: "#ffffff",
            surfaceHover: "#fee2e7",
            text: "#33000d",
            textMuted: "#701a2f",
            border: "#fbcfe8",
        },
    },
    {
        id: "matcha-latte",
        name: "Matcha Latte",
        colors: {
            primary: "#3d7a24",
            primaryHover: "#4d912e",
            background: "#f7fee7",
            sidebar: "#ecfccb",
            surface: "#ffffff",
            surfaceHover: "#d9f99d",
            text: "#0a1508",
            textMuted: "#2d4a22",
            border: "#bef264",
        },
    },
    {
        id: "sunset-vivid",
        name: "Sunset Vivid",
        colors: {
            primary: "#c2410c",
            primaryHover: "#ea580c",
            background: "#fffaf5",
            sidebar: "#ffedd5",
            surface: "#ffffff",
            surfaceHover: "#fed7aa",
            text: "#200801",
            textMuted: "#7c2d12",
            border: "#fdba74",
        },
    },
    {
        id: "vanta-black",
        name: "Vanta Black",
        colors: {
            primary: "#ffffff",
            primaryHover: "#888888",
            background: "#000000",
            sidebar: "#000000",
            surface: "#0a0a0a",
            surfaceHover: "#111111",
            text: "#ffffff",
            textMuted: "#b0b0b0",
            border: "#222222",
        },
    },
    {
        id: "paper-white",
        name: "Paper White",
        colors: {
            primary: "#000000",
            primaryHover: "#444444",
            background: "#ffffff",
            sidebar: "#fafafa",
            surface: "#f5f5f5",
            surfaceHover: "#eeeeee",
            text: "#000000",
            textMuted: "#666666",
            border: "#e5e5e5",
        },
    },
];

interface ThemeState {
    activeThemeId: string;
    customThemes: Theme[];
    settingsOpen: boolean;

    // Actions
    setActiveTheme: (id: string) => void;
    addCustomTheme: (theme: Theme) => void;
    updateCustomTheme: (id: string, colors: ThemeColors) => void;
    deleteCustomTheme: (id: string) => void;
    renameCustomTheme: (id: string, name: string) => void;
    toggleSettings: () => void;
    setSettingsOpen: (open: boolean) => void;
    getActiveTheme: () => Theme;
    getAllThemes: () => Theme[];
}

export const useThemeStore = create<ThemeState>()(
    persist(
        (set, get) => ({
            activeThemeId: "cyberpunk-vibe",
            customThemes: [],
            settingsOpen: false,

            setActiveTheme: (id) => {
                set({ activeThemeId: id });
                const theme =
                    PRESET_THEMES.find((t) => t.id === id) ||
                    get().customThemes.find((t) => t.id === id);
                if (theme) applyThemeToDOM(theme.colors);
            },

            addCustomTheme: (theme) =>
                set((state) => ({
                    customThemes: [...state.customThemes, { ...theme, isCustom: true }],
                })),

            updateCustomTheme: (id, colors) =>
                set((state) => ({
                    customThemes: state.customThemes.map((t) =>
                        t.id === id ? { ...t, colors } : t
                    ),
                })),

            deleteCustomTheme: (id) =>
                set((state) => ({
                    customThemes: state.customThemes.filter((t) => t.id !== id),
                    activeThemeId:
                        state.activeThemeId === id ? "sandy-warmth" : state.activeThemeId,
                })),

            renameCustomTheme: (id, name) =>
                set((state) => ({
                    customThemes: state.customThemes.map((t) =>
                        t.id === id ? { ...t, name } : t
                    ),
                })),

            toggleSettings: () =>
                set((state) => ({ settingsOpen: !state.settingsOpen })),

            setSettingsOpen: (open) => set({ settingsOpen: open }),

            getActiveTheme: () => {
                const { activeThemeId, customThemes } = get();
                return (
                    PRESET_THEMES.find((t) => t.id === activeThemeId) ||
                    customThemes.find((t) => t.id === activeThemeId) ||
                    PRESET_THEMES[0]
                );
            },

            getAllThemes: () => {
                return [...PRESET_THEMES, ...get().customThemes];
            },
        }),
        {
            name: "jpad-theme",
            partialize: (state) => ({
                activeThemeId: state.activeThemeId,
                customThemes: state.customThemes,
            }),
        }
    )
);

/** Apply theme CSS custom properties to :root */
export function applyThemeToDOM(colors: ThemeColors) {
    const root = document.documentElement;
    root.style.setProperty("--color-primary", colors.primary);
    root.style.setProperty("--color-primary-hover", colors.primaryHover);
    root.style.setProperty("--color-background", colors.background);
    root.style.setProperty("--color-sidebar", colors.sidebar);
    root.style.setProperty("--color-surface", colors.surface);
    root.style.setProperty("--color-surface-hover", colors.surfaceHover);
    root.style.setProperty("--color-text", colors.text);
    root.style.setProperty("--color-text-muted", colors.textMuted);
    root.style.setProperty("--color-border", colors.border);
}

/** Initialize theme on app start */
export function initializeTheme() {
    const state = useThemeStore.getState();
    const theme = state.getActiveTheme();
    applyThemeToDOM(theme.colors);
}
