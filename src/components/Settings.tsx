import { useState, useRef, useEffect } from "react";
import {
    X,
    Palette,
    Plus,
    Trash2,
    Check,
    Pencil,
    Copy,
    RotateCcw,
    Sparkles,
    ChevronRight,
    FileText,
    Cloud,
    Download,
    ArrowUpCircle,
    ExternalLink,
    RefreshCw,
    Loader2,
    Import,
} from "lucide-react";
import SyncSettings from "./SyncSettings";
import { useUpdateStore } from "../store/useUpdateStore";
import {
    useThemeStore,
    PRESET_THEMES,
    applyThemeToDOM,
    type Theme,
    type ThemeColors,
} from "../store/useThemeStore";
import { useStore } from "../store/useStore";
import { migrateFolder } from "../services/migrationService";
import { invoke } from "@tauri-apps/api/core";
import { useSettingsStore } from "../store/useSettingsStore";
import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";
import { platform } from "@tauri-apps/plugin-os";

function cn(...inputs: ClassValue[]) {
    return twMerge(clsx(inputs));
}

// Dynamically loaded inside component if needed

/** Color label mapping for the editor */
const COLOR_LABELS: { key: keyof ThemeColors; label: string; description: string }[] = [

    { key: "primary", label: "Accent", description: "Primary accent color used for highlights and buttons" },
    { key: "primaryHover", label: "Accent Hover", description: "Hover state for accent elements" },
    { key: "background", label: "Background", description: "Main editor background" },
    { key: "sidebar", label: "Sidebar", description: "Sidebar panel background" },
    { key: "surface", label: "Surface", description: "Cards, inputs, and elevated elements" },
    { key: "surfaceHover", label: "Surface Hover", description: "Hover state for surface elements" },
    { key: "text", label: "Text", description: "Primary text color" },
    { key: "textMuted", label: "Muted Text", description: "Secondary text and labels" },
    { key: "border", label: "Border", description: "Borders and dividers" },
];

