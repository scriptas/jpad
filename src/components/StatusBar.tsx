import { useStore, findFileNode } from "../store/useStore";
import { useSettingsStore } from "../store/useSettingsStore";
import { useSyncStore } from "../store/useSyncStore";
import { Cloud, CloudOff, RefreshCw, CloudAlert, Check } from "lucide-react";
import { useMemo, useState } from "react";
import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";
import { platform } from "@tauri-apps/plugin-os";

function cn(...inputs: ClassValue[]) {
    return twMerge(clsx(inputs));
}

function calculateStats(htmlContent: string) {
    if (!htmlContent) {
        return { wordCount: 0, charCount: 0, lineCount: 0 };
    }

    // Strip HTML to get plain text
    const text = htmlContent
        .replace(/<[^>]*>/g, " ")
        .replace(/&nbsp;/g, " ")
        .replace(/&[a-z]+;/gi, " ") // Remove HTML entities
        .replace(/\s+/g, " ")
        .trim();

    const wordCount = text ? text.split(/\s+/).filter(w => w.length > 0).length : 0;
    const charCount = text.length;

    // Count block-level elements for line count
    const lineCount = Math.max(1, (htmlContent.match(/<\/p>|<\/h[1-6]>|<\/li>|<br\s*\/?>/gi) || []).length);

    return { wordCount, charCount, lineCount };
}

function CloudSyncIndicator() {
    const { config, status, syncNow } = useSyncStore();
    const [showTooltip, setShowTooltip] = useState(false);

    const handleClick = async () => {
        if (!config.enabled) return;
        if (status.syncing) return;
        try {
            await syncNow();
        } catch (e) {
            console.error('Manual sync failed:', e);
        }
    };

    // Determine state
    const isEnabled = config.enabled;
    const isSyncing = status.syncing;
    const hasError = !!status.error;
    const lastSync = status.lastSync;
    const isSynced = isEnabled && lastSync && !hasError;

    const getTooltipText = () => {
        if (!isEnabled) return 'Cloud sync disabled';
        if (isSyncing) return 'Syncing...';
        if (hasError) return `Sync error: ${status.error}`;
        if (lastSync) {
            const d = new Date(lastSync);
            return `Last synced: ${d.toLocaleTimeString()}`;
        }
        return 'Connected — click to sync';
    };

    return (
        <div
            className="relative flex items-center"
            onMouseEnter={() => setShowTooltip(true)}
            onMouseLeave={() => setShowTooltip(false)}
        >
            <button
                onClick={handleClick}
                disabled={!isEnabled || isSyncing}
                className={cn(
                    "flex items-center gap-1.5 transition-colors cursor-default",
                    !isEnabled && "text-text-muted/30",
                    isEnabled && !hasError && !isSyncing && "text-primary hover:text-primary-hover cursor-pointer",
                    isSyncing && "text-primary/60",
                    hasError && "text-red-400 hover:text-red-300 cursor-pointer",
                )}
                title={getTooltipText()}
            >
                {/* Icon */}
                {!isEnabled && <CloudOff size={11} />}
                {isEnabled && isSyncing && <RefreshCw size={11} className="animate-spin" />}
                {isEnabled && !isSyncing && hasError && <CloudAlert size={11} />}
                {isEnabled && !isSyncing && !hasError && isSynced && (
                    <div className="relative">
                        <Cloud size={11} />
                        <Check size={5} className="absolute -bottom-0.5 -right-1 text-green-400" strokeWidth={4} />
                    </div>
                )}
                {isEnabled && !isSyncing && !hasError && !isSynced && <Cloud size={11} />}

                {/* Label */}
                <span className="text-[10px]">
                    {!isEnabled && 'Offline'}
                    {isEnabled && isSyncing && 'Syncing'}
                    {isEnabled && !isSyncing && hasError && 'Error'}
                    {isEnabled && !isSyncing && !hasError && isSynced && 'Synced'}
                    {isEnabled && !isSyncing && !hasError && !isSynced && 'Cloud'}
                </span>
            </button>

            {/* Tooltip */}
            {showTooltip && (
                <div className="absolute bottom-full left-0 mb-2 px-2.5 py-1.5 bg-surface border border-border rounded-lg shadow-xl text-[10px] text-text whitespace-nowrap z-50 animate-in fade-in duration-150">
                    {getTooltipText()}
                    {isEnabled && !isSyncing && (
                        <span className="text-text/40 ml-1">(click to sync)</span>
                    )}
                </div>
            )}
        </div>
    );
}

export default function StatusBar() {
    const { activeFileId, files, editorContent, selectedContent, vimState } = useStore();
    const { vimModeEnabled } = useSettingsStore();
    const p = platform();
    const isMobile = p === "android" || p === "ios";

    const activeFile = activeFileId ? findFileNode(files, activeFileId) : null;

    const totalStats = useMemo(() => calculateStats(editorContent), [editorContent]);
    const selectedStats = useMemo(() => calculateStats(selectedContent), [selectedContent]);

    const hasSelection = selectedContent.length > 0;

    return (
        <footer className={cn(
            "h-[22px] bg-sidebar border-t-2 border-border flex items-center px-3 text-[11px] text-text-muted select-none gap-3 flex-shrink-0",
            !isMobile && "rounded-b-[8px]"
        )}>
            {/* Cloud Sync Status */}
            <CloudSyncIndicator />

            {/* Spacer */}
            <div className="flex-1" />

            {/* Right side stats */}
            {activeFile && (
                <div className="flex items-center gap-3">
                    <span className="opacity-80">
                        {hasSelection ? (
                            <>
                                Ln {selectedStats.lineCount}/{totalStats.lineCount}, Words {selectedStats.wordCount}/{totalStats.wordCount}
                            </>
                        ) : (
                            <>
                                Ln {totalStats.lineCount}, Words {totalStats.wordCount}
                            </>
                        )}
                    </span>

                    {/* Vim Mode Indicator */}
                    {vimModeEnabled && vimState && (
                        <>
                            <div className="w-[1px] h-2.5 bg-border" />
                            <div className={cn(
                                "px-2 py-0.5 rounded font-mono text-[10px] font-semibold tracking-wider transition-all",
                                vimState.mode === "NORMAL" && "bg-primary/20 text-primary",
                                vimState.mode === "INSERT" && "bg-green-500/20 text-green-400",
                                vimState.mode === "COMMAND" && "bg-blue-500/20 text-blue-400",
                                vimState.mode === "VISUAL" && "bg-purple-500/20 text-purple-400"
                            )}>
                                {vimState.mode === "COMMAND" && vimState.commandBuffer ? (
                                    <span>:{vimState.commandBuffer}</span>
                                ) : vimState.mode === "NORMAL" && vimState.searchTerm && vimState.searchMatches > 0 ? (
                                    <span>
                                        /{vimState.searchTerm} [{vimState.currentMatch}/{vimState.searchMatches}]
                                    </span>
                                ) : (
                                    <span>{vimState.mode}</span>
                                )}
                                {vimState.count && <span className="ml-1 opacity-70">{vimState.count}</span>}
                            </div>
                        </>
                    )}
                </div>
            )}
        </footer>
    );
}
