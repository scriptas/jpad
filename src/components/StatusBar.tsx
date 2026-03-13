import { useStore, findFileNode } from "../store/useStore";
import { useSettingsStore } from "../store/useSettingsStore";
import { Cloud } from "lucide-react";
import { useMemo } from "react";
import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

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

export default function StatusBar() {
    const { activeFileId, files, editorContent, selectedContent, vimState } = useStore();
    const { vimModeEnabled } = useSettingsStore();

    const activeFile = activeFileId ? findFileNode(files, activeFileId) : null;

    const totalStats = useMemo(() => calculateStats(editorContent), [editorContent]);
    const selectedStats = useMemo(() => calculateStats(selectedContent), [selectedContent]);
    
    const hasSelection = selectedContent.length > 0;

    return (
        <footer className="h-[22px] bg-sidebar border-t border-border flex items-center px-3 text-[11px] text-text-muted select-none gap-3 flex-shrink-0">
            {/* Sync Status */}
            <div className="flex items-center gap-1.5 hover:text-text cursor-default transition-colors">
                <Cloud size={11} className="text-primary" />
                <span>Cloud comming soon</span>
            </div>



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
