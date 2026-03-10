import { useStore, findFileNode } from "../store/useStore";
import { Cloud, FileText, Check, Loader2 } from "lucide-react";
import { useMemo } from "react";

export default function StatusBar() {
    const { activeFileId, files, editorContent, isSaving } = useStore();

    const activeFile = activeFileId ? findFileNode(files, activeFileId) : null;

    const stats = useMemo(() => {
        // Strip HTML to get plain text
        const text = editorContent
            .replace(/<[^>]*>/g, " ")
            .replace(/&nbsp;/g, " ")
            .replace(/\s+/g, " ")
            .trim();
        const wordCount = text ? text.split(/\s+/).length : 0;
        const charCount = text.length;
        const lineCount = editorContent ? (editorContent.match(/<\/p>|<\/h[1-6]>|<\/li>|<br\s*\/?>/gi) || []).length + 1 : 0;
        return { wordCount, charCount, lineCount };
    }, [editorContent]);

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
                        Ln {stats.lineCount}, Words {stats.wordCount}
                    </span>
                    <div className="w-[1px] h-2.5 bg-border" />
                    <span className="opacity-80">UTF-8</span>
                    <div className="w-[1px] h-2.5 bg-border" />
                    <div className="flex items-center gap-1.5 opacity-90">
                        <FileText size={11} />
                        <span>{getFileType(activeFile.name)}</span>
                    </div>
                </div>
            )}
        </footer>
    );
}
