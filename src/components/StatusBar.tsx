import { useStore, findFileNode } from "../store/useStore";
import { Cloud, FileText, Check, Loader2 } from "lucide-react";
import { useMemo } from "react";

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
    const { activeFileId, files, editorContent, selectedContent, isSaving } = useStore();

    const activeFile = activeFileId ? findFileNode(files, activeFileId) : null;

    const totalStats = useMemo(() => calculateStats(editorContent), [editorContent]);
    const selectedStats = useMemo(() => calculateStats(selectedContent), [selectedContent]);
    
    const hasSelection = selectedContent.length > 0;

    const getFileType = (name?: string) => {
        if (!name) return "—";
        const ext = name.split(".").pop()?.toLowerCase();
        switch (ext) {
            case "jt":
                return "JPad Note";
            case "md":
                return "Markdown";
            case "txt":
                return "Plain Text";
            default:
                return ext?.toUpperCase() || "—";
        }
    };

    return (
        <footer className="h-[22px] bg-sidebar border-t border-border flex items-center px-3 text-[11px] text-text-muted select-none gap-3 flex-shrink-0">
            {/* Sync Status */}
            <div className="flex items-center gap-1.5 hover:text-text cursor-default transition-colors">
                <Cloud size={11} className="text-primary" />
                <span>Cloud comming soon</span>
            </div>

            <div className="w-[1px] h-2.5 bg-border" />

            {/* Save Status */}
            <div className="flex items-center gap-1.5">
                {isSaving ? (
                    <>
                        <Loader2 size={11} className="animate-spin text-primary" />
                        <span className="text-primary">Saving...</span>
                    </>
                ) : (
                    <>
                        <Check size={11} className="text-green-400" />
                        <span className="opacity-90">Saved</span>
                    </>
                )}
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
                </div>
            )}
        </footer>
    );
}
