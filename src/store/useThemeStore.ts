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
        id: "deep-ocean",
        name: "Deep Ocean",
        colors: {
            primary: "#38bdf8",
            primaryHover: "#7dd3fc",
            background: "#030712",
            sidebar: "#020617",
            surface: "#0f172a",
            surfaceHover: "#1e293b",
            text: "#ffffff",
            textMuted: "#7dd3fc",
            border: "#334155",
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
        id: "graphite-slate",
        name: "Graphite Slate",
        colors: {
            primary: "#94a3b8",
            primaryHover: "#cbd5e1",
            background: "#18181b",
            sidebar: "#101012",
            surface: "#27272a",
            surfaceHover: "#3f3f46",
            text: "#f4f4f5",
            textMuted: "#a1a1aa",
            border: "#3f3f46",
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
        id: "royal-amethyst",
        name: "Royal Amethyst",
        colors: {
            primary: "#a855f7",
            primaryHover: "#c084fc",
            background: "#0a0612",
            sidebar: "#05030a",
            surface: "#180f28",
            surfaceHover: "#26183f",
            text: "#ffffff",
            textMuted: "#c084fc",
            border: "#3b2359",
        },
    },
    {
        id: "lilac-mist",
        name: "Lilac Mist",
        colors: {
            primary: "#8b5cf6",
            primaryHover: "#a78bfa",
            background: "#f5f3ff",
            sidebar: "#ede9fe",
            surface: "#ffffff",
            surfaceHover: "#ddd6fe",
            text: "#1e1b4b",
            textMuted: "#6d28d9",
            border: "#ddd6fe",
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
        id: "terracotta-clay",
        name: "Terracotta Clay",
        colors: {
            primary: "#b45309",
            primaryHover: "#d97706",
            background: "#fdf8f3",
            sidebar: "#f5ebe0",
            surface: "#ffffff",
            surfaceHover: "#ede0d1",
            text: "#3f2a14",
            textMuted: "#8a6240",
            border: "#e7d5bf",
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
    showNeonBorder: boolean;

    // Actions
    setActiveTheme: (id: string) => void;
    addCustomTheme: (theme: Theme) => void;
    updateCustomTheme: (id: string, colors: ThemeColors) => void;
    deleteCustomTheme: (id: string) => void;
    renameCustomTheme: (id: string, name: string) => void;
    toggleSettings: () => void;
    setSettingsOpen: (open: boolean) => void;
    setShowNeonBorder: (show: boolean) => void;
    getActiveTheme: () => Theme;
    getAllThemes: () => Theme[];
}

export const useThemeStore = create<ThemeState>()(
    persist(
        (set, get) => ({
            activeThemeId: "cyberpunk-vibe",
            customThemes: [],
            settingsOpen: false,
            showNeonBorder: false,

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
                        state.activeThemeId === id ? "cyberpunk-vibe" : state.activeThemeId,
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

            setShowNeonBorder: (show) => set({ showNeonBorder: show }),

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
                showNeonBorder: state.showNeonBorder,
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

    updateSystemUI(colors);
}

/** 
 * Update system-level UI elements like status bar style and theme color.
 * This helps mobile OS (Android/iOS) to adapt the top bar text/icon color.
 */
async function updateSystemUI(colors: ThemeColors) {
    const root = document.documentElement;

    // Determine if the theme is dark based on background luminance
    const isDark = (color: string) => {
        const hex = color.replace('#', '');
        if (hex.length < 6) return true; // Default to dark for short/invalid hex
        const r = parseInt(hex.substring(0, 2), 16);
        const g = parseInt(hex.substring(2, 4), 16);
        const b = parseInt(hex.substring(4, 6), 16);
        const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
        return luminance < 0.5;
    };

    const dark = isDark(colors.background);

    // 1. Set color-scheme to let the browser/webview know our preference.
    // This often automatically toggles the status bar text color on mobile.
    root.style.colorScheme = dark ? 'dark' : 'light';

    // 2. Update/Create the theme-color meta tag for mobile status bar background.
    let meta = document.querySelector('meta[name="theme-color"]');
    if (!meta) {
        meta = document.createElement('meta');
        meta.setAttribute('name', 'theme-color');
        document.head.appendChild(meta);
    }
    // Use sidebar color if available, otherwise background
    meta.setAttribute('content', colors.sidebar || colors.background);

    // 3. For Android WebView, call the JavaScript interface directly
    // This is more reliable than trying to use Tauri plugins
    if ((window as any).AndroidStatusBar) {
        try {
            (window as any).AndroidStatusBar.setStyle(dark);
        } catch (error) {
            console.debug('AndroidStatusBar interface not available:', error);
        }
    }

    // 4. Additional fallback: Use viewport-fit and safe-area-inset
    // This helps ensure the status bar is properly styled
    let viewport = document.querySelector('meta[name="viewport"]');
    if (viewport) {
        const content = viewport.getAttribute('content') || '';
        if (!content.includes('viewport-fit')) {
            viewport.setAttribute('content', content + ', viewport-fit=cover');
        }
    }
}

/** Initialize theme on app start */
export function initializeTheme() {
    const state = useThemeStore.getState();
    const theme = state.getActiveTheme();
    applyThemeToDOM(theme.colors);
}
