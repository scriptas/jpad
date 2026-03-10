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
} from "lucide-react";
import {
    useThemeStore,
    PRESET_THEMES,
    applyThemeToDOM,
    type Theme,
    type ThemeColors,
} from "../store/useThemeStore";
import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

function cn(...inputs: ClassValue[]) {
    return twMerge(clsx(inputs));
}

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

    const [editingTheme, setEditingTheme] = useState<Theme | null>(null);
    const [editColors, setEditColors] = useState<ThemeColors | null>(null);
    const [editName, setEditName] = useState("");
    const [isCreatingNew, setIsCreatingNew] = useState(false);
    const panelRef = useRef<HTMLDivElement>(null);

    // Preview changes live
    useEffect(() => {
        if (editColors) {
            applyThemeToDOM(editColors);
        }
    }, [editColors]);

    const handleClose = () => {
        // If we were editing, revert to the active theme
        if (editColors) {
            const activeTheme = getActiveTheme();
            applyThemeToDOM(activeTheme.colors);
        }
        setEditingTheme(null);
        setEditColors(null);
        setIsCreatingNew(false);
        setSettingsOpen(false);
    };

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
            // Re-apply if this is the active theme
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
                className="absolute inset-0 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200"
                onClick={handleClose}
            />

            {/* Settings Panel */}
            <div
                ref={panelRef}
                className="relative z-10 w-[680px] max-h-[85vh] bg-sidebar border border-border rounded-2xl shadow-2xl shadow-black/40 flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-300"
            >
                {/* Header */}
                <div className="flex items-center justify-between px-6 py-4 border-b border-border bg-surface/30">
                    <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-lg bg-primary/15 flex items-center justify-center">
                            <Palette size={16} className="text-primary" />
                        </div>
                        <div>
                            <h2 className="text-sm font-semibold text-text">Appearance</h2>
                            <p className="text-[11px] text-text-muted/60">
                                Customize your editor's look and feel
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

                {/* Content */}
                <div className="flex-1 overflow-y-auto">
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
                                <div className="grid grid-cols-3 gap-3">
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
                                    <div className="grid grid-cols-3 gap-3">
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
                </div>
            </div>
        </div>
    );
}