/** Generate a unique ID */
function generateId() {
    return `custom-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
}

/** Determine if a color is light */
function isLightColor(hex: string): boolean {
    const c = hex.replace("#", "");
    const r = parseInt(c.substring(0, 2), 16);
    const g = parseInt(c.substring(2, 4), 16);
    const b = parseInt(c.substring(4, 6), 16);
    const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
    return luminance > 0.5;
}

/** Mini theme preview component */
function ThemePreviewCard({
    theme,
    isActive,
    onClick,
    onDelete,
    onDuplicate,
}: {
    theme: Theme;
    isActive: boolean;
    onClick: () => void;
    onDelete?: () => void;
    onDuplicate?: () => void;
}) {
    const { colors } = theme;

    return (
        <button
            onClick={onClick}
            className={cn(
                "relative group rounded-xl p-0.5 transition-all duration-300 cursor-pointer text-left",
                "hover:scale-[1.03] active:scale-[0.98]",
                isActive
                    ? "ring-2 ring-primary shadow-lg shadow-primary/20"
                    : "ring-1 ring-border/50 hover:ring-border"
            )}
        >
            {/* Theme mini preview */}
            <div
                className="rounded-[10px] overflow-hidden h-[100px] w-full relative"
                style={{ backgroundColor: colors.background }}
            >
                {/* Fake sidebar */}
                <div
                    className="absolute left-0 top-0 bottom-0 w-[30%]"
                    style={{ backgroundColor: colors.sidebar, borderRight: `1px solid ${colors.border}` }}
                >
                    {/* Sidebar items */}
                    <div className="pt-3 px-1.5 space-y-1">
                        <div
                            className="h-1.5 rounded-sm"
                            style={{ backgroundColor: colors.primary, opacity: 0.6, width: "70%" }}
                        />
                        <div
                            className="h-1.5 rounded-sm"
                            style={{ backgroundColor: colors.textMuted, opacity: 0.3, width: "55%" }}
                        />
                        <div
                            className="h-1.5 rounded-sm"
                            style={{ backgroundColor: colors.textMuted, opacity: 0.3, width: "80%" }}
                        />
                        <div
                            className="h-1.5 rounded-sm"
                            style={{ backgroundColor: colors.textMuted, opacity: 0.3, width: "45%" }}
                        />
                    </div>
                </div>

                {/* Fake editor area */}
                <div className="absolute left-[30%] top-0 right-0 bottom-0 p-2 pt-3">
                    {/* Title bar accent */}
                    <div
                        className="h-1 w-8 rounded-full mb-2"
                        style={{ backgroundColor: colors.primary, opacity: 0.8 }}
                    />
                    {/* Text lines */}
                    <div className="space-y-1.5">
                        <div
                            className="h-1 rounded-full"
                            style={{ backgroundColor: colors.text, opacity: 0.5, width: "90%" }}
                        />
                        <div
                            className="h-1 rounded-full"
                            style={{ backgroundColor: colors.text, opacity: 0.35, width: "75%" }}
                        />
                        <div
                            className="h-1 rounded-full"
                            style={{ backgroundColor: colors.text, opacity: 0.25, width: "60%" }}
                        />
                        <div
                            className="h-1 rounded-full"
                            style={{ backgroundColor: colors.textMuted, opacity: 0.2, width: "85%" }}
                        />
                    </div>
                </div>

                {/* Active indicator */}
                {isActive && (
                    <div
                        className="absolute top-2 right-2 w-5 h-5 rounded-full flex items-center justify-center"
                        style={{ backgroundColor: colors.primary }}
                    >
                        <Check size={12} style={{ color: isLightColor(colors.primary) ? "#000" : "#fff" }} />
                    </div>
                )}
            </div>

            {/* Theme name */}
            <div className="px-2 py-2 flex items-center justify-between">
                <span className="text-xs font-medium text-text truncate">
                    {theme.name}
                </span>
                <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                    {onDuplicate && (
                        <button
                            onClick={(e) => {
                                e.stopPropagation();
                                onDuplicate();
                            }}
                            className="p-1 rounded hover:bg-surface-hover transition-colors"
                            title="Duplicate theme"
                        >
                            <Copy size={10} className="text-text-muted" />
                        </button>
                    )}
                    {onDelete && (
                        <button
                            onClick={(e) => {
                                e.stopPropagation();
                                onDelete();
                            }}
                            className="p-1 rounded hover:bg-red-500/20 transition-colors"
                            title="Delete theme"
                        >
                            <Trash2 size={10} className="text-red-400" />
                        </button>
                    )}
                </div>
            </div>
        </button>
    );
}

/** Color picker row for custom theme editor */
function ColorRow({
    label,
    description,
    color,
    onChange,
}: {
    label: string;
    description: string;
    color: string;
    onChange: (value: string) => void;
}) {
    const inputRef = useRef<HTMLInputElement>(null);

    return (
        <div className="flex items-center gap-3 py-2.5 px-1 group">
            {/* Color swatch + native picker */}
            <div
                className="relative w-9 h-9 rounded-lg cursor-pointer ring-1 ring-border/50 group-hover:ring-border transition-all overflow-hidden flex-shrink-0 shadow-sm"
                onClick={() => inputRef.current?.click()}
            >
                <div className="absolute inset-0" style={{ backgroundColor: color }} />
                <input
                    ref={inputRef}
                    type="color"
                    value={color}
                    onChange={(e) => onChange(e.target.value)}
                    className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
                />
            </div>

            {/* Label + description */}
            <div className="flex-1 min-w-0">
                <div className="text-xs font-medium text-text">{label}</div>
                <div className="text-[10px] text-text-muted/60 leading-tight">{description}</div>
            </div>

            {/* Hex value */}
            <input
                type="text"
                value={color.toUpperCase()}
                onChange={(e) => {
                    const val = e.target.value;
                    if (/^#[0-9A-Fa-f]{0,6}$/.test(val)) onChange(val);
                }}
                className="w-[76px] text-[11px] font-mono bg-surface/60 border border-border/40 rounded-md px-2 py-1.5 text-text text-center focus:outline-none focus:ring-1 focus:ring-primary/40 transition-all"
            />
        </div>
    );
}

/** File name prefix setting component */
function FileNamePrefixSetting() {
    const { fileNamePrefix, setFileNamePrefix } = useSettingsStore();
    const [inputValue, setInputValue] = useState(fileNamePrefix);
    const [isEditing, setIsEditing] = useState(false);

    const handleSave = () => {
        const trimmed = inputValue.trim();
        if (trimmed && trimmed.length <= 20) {
            setFileNamePrefix(trimmed);
            setIsEditing(false);
        }
    };

    const handleCancel = () => {
        setInputValue(fileNamePrefix);
        setIsEditing(false);
    };

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === "Enter") {
            handleSave();
        } else if (e.key === "Escape") {
            handleCancel();
        }
    };

    return (
        <div className="flex items-center justify-between">
            <div className="flex-1">
                <div className="text-xs font-medium text-text mb-1">Default File Name</div>
                <div className="text-[10px] text-text-muted/60 leading-tight">
                    Prefix for new files (e.g., "note-123.jt")
                </div>
            </div>
            <div className="flex items-center gap-2">
                {isEditing ? (
                    <>
                        <input
                            type="text"
                            value={inputValue}
                            onChange={(e) => setInputValue(e.target.value)}
                            onKeyDown={handleKeyDown}
                            maxLength={20}
                            className="w-24 text-xs bg-surface border border-border rounded-md px-2 py-1 text-text focus:outline-none focus:ring-1 focus:ring-primary/40"
                            placeholder="note"
                            autoFocus
                        />
                        <button
                            onClick={handleSave}
                            disabled={!inputValue.trim() || inputValue.trim().length > 20}
                            className="p-1 rounded hover:bg-surface-hover transition-colors disabled:opacity-50"
                        >
                            <Check size={12} className="text-green-400" />
                        </button>
                        <button
                            onClick={handleCancel}
                            className="p-1 rounded hover:bg-surface-hover transition-colors"
                        >
                            <X size={12} className="text-red-400" />
                        </button>
                    </>
                ) : (
                    <>
                        <span className="text-xs font-mono bg-surface/60 border border-border/40 rounded px-2 py-1 text-text">
                            {fileNamePrefix}
                        </span>
                        <button
                            onClick={() => setIsEditing(true)}
                            className="p-1 rounded hover:bg-surface-hover transition-colors"
                        >
                            <Pencil size={12} className="text-text-muted" />
                        </button>
                    </>
                )}
            </div>
        </div>
    );
}

/** Vim mode toggle setting component */
function VimModeSetting() {
    const { vimModeEnabled, setVimModeEnabled } = useSettingsStore();

    return (
        <div className="flex items-center justify-between">
            <div className="flex-1">
                <div className="text-xs font-medium text-text mb-1">Vim Mode (BETA)</div>
                <div className="text-[10px] text-text-muted/60 leading-tight">
                    Enable vim keybindings for navigation and editing
                </div>
            </div>
            <button
                onClick={() => setVimModeEnabled(!vimModeEnabled)}
                className={cn(
                    "relative w-11 h-6 rounded-full transition-colors",
                    vimModeEnabled ? "bg-primary" : "bg-surface border border-border"
                )}
            >
                <div
                    className={cn(
                        "absolute top-0.5 w-5 h-5 rounded-full bg-white shadow-sm transition-transform",
                        vimModeEnabled ? "right-0.5" : "left-0.5"
                    )}
                />
            </button>
        </div>
    );
}

/** Neon border toggle setting component */
function NeonBorderSetting() {
    const { showNeonBorder, setShowNeonBorder } = useThemeStore();

    return (
        <div className="flex items-center justify-between">
            <div className="flex-1">
                <div className="text-xs font-medium text-text mb-1">Neon App Border</div>
                <div className="text-[10px] text-text-muted/60 leading-tight">
                    Add a glowing theme-colored border around the application
                </div>
            </div>
            <button
                onClick={() => setShowNeonBorder(!showNeonBorder)}
                className={cn(
                    "relative w-11 h-6 rounded-full transition-colors",
                    showNeonBorder ? "bg-primary" : "bg-surface border border-border"
                )}
            >
                <div
                    className={cn(
                        "absolute top-0.5 w-5 h-5 rounded-full bg-white shadow-sm transition-transform",
                        showNeonBorder ? "right-0.5" : "left-0.5"
                    )}
                />
            </button>
        </div>
    );
}

/** Update section for the settings panel */
function UpdateSection() {
    const {
        hasUpdate,
        latestRelease,
        currentVersion,
        checking,
        downloading,
        downloadProgress,
        error,
        lastChecked,
        checkForUpdates,
        downloadAndInstall,
        cancelDownload,
        getDownloadAsset,
    } = useUpdateStore();

    const asset = getDownloadAsset();

    const formatSize = (bytes: number) => {
        if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
        return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
    };

    const formatDate = (iso: string) => {
        if (!iso) return '';
        const d = new Date(iso);
        return d.toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' });
    };

    return (
        <div className="p-6">
            <div className="mb-6">
                <h3 className="text-sm font-semibold text-text mb-2">Software Updates</h3>
                <p className="text-xs text-text-muted/60">
                    Keep JPad up to date with the latest features and improvements
                </p>
            </div>

            {/* Current Version */}
            <div className="rounded-xl bg-surface/30 border border-border/30 p-5 mb-4">
                <div className="flex items-center justify-between">
                    <div>
                        <div className="text-[11px] text-text-muted/50 uppercase tracking-wider font-bold mb-1">
                            Current Version
                        </div>
                        <div className="text-lg font-bold text-text">
                            v{currentVersion}
                        </div>
                    </div>
                    <button
                        onClick={checkForUpdates}
                        disabled={checking}
                        className={cn(
                            "flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-medium transition-all",
                            checking
                                ? "bg-surface/60 text-text-muted cursor-wait"
                                : "bg-surface hover:bg-surface-hover text-text border border-border/40 hover:border-border"
                        )}
                    >
                        {checking ? (
                            <Loader2 size={14} className="animate-spin" />
                        ) : (
                            <RefreshCw size={14} />
                        )}
                        {checking ? "Checking..." : "Check for Updates"}
                    </button>
                </div>
                {lastChecked && (
                    <div className="text-[10px] text-text-muted/40 mt-2">
                        Last checked: {new Date(lastChecked).toLocaleString()}
                    </div>
                )}
            </div>

            {/* Update Available */}
            {hasUpdate && latestRelease && (
                <div className="rounded-xl bg-primary/5 border-2 border-primary/20 p-5 mb-4 animate-in fade-in duration-300">
                    <div className="flex items-start gap-4">
                        <div className="w-10 h-10 rounded-xl bg-primary/15 flex items-center justify-center flex-shrink-0">
                            <ArrowUpCircle size={20} className="text-primary" />
                        </div>
                        <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-1">
                                <h4 className="text-sm font-bold text-text">
                                    Update Available
                                </h4>
                                <span className="text-[10px] font-mono bg-primary/15 text-primary px-2 py-0.5 rounded-full">
                                    v{latestRelease.version}
                                </span>
                            </div>
                            <p className="text-xs text-text-muted/60 mb-1">
                                Published {formatDate(latestRelease.publishedAt)}
                            </p>
                            {asset && (
                                <p className="text-[10px] text-text-muted/40">
                                    {asset.name} • {formatSize(asset.size)}
                                </p>
                            )}
                        </div>
                    </div>

                    {/* Download Progress */}
                    {downloading && (
                        <div className="mt-4">
                            <div className="flex items-center justify-between mb-1.5">
                                <span className="text-[10px] text-text-muted font-medium">Downloading update...</span>
                                <span className="text-[10px] text-primary font-mono">{downloadProgress}%</span>
                            </div>
                            <div className="h-1.5 rounded-full bg-surface/60 overflow-hidden">
                                <div
                                    className="h-full rounded-full bg-primary transition-all duration-300"
                                    style={{ width: `${Math.max(downloadProgress, 5)}%` }}
                                />
                            </div>
                        </div>
                    )}                    {/* Action Buttons */}
                    <div className="flex items-center gap-3 mt-4">
                        <button
                            onClick={downloadAndInstall}
                            disabled={downloading || !asset}
                            className={cn(
                                "flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-bold transition-all",
                                downloading
                                    ? "bg-primary/30 text-primary/60 cursor-wait"
                                    : "bg-primary text-background hover:opacity-90 shadow-sm shadow-primary/20 hover:shadow-md hover:shadow-primary/30"
                            )}
                        >
                            {downloading ? (
                                <Loader2 size={14} className="animate-spin" />
                            ) : (
                                <Download size={14} />
                            )}
                            {downloading ? "Downloading..." : `Update to v${latestRelease.version}`}
                        </button>

                        {downloading && (
                            <button
                                onClick={cancelDownload}
                                className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl text-xs font-medium text-red-400 hover:text-red-300 hover:bg-red-500/10 transition-all border border-red-500/20"
                            >
                                <X size={14} />
                                Cancel
                            </button>
                        )}

                        {!downloading && latestRelease.htmlUrl && (
                            <a
                                href="#"
                                onClick={(e) => {
                                    e.preventDefault();
                                    import('@tauri-apps/plugin-opener').then(m => m.openUrl(latestRelease.htmlUrl));
                                }}
                                className="flex items-center gap-1.5 px-3 py-2.5 rounded-xl text-xs font-medium text-text-muted hover:text-text hover:bg-surface-hover transition-all border border-transparent hover:border-border/30"
                            >
                                <ExternalLink size={12} />
                                Release Notes
                            </a>
                        )}
                    </div>
                </div>
            )}

            {/* No Update Available */}
            {!hasUpdate && !checking && lastChecked && (
                <div className="rounded-xl bg-surface/30 border border-border/30 p-5 mb-4">
                    <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-lg bg-green-500/15 flex items-center justify-center">
                            <Check size={16} className="text-green-400" />
                        </div>
                        <div>
                            <div className="text-xs font-medium text-text">You're up to date!</div>
                            <div className="text-[10px] text-text-muted/50">
                                JPad v{currentVersion} is the latest version
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Error */}
            {error && (
                <div className="rounded-xl bg-red-500/5 border border-red-500/20 p-4 mb-4 animate-in fade-in duration-200">
                    <div className="flex items-start gap-2.5">
                        <X size={14} className="text-red-400 mt-0.5 flex-shrink-0" />
                        <div>
                            <div className="text-xs font-medium text-red-400 mb-0.5">Update Error</div>
                            <div className="text-[10px] text-text-muted/60">{error}</div>
                        </div>
                    </div>
                </div>
            )}

            {/* Info */}
            <div className="flex items-start gap-2.5 p-3 rounded-lg bg-primary/5 border border-primary/10 mt-2">
                <ChevronRight size={12} className="text-primary mt-0.5 flex-shrink-0" />
                <p className="text-[10px] text-text-muted/60 leading-relaxed">
                    <span className="text-text-muted/80 font-medium">Note:</span> JPad checks for updates automatically every 30 minutes. Updates are downloaded from GitHub releases and installed locally.
                </p>
            </div>
        </div>
    );
}

type SettingsSection = "appearance" | "filename" | "vim" | "cloud" | "update" | "migration";

function MigrationSettings() {
    const { notesRoot, refreshFiles } = useStore();
    const [sourceApp, setSourceApp] = useState<"obsidian" | "joplin" | null>(null);
    const [status, setStatus] = useState<{
        state: "idle" | "importing" | "success" | "error";
        current: number;
        total: number;
        currentFile: string;
        errorMsg?: string;
    }>({
        state: "idle",
        current: 0,
        total: 0,
        currentFile: ""
    });

    const handleFolderUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const files = e.target.files;
        if (!files || files.length === 0) return;

        setStatus({
            state: "importing",
            current: 0,
            total: 0,
            currentFile: "Scanning files..."
        });

        try {
            let resolvedRoot = notesRoot;
            if (!resolvedRoot) {
                resolvedRoot = await invoke<string>("get_notes_root");
            }

            await migrateFolder(files, resolvedRoot, (progress) => {
                setStatus({
                    state: "importing",
                    current: progress.current,
                    total: progress.total,
                    currentFile: progress.currentFile
                });
            });

            setStatus(prev => ({
                ...prev,
                state: "success"
            }));

            // Refresh store files so they immediately appear in the sidebar
            await refreshFiles();
        } catch (err: any) {
            console.error("Migration failed:", err);
            setStatus({
                state: "error",
                current: 0,
                total: 0,
                currentFile: "",
                errorMsg: err.message || String(err)
            });
        }
    };

    return (
        <div className="p-6 space-y-6">
            <div>
                <h3 className="text-sm font-semibold text-text mb-2">Import & Migrate Notes</h3>
                <p className="text-xs text-text-muted/60 leading-relaxed">
                    Easily import your existing notes from other applications. Your markdown files will be parsed, 
                    referenced local images will be embedded as base64 data, and they will be saved directly into your 
                    local JPad notes folder.
                </p>
            </div>

            <div className="rounded-xl border border-border/30 bg-surface/30 p-5 space-y-4">
                <h4 className="text-[11px] font-bold text-text uppercase tracking-wider">Select Source App</h4>
                <div className="grid grid-cols-2 gap-3">
                    <button 
                        onClick={() => {
                            setSourceApp("obsidian");
                            setStatus({ state: "idle", current: 0, total: 0, currentFile: "" });
                        }}
                        className={cn(
                            "p-4 rounded-xl border text-left transition-all cursor-pointer",
                            sourceApp === "obsidian" ? "border-primary bg-primary/5" : "border-border/30 bg-surface/20"
                        )}
                    >
                        <div className="font-semibold text-xs text-text">Obsidian Vault</div>
                        <div className="text-[10px] text-text-muted mt-1">Converts vault folder with markdown & attachments.</div>
                    </button>
                    <button 
                        onClick={() => {
                            setSourceApp("joplin");
                            setStatus({ state: "idle", current: 0, total: 0, currentFile: "" });
                        }}
                        className={cn(
                            "p-4 rounded-xl border text-left transition-all cursor-pointer",
                            sourceApp === "joplin" ? "border-primary bg-primary/5" : "border-border/30 bg-surface/20"
                        )}
                    >
                        <div className="font-semibold text-xs text-text">Joplin Export</div>
                        <div className="text-[10px] text-text-muted mt-1">Converts Joplin folder exported via "MD - Markdown".</div>
                    </button>
                </div>

                {sourceApp && status.state === "idle" && (
                    <div className="pt-2">
                        <label className="flex flex-col items-center justify-center border-2 border-dashed border-border/40 hover:border-primary/50 hover:bg-primary/5 rounded-xl p-8 cursor-pointer transition-all duration-300">
                            <input
                                type="file"
                                // @ts-ignore
                                webkitdirectory=""
                                directory=""
                                className="hidden"
                                onChange={handleFolderUpload}
                            />
                            <div className="text-center">
                                <Import size={24} className="text-primary mx-auto mb-2" />
                                <span className="text-xs font-semibold text-text">Choose Folder to Migrate</span>
                                <p className="text-[10px] text-text-muted/60 mt-1">Select the root directory of your vault or export</p>
                            </div>
                        </label>
                    </div>
                )}

                {status.state === "importing" && (
                    <div className="rounded-xl bg-surface/25 border border-border/10 p-5 space-y-3">
                        <div className="flex justify-between text-[11px]">
                            <span className="text-text font-medium">Migrating your notes...</span>
                            <span className="text-text-muted">{status.current} / {status.total} files</span>
                        </div>
                        <div className="w-full bg-surface-hover h-1.5 rounded-full overflow-hidden">
                            <div 
                                className="bg-primary h-full transition-all duration-300"
                                style={{ width: status.total > 0 ? `${(status.current / status.total) * 100}%` : "0%" }}
                            />
                        </div>
                        <p className="text-[9px] text-text-muted italic truncate">{status.currentFile}</p>
                    </div>
                )}

                {status.state === "success" && (
                    <div className="rounded-xl bg-green-500/10 border border-green-500/20 p-5 text-center space-y-2">
                        <div className="text-xs font-semibold text-green-400">Migration Completed Successfully!</div>
                        <p className="text-[10px] text-text-muted">
                            Imported {status.total} notes. Check your JPad sidebar to see the migrated folder structure.
                        </p>
                        <button 
                            onClick={() => {
                                setSourceApp(null);
                                setStatus({ state: "idle", current: 0, total: 0, currentFile: "" });
                            }}
                            className="mt-2 px-3 py-1.5 bg-green-500 hover:bg-green-600 text-black font-semibold text-[10px] rounded transition-all cursor-pointer"
                        >
                            Done
                        </button>
                    </div>
                )}

                {status.state === "error" && (
                    <div className="rounded-xl bg-red-500/10 border border-red-500/20 p-5 text-center space-y-2">
                        <div className="text-xs font-semibold text-red-400">Migration Failed</div>
                        <p className="text-[10px] text-text-muted italic">
                            Error: {status.errorMsg}
                        </p>
                        <button 
                            onClick={() => setStatus({ state: "idle", current: 0, total: 0, currentFile: "" })}
                            className="mt-2 px-3 py-1.5 bg-red-500 hover:bg-red-600 text-white font-semibold text-[10px] rounded transition-all cursor-pointer"
                        >
                            Try Again
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
}

export default function Settings() {
    const {
        activeThemeId,
        customThemes,
        setActiveTheme,
        addCustomTheme,
        updateCustomTheme,
        deleteCustomTheme,
        renameCustomTheme,
        setSettingsOpen,
        getActiveTheme,
    } = useThemeStore();

    const p = platform();
    const isMobile = p === "android" || p === "ios";

    // On mobile, start with no section selected (shows the menu list)
    const [activeSection, setActiveSection] = useState<SettingsSection | null>(isMobile ? null : "appearance");

    // Listen for the custom event to open a specific section (e.g. from StatusBar update pill)
    useEffect(() => {
        const handler = (e: Event) => {
            const section = (e as CustomEvent).detail as SettingsSection;
            if (section) setActiveSection(section);
        };
        window.addEventListener('jpad-open-settings-section', handler);
        return () => window.removeEventListener('jpad-open-settings-section', handler);
    }, []);
    const [editingTheme, setEditingTheme] = useState<Theme | null>(null);
    const [editColors, setEditColors] = useState<ThemeColors | null>(null);
    const [editName, setEditName] = useState("");
    const [isCreatingNew, setIsCreatingNew] = useState(false);
    const panelRef = useRef<HTMLDivElement>(null);
    const backdropRef = useRef<HTMLDivElement>(null);
    const headerRef = useRef<HTMLDivElement>(null);

    // Enable dragging on header (Desktop only)
    useEffect(() => {
        const p = platform();
        if (p === "android" || p === "ios") return;

        let desktopWindow: any = null;
        import("@tauri-apps/api/window").then(m => {
            desktopWindow = m.getCurrentWindow();
        });

        const handleMouseDown = (e: MouseEvent) => {
            if ((e.target as HTMLElement).closest("button, input, a")) return;
            if (e.buttons !== 1) return;
            desktopWindow?.startDragging();
        };

        const header = headerRef.current;

        if (header) {
            header.addEventListener("mousedown", handleMouseDown);
        }

        return () => {
            if (header) {
                header.removeEventListener("mousedown", handleMouseDown);
            }
        };
    }, []);

    // Focus settings panel on mount to capture keyboard events
    useEffect(() => {
        if (panelRef.current) {
            panelRef.current.focus();
        }
    }, []);

    // Preview changes live
    useEffect(() => {
        if (editColors) {
            applyThemeToDOM(editColors);
        }
    }, [editColors]);

    const handleClose = () => {
        if (editColors) {
            const activeTheme = getActiveTheme();
            applyThemeToDOM(activeTheme.colors);
        }
        setEditingTheme(null);
        setEditColors(null);
        setIsCreatingNew(false);
        setSettingsOpen(false);
    };

    // Exit settings on Escape key press
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === "Escape") {
                const target = e.target as HTMLElement;
                if (target && (target.tagName === "INPUT" || target.tagName === "TEXTAREA" || target.tagName === "SELECT")) {
                    return;
                }
                handleClose();
            }
        };
        window.addEventListener("keydown", handleKeyDown);
        return () => window.removeEventListener("keydown", handleKeyDown);
    }, [handleClose]);

    const handleSelectTheme = (theme: Theme) => {
        setActiveTheme(theme.id);
        setEditingTheme(null);
        setEditColors(null);
        setIsCreatingNew(false);
    };

    const handleEditTheme = (theme: Theme) => {
        setEditingTheme(theme);
        setEditColors({ ...theme.colors });
        setEditName(theme.name);
        setIsCreatingNew(false);
    };

    const handleCreateNew = () => {
        const activeTheme = getActiveTheme();
        const newTheme: Theme = {
            id: generateId(),
            name: "My Custom Theme",
            colors: { ...activeTheme.colors },
            isCustom: true,
        };
        setEditingTheme(newTheme);
        setEditColors({ ...newTheme.colors });
        setEditName(newTheme.name);
        setIsCreatingNew(true);
    };

    const handleDuplicateTheme = (theme: Theme) => {
        const newTheme: Theme = {
            id: generateId(),
            name: `${theme.name} Copy`,
            colors: { ...theme.colors },
            isCustom: true,
        };
        addCustomTheme(newTheme);
    };

    const handleSaveCustomTheme = () => {
        if (!editingTheme || !editColors) return;

        if (isCreatingNew) {
            const newTheme: Theme = {
                ...editingTheme,
                name: editName || "Custom Theme",
                colors: editColors,
                isCustom: true,
            };
            addCustomTheme(newTheme);
            setActiveTheme(newTheme.id);
        } else if (editingTheme.isCustom) {
            updateCustomTheme(editingTheme.id, editColors);
            if (editName !== editingTheme.name) {
                renameCustomTheme(editingTheme.id, editName);
            }
            if (activeThemeId === editingTheme.id) {
                applyThemeToDOM(editColors);
            }
        }

        setEditingTheme(null);
        setEditColors(null);
        setIsCreatingNew(false);
    };

    const handleCancelEdit = () => {
        const activeTheme = getActiveTheme();
        applyThemeToDOM(activeTheme.colors);
        setEditingTheme(null);
        setEditColors(null);
        setIsCreatingNew(false);
    };

    const handleDeleteCustomTheme = (id: string) => {
        if (window.confirm("Delete this custom theme?")) {
            deleteCustomTheme(id);
            if (editingTheme?.id === id) {
                setEditingTheme(null);
                setEditColors(null);
            }
        }
    };

    const handleColorChange = (key: keyof ThemeColors, value: string) => {
        if (!editColors) return;
        setEditColors({ ...editColors, [key]: value });
    };

    return (
        <div className="fixed inset-0 z-[200] flex items-center justify-center">
            {/* Backdrop */}
            <div
                ref={backdropRef}
                className="absolute inset-0 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200"
                onClick={handleClose}
            />

            {/* Settings Panel */}
            <div
                ref={panelRef}
                tabIndex={-1}
                className={cn(
                    "relative z-10 bg-sidebar border-2 border-border shadow-2xl shadow-black/40 flex flex-col overflow-hidden animate-in fade-in duration-300 outline-none",
                    isMobile
                        ? "fixed inset-0 w-full h-full border-none rounded-none"
                        : "w-[780px] max-h-[85vh] rounded-2xl zoom-in-95"
                )}
            >
                <div
                    ref={headerRef}
                    className={cn(
                        "flex items-center justify-between px-6 border-b-2 border-border bg-surface/30",
                        isMobile ? "pt-10 pb-4" : "py-4",
                        !isMobile && "cursor-move"
                    )}
                >
                    <div className="flex items-center gap-3">
                        {isMobile && activeSection && !editingTheme && (
                            <button
                                onClick={() => setActiveSection(null)}
                                className="p-2 -ml-2 hover:bg-surface-hover rounded-lg transition-colors mr-1"
                            >
                                <RotateCcw size={16} className="text-primary transform -rotate-90" />
                            </button>
                        )}
                        <div className="w-8 h-8 rounded-lg bg-primary/15 flex items-center justify-center">
                            <Palette size={16} className="text-primary" />
                        </div>
                        <div>
                            <h2 className="text-sm font-semibold text-text">
                                {isMobile && activeSection === "appearance" ? "Appearance" :
                                 isMobile && activeSection === "filename" ? "File Settings" :
                                 isMobile && activeSection === "vim" ? "Vim Mode" :
                                 isMobile && activeSection === "cloud" ? "Cloud Sync" :
                                 isMobile && activeSection === "update" ? "Updates" :
                                 isMobile && activeSection === "migration" ? "Migrate Notes" :
                                 "Settings"}
                            </h2>
                            <p className="text-[11px] text-text-muted/60">
                                {isMobile && activeSection ? "Customize your experience" : "Customize your editor"}
                            </p>
                        </div>
                    </div>
                    <button
                        onClick={handleClose}
                        className="p-2 hover:bg-surface-hover rounded-lg transition-colors"
                    >
                        <X size={16} className="text-text-muted" />
                    </button>
                </div>

                {/* Content with Sidebar */}
                <div className="flex-1 flex overflow-hidden">
                    {/* Sidebar Navigation */}
                    {(!isMobile || !activeSection) && (
                        <div className={cn(
                            "border-r-2 border-border bg-surface/20 p-3 overflow-y-auto transition-all",
                            isMobile ? "w-full" : "w-48"
                        )}>
                            <nav className="space-y-1.5">
                                <button
                                    onClick={() => {
                                        setActiveSection("appearance");
                                        if (editingTheme) handleCancelEdit();
                                    }}
                                    className={cn(
                                        "w-full flex items-center justify-between px-4 py-3.5 rounded-xl text-sm font-medium transition-all text-left",
                                        activeSection === "appearance"
                                            ? "bg-primary/15 text-primary border border-primary/20"
                                            : "text-text-muted hover:text-text hover:bg-surface-hover bg-surface/10 border border-transparent"
                                    )}
                                >
                                    <div className="flex items-center gap-3">
                                        <Palette size={18} />
                                        <span>Appearance</span>
                                    </div>
                                    {isMobile && <ChevronRight size={14} className="opacity-40" />}
                                </button>
                                <button
                                    onClick={() => {
                                        setActiveSection("filename");
                                        if (editingTheme) handleCancelEdit();
                                    }}
                                    className={cn(
                                        "w-full flex items-center justify-between px-4 py-3.5 rounded-xl text-sm font-medium transition-all text-left",
                                        activeSection === "filename"
                                            ? "bg-primary/15 text-primary border border-primary/20"
                                            : "text-text-muted hover:text-text hover:bg-surface-hover bg-surface/10 border border-transparent"
                                    )}
                                >
                                    <div className="flex items-center gap-3">
                                        <FileText size={18} />
                                        <span>Default File Name</span>
                                    </div>
                                    {isMobile && <ChevronRight size={14} className="opacity-40" />}
                                </button>
                                <button
                                    onClick={() => {
                                        setActiveSection("vim");
                                        if (editingTheme) handleCancelEdit();
                                    }}
                                    className={cn(
                                        "w-full flex items-center justify-between px-4 py-3.5 rounded-xl text-sm font-medium transition-all text-left",
                                        activeSection === "vim"
                                            ? "bg-primary/15 text-primary border border-primary/20"
                                            : "text-text-muted hover:text-text hover:bg-surface-hover bg-surface/10 border border-transparent"
                                    )}
                                >
                                    <div className="flex items-center gap-3">
                                        <span className="text-lg font-mono leading-none">{"</>"}</span>
                                        <span>Vim Mode</span>
                                    </div>
                                    {isMobile && <ChevronRight size={14} className="opacity-40" />}
                                </button>

                                <div className="my-2 border-t border-border/30" />

                                <button
                                    onClick={() => {
                                        setActiveSection("cloud");
                                        if (editingTheme) handleCancelEdit();
                                    }}
                                    className={cn(
                                        "w-full flex items-center justify-between px-4 py-3.5 rounded-xl text-sm font-medium transition-all text-left",
                                        activeSection === "cloud"
                                            ? "bg-primary/15 text-primary border border-primary/20"
                                            : "text-text-muted hover:text-text hover:bg-surface-hover bg-surface/10 border border-transparent"
                                    )}
                                >
                                    <div className="flex items-center gap-3">
                                        <Cloud size={18} />
                                        <span>Cloud Sync</span>
                                    </div>
                                    {isMobile && <ChevronRight size={14} className="opacity-40" />}
                                </button>

                                <button
                                    onClick={() => {
                                        setActiveSection("update");
                                        if (editingTheme) handleCancelEdit();
                                    }}
                                    className={cn(
                                        "w-full flex items-center justify-between px-4 py-3.5 rounded-xl text-sm font-medium transition-all text-left relative",
                                        activeSection === "update"
                                            ? "bg-primary/15 text-primary border border-primary/20"
                                            : "text-text-muted hover:text-text hover:bg-surface-hover bg-surface/10 border border-transparent"
                                    )}
                                >
                                    <div className="flex items-center gap-3">
                                        <div className="relative">
                                            <Download size={18} />
                                            {useUpdateStore.getState().hasUpdate && (
                                                <div className="absolute -top-0.5 -right-0.5 w-2 h-2 rounded-full bg-primary animate-pulse" />
                                            )}
                                        </div>
                                        <span>Updates</span>
                                    </div>
                                    {isMobile && <ChevronRight size={14} className="opacity-40" />}
                                </button>

                                <div className="my-2 border-t border-border/30" />

                                <button
                                    onClick={() => {
                                        setActiveSection("migration");
                                        if (editingTheme) handleCancelEdit();
                                    }}
                                    className={cn(
                                        "w-full flex items-center justify-between px-4 py-3.5 rounded-xl text-sm font-medium transition-all text-left cursor-pointer",
                                        activeSection === "migration"
                                            ? "bg-primary/15 text-primary border border-primary/20"
                                            : "text-text-muted hover:text-text hover:bg-surface-hover bg-surface/10 border border-transparent"
                                    )}
                                >
                                    <div className="flex items-center gap-3">
                                        <Import size={18} />
                                        <span>Migrate Notes</span>
                                    </div>
                                    {isMobile && <ChevronRight size={14} className="opacity-40" />}
                                </button>
                            </nav>
                        </div>
                    )}

                    {/* Main Content Area */}
                    {(!isMobile || activeSection) && (
                        <div className="flex-1 overflow-y-auto min-h-0 bg-background/5">
                        {/* Appearance Section */}
                        {activeSection === "appearance" && (
                            <>
                                {/* If editing a theme */}
                                {editingTheme && editColors ? (
                                    <div className="p-6">
                                        {/* Back + Title */}
                                        <div className="flex items-center gap-3 mb-6">
                                            <button
                                                onClick={handleCancelEdit}
                                                className="p-1.5 rounded-lg hover:bg-surface-hover transition-colors"
                                            >
                                                <RotateCcw size={14} className="text-text-muted" />
                                            </button>
                                            <div className="flex-1">
                                                <input
                                                    type="text"
                                                    value={editName}
                                                    onChange={(e) => setEditName(e.target.value)}
                                                    disabled={!editingTheme.isCustom && !isCreatingNew}
                                                    className={cn(
                                                        "text-sm font-semibold bg-transparent text-text border-none outline-none w-full",
                                                        (editingTheme.isCustom || isCreatingNew) &&
                                                        "border-b border-border/40 focus:border-primary/40 pb-0.5"
                                                    )}
                                                    placeholder="Theme name..."
                                                />
                                                <p className="text-[10px] text-text-muted/50 mt-0.5">
                                                    {isCreatingNew
                                                        ? "Creating new custom theme"
                                                        : editingTheme.isCustom
                                                            ? "Editing custom theme"
                                                            : "Preview only — duplicate to customize"}
                                                </p>
                                            </div>
                                        </div>

                                        {/* Live Preview */}
                                        <div className="mb-6">
                                            <div
                                                className="rounded-xl overflow-hidden border border-border/50 h-[120px] relative"
                                                style={{ backgroundColor: editColors.background }}
                                            >
                                                {/* Sidebar */}
                                                <div
                                                    className="absolute left-0 top-0 bottom-0 w-[28%]"
                                                    style={{
                                                        backgroundColor: editColors.sidebar,
                                                        borderRight: `1px solid ${editColors.border}`,
                                                    }}
                                                >
                                                    <div className="pt-4 px-2 space-y-1.5">
                                                        <div
                                                            className="h-2 rounded"
                                                            style={{
                                                                backgroundColor: editColors.primary,
                                                                opacity: 0.7,
                                                                width: "60%",
                                                            }}
                                                        />
                                                        {[65, 80, 50, 70].map((w, i) => (
                                                            <div
                                                                key={i}
                                                                className="h-1.5 rounded"
                                                                style={{
                                                                    backgroundColor: editColors.textMuted,
                                                                    opacity: 0.25,
                                                                    width: `${w}%`,
                                                                }}
                                                            />
                                                        ))}
                                                    </div>
                                                </div>

                                                {/* Editor area */}
                                                <div className="absolute left-[28%] top-0 right-0 bottom-0 p-3">
                                                    {/* Tab bar */}
                                                    <div
                                                        className="flex items-center gap-1 mb-3 pb-1.5"
                                                        style={{ borderBottom: `1px solid ${editColors.border}` }}
                                                    >
                                                        <div
                                                            className="px-3 py-1 rounded-t text-[8px] font-medium"
                                                            style={{
                                                                backgroundColor: editColors.surface,
                                                                color: editColors.text,
                                                                borderTop: `2px solid ${editColors.primary}`,
                                                            }}
                                                        >
                                                            document.jt
                                                        </div>
                                                    </div>
                                                    {/* Text lines */}
                                                    <div className="space-y-2">
                                                        {[
                                                            { w: "40%", c: editColors.primary, o: 0.8 },
                                                            { w: "90%", c: editColors.text, o: 0.4 },
                                                            { w: "70%", c: editColors.text, o: 0.3 },
                                                            { w: "55%", c: editColors.textMuted, o: 0.2 },
                                                        ].map((line, i) => (
                                                            <div
                                                                key={i}
                                                                className="h-1.5 rounded-full"
                                                                style={{
                                                                    backgroundColor: line.c,
                                                                    opacity: line.o,
                                                                    width: line.w,
                                                                }}
                                                            />
                                                        ))}
                                                    </div>
                                                </div>

                                                {/* Status bar */}
                                                <div
                                                    className="absolute bottom-0 left-0 right-0 h-5"
                                                    style={{
                                                        backgroundColor: editColors.surface,
                                                        borderTop: `1px solid ${editColors.border}`,
                                                    }}
                                                />
                                            </div>
                                        </div>

                                        {/* Color editors */}
                                        <div className="space-y-0.5">
                                            <h3 className="text-[11px] font-bold tracking-wider text-text-muted/50 uppercase mb-3">
                                                Color Palette
                                            </h3>
                                            <div className="rounded-xl bg-surface/30 border border-border/30 divide-y divide-border/20">
                                                {COLOR_LABELS.map(({ key, label, description }) => (
                                                    <ColorRow
                                                        key={key}
                                                        label={label}
                                                        description={description}
                                                        color={editColors[key]}
                                                        onChange={(val) => handleColorChange(key, val)}
                                                    />
                                                ))}
                                            </div>
                                        </div>

                                        {/* Action buttons */}
                                        {(editingTheme.isCustom || isCreatingNew) && (
                                            <div className="flex items-center justify-end gap-2 mt-6 pt-4 border-t border-border/30">
                                                <button
                                                    onClick={handleCancelEdit}
                                                    className="px-4 py-2 text-xs font-medium text-text-muted hover:text-text hover:bg-surface-hover rounded-lg transition-all"
                                                >
                                                    Cancel
                                                </button>
                                                <button
                                                    onClick={handleSaveCustomTheme}
                                                    className="px-5 py-2 text-xs font-semibold bg-primary text-background rounded-lg hover:opacity-90 transition-all shadow-sm shadow-primary/20 flex items-center gap-1.5"
                                                >
                                                    <Check size={12} />
                                                    {isCreatingNew ? "Create Theme" : "Save Changes"}
                                                </button>
                                            </div>
                                        )}

                                        {/* For preset themes: offer a duplicate button */}
                                        {!editingTheme.isCustom && !isCreatingNew && (
                                            <div className="flex items-center justify-end gap-2 mt-6 pt-4 border-t border-border/30">
                                                <button
                                                    onClick={handleCancelEdit}
                                                    className="px-4 py-2 text-xs font-medium text-text-muted hover:text-text hover:bg-surface-hover rounded-lg transition-all"
                                                >
                                                    Back
                                                </button>
                                                <button
                                                    onClick={() => {
                                                        handleDuplicateTheme(editingTheme);
                                                        handleCancelEdit();
                                                    }}
                                                    className="px-5 py-2 text-xs font-semibold bg-primary/15 text-primary border border-primary/20 rounded-lg hover:bg-primary/25 transition-all flex items-center gap-1.5"
                                                >
                                                    <Copy size={12} />
                                                    Duplicate & Customize
                                                </button>
                                            </div>
                                        )}
                                    </div>
                                ) : (
                                    /* Theme gallery view */
                                    <div className="p-6">
                                        {/* Section: Preset Themes */}
                                        <div className="mb-8">
                                            <div className="flex items-center gap-2 mb-4">
                                                <Sparkles size={14} className="text-primary" />
                                                <h3 className="text-[11px] font-bold tracking-wider text-text-muted/50 uppercase">
                                                    Built-in Themes
                                                </h3>
                                            </div>
                                            <div className={cn(
                                                "grid gap-3",
                                                isMobile ? "grid-cols-2" : "grid-cols-3"
                                            )}>
                                                {PRESET_THEMES.map((theme) => (
                                                    <ThemePreviewCard
                                                        key={theme.id}
                                                        theme={theme}
                                                        isActive={activeThemeId === theme.id}
                                                        onClick={() => handleSelectTheme(theme)}
                                                        onDuplicate={() => handleDuplicateTheme(theme)}
                                                    />
                                                ))}
                                            </div>
                                        </div>

                                        {/* Section: Custom Themes */}
                                        <div>
                                            <div className="flex items-center justify-between mb-4">
                                                <div className="flex items-center gap-2">
                                                    <Palette size={14} className="text-primary" />
                                                    <h3 className="text-[11px] font-bold tracking-wider text-text-muted/50 uppercase">
                                                        Custom Themes
                                                    </h3>
                                                </div>
                                                <button
                                                    onClick={handleCreateNew}
                                                    className="flex items-center gap-1.5 px-3 py-1.5 text-[11px] font-medium bg-primary/10 text-primary border border-primary/20 rounded-lg hover:bg-primary/20 transition-all"
                                                >
                                                    <Plus size={12} />
                                                    New Theme
                                                </button>
                                            </div>

                                            {customThemes.length > 0 ? (
                                                <div className={cn(
                                                    "grid gap-3",
                                                    isMobile ? "grid-cols-2" : "grid-cols-3"
                                                )}>
                                                    {customThemes.map((theme) => (
                                                        <div key={theme.id} className="relative group">
                                                            <ThemePreviewCard
                                                                theme={theme}
                                                                isActive={activeThemeId === theme.id}
                                                                onClick={() => handleSelectTheme(theme)}
                                                                onDelete={() => handleDeleteCustomTheme(theme.id)}
                                                                onDuplicate={() => handleDuplicateTheme(theme)}
                                                            />
                                                            {/* Edit overlay */}
                                                            <button
                                                                onClick={() => handleEditTheme(theme)}
                                                                className="absolute bottom-8 right-2 opacity-0 group-hover:opacity-100 p-1.5 bg-surface border border-border rounded-md hover:bg-surface-hover transition-all shadow-sm"
                                                                title="Edit theme"
                                                            >
                                                                <Pencil size={10} className="text-text-muted" />
                                                            </button>
                                                        </div>
                                                    ))}
                                                </div>
                                            ) : (
                                                <div className="text-center py-10 px-6 rounded-xl border border-dashed border-border/50 bg-surface/10">
                                                    <div className="w-12 h-12 mx-auto mb-3 rounded-xl bg-primary/10 flex items-center justify-center">
                                                        <Palette size={20} className="text-primary/60" />
                                                    </div>
                                                    <p className="text-xs text-text-muted/60 mb-1">
                                                        No custom themes yet
                                                    </p>
                                                    <p className="text-[10px] text-text-muted/40">
                                                        Create your own or duplicate a preset to get started
                                                    </p>
                                                </div>
                                            )}
                                         </div>

                                        {/* Section: General Aesthetics */}
                                        <div className="mt-8 mb-4">
                                            <div className="flex items-center gap-2 mb-4">
                                                <Sparkles size={14} className="text-primary" />
                                                <h3 className="text-[11px] font-bold tracking-wider text-text-muted/50 uppercase">
                                                    General Aesthetics
                                                </h3>
                                            </div>
                                            <div className="rounded-xl bg-surface/30 border border-border/30 p-4">
                                                <NeonBorderSetting />
                                            </div>
                                        </div>

                                        {/* Tip about editing presets */}
                                        <div className="mt-6 flex items-start gap-2.5 p-3 rounded-lg bg-primary/5 border border-primary/10">
                                            <ChevronRight size={12} className="text-primary mt-0.5 flex-shrink-0" />
                                            <p className="text-[10px] text-text-muted/60 leading-relaxed">
                                                <span className="text-text-muted/80 font-medium">Tip:</span> Click any theme to
                                                apply it instantly. Hover to see options. Duplicate a preset to create an
                                                editable copy with custom colors.
                                            </p>
                                        </div>
                                    </div>
                                )}
                            </>
                        )}

                        {/* Default File Name Section */}
                        {activeSection === "filename" && (
                            <div className="p-6">
                                <div className="mb-6">
                                    <h3 className="text-sm font-semibold text-text mb-2">Default File Name</h3>
                                    <p className="text-xs text-text-muted/60">
                                        Configure the default prefix for new files
                                    </p>
                                </div>
                                <div className="rounded-xl bg-surface/30 border border-border/30 p-6">
                                    <FileNamePrefixSetting />
                                </div>
                                <div className="mt-4 flex items-start gap-2.5 p-3 rounded-lg bg-primary/5 border border-primary/10">
                                    <ChevronRight size={12} className="text-primary mt-0.5 flex-shrink-0" />
                                    <p className="text-[10px] text-text-muted/60 leading-relaxed">
                                        <span className="text-text-muted/80 font-medium">Note:</span> New files will be named with this prefix followed by a timestamp (e.g., "note-123.jt")
                                    </p>
                                </div>
                            </div>
                        )}

                        {/* Vim Mode Section */}
                        {activeSection === "vim" && (
                            <div className="p-6">
                                <div className="mb-6">
                                    <h3 className="text-sm font-semibold text-text mb-2">Vim Mode (BETA)</h3>
                                    <p className="text-xs text-text-muted/60">
                                        Enable vim keybindings for navigation and editing
                                    </p>
                                </div>
                                <div className="rounded-xl bg-surface/30 border border-border/30 p-6">
                                    <VimModeSetting />
                                </div>
                                <div className="mt-4 space-y-3">
                                    <div className="flex items-start gap-2.5 p-3 rounded-lg bg-primary/5 border border-primary/10">
                                        <ChevronRight size={12} className="text-primary mt-0.5 flex-shrink-0" />
                                        <p className="text-[10px] text-text-muted/60 leading-relaxed">
                                            <span className="text-text-muted/80 font-medium">Tip:</span> When enabled, you can use vim keybindings like hjkl for navigation, i for insert mode, and ESC to return to normal mode.
                                        </p>
                                    </div>
                                    <div className="rounded-lg bg-surface/30 border border-border/30 p-4">
                                        <h4 className="text-[11px] font-semibold text-text mb-3">Common Vim Commands</h4>
                                        <div className="space-y-2 text-[10px]">
                                            <div className="flex items-start gap-2">
                                                <code className="font-mono text-primary bg-primary/10 px-1.5 py-0.5 rounded">:%y+</code>
                                                <span className="text-text-muted/70">Copy entire file content to clipboard</span>
                                            </div>
                                            <div className="flex items-start gap-2">
                                                <code className="font-mono text-primary bg-primary/10 px-1.5 py-0.5 rounded">dd</code>
                                                <span className="text-text-muted/70">Delete current line</span>
                                            </div>
                                            <div className="flex items-start gap-2">
                                                <code className="font-mono text-primary bg-primary/10 px-1.5 py-0.5 rounded">yy</code>
                                                <span className="text-text-muted/70">Copy current line</span>
                                            </div>
                                            <div className="flex items-start gap-2">
                                                <code className="font-mono text-primary bg-primary/10 px-1.5 py-0.5 rounded">p</code>
                                                <span className="text-text-muted/70">Paste after cursor</span>
                                            </div>
                                            <div className="flex items-start gap-2">
                                                <code className="font-mono text-primary bg-primary/10 px-1.5 py-0.5 rounded">u</code>
                                                <span className="text-text-muted/70">Undo last change</span>
                                            </div>
                                            <div className="flex items-start gap-2">
                                                <code className="font-mono text-primary bg-primary/10 px-1.5 py-0.5 rounded">Ctrl+r</code>
                                                <span className="text-text-muted/70">Redo</span>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* Cloud Sync Section */}
                        {activeSection === "cloud" && (
                            <div className="p-6">
                                <div className="mb-6">
                                    <h3 className="text-sm font-semibold text-text mb-2">Cloud Sync</h3>
                                    <p className="text-xs text-text-muted/60">
                                        Sync your notes across devices via Supabase or WebDAV
                                    </p>
                                </div>
                                <SyncSettings />
                            </div>
                        )}

                        {/* Update Section */}
                        {activeSection === "update" && (
                            <UpdateSection />
                        )}

                        {/* Migration Section */}
                        {activeSection === "migration" && (
                            <MigrationSettings />
                        )}
                    </div>
                )}
            </div>
        </div>
    </div>
);
}
