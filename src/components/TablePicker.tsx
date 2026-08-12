import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import type { Editor } from "@tiptap/react";
import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

function cn(...inputs: ClassValue[]) {
    return twMerge(clsx(inputs));
}

const GRID_MAX = 5;

/** Word/Obsidian-style "insert table" popover: a hover grid up to 5x5, plus manual row/col entry. */
export default function TablePicker({
    editor,
    triggerRef,
    onClose,
}: {
    editor: Editor | null;
    triggerRef: React.RefObject<HTMLButtonElement | null>;
    onClose: () => void;
}) {
    const ref = useRef<HTMLDivElement>(null);
    const [coords, setCoords] = useState<{ top: number; left: number } | null>(null);
    const [hoverRows, setHoverRows] = useState(0);
    const [hoverCols, setHoverCols] = useState(0);
    const [customRows, setCustomRows] = useState("3");
    const [customCols, setCustomCols] = useState("3");

    useEffect(() => {
        const updatePosition = () => {
            if (triggerRef?.current) {
                const rect = triggerRef.current.getBoundingClientRect();
                setCoords({ top: rect.bottom + 4, left: rect.left });
            }
        };
        updatePosition();
        window.addEventListener("resize", updatePosition);
        const handleScroll = () => onClose();
        window.addEventListener("scroll", handleScroll, true);
        return () => {
            window.removeEventListener("resize", updatePosition);
            window.removeEventListener("scroll", handleScroll, true);
        };
    }, [triggerRef, onClose]);

    useEffect(() => {
        const handle = (e: MouseEvent) => {
            if (
                ref.current && !ref.current.contains(e.target as Node) &&
                triggerRef?.current && !triggerRef.current.contains(e.target as Node)
            ) {
                onClose();
            }
        };
        document.addEventListener("mousedown", handle);
        return () => document.removeEventListener("mousedown", handle);
    }, [onClose, triggerRef]);

    if (!coords) return null;

    const insert = (rows: number, cols: number) => {
        if (!editor || rows < 1 || cols < 1) return;
        editor.chain().focus().insertTable({ rows, cols, withHeaderRow: true }).run();
        onClose();
    };

    let left = coords.left;
    const pickerWidth = 220;
    if (left + pickerWidth > window.innerWidth) left = window.innerWidth - pickerWidth - 12;
    if (left < 12) left = 12;

    return createPortal(
        <div
            ref={ref}
            className="fixed z-[9999] bg-surface border-2 border-border rounded-lg shadow-xl shadow-black/40 animate-in w-[220px]"
            style={{ top: `${coords.top}px`, left: `${left}px` }}
        >
            <div className="px-3 py-1.5 text-[10px] font-semibold text-text-muted uppercase tracking-wider border-b-2 border-border">
                Insert Table
            </div>

            <div className="p-3 flex flex-col items-center gap-1.5">
                <div
                    className="grid gap-[3px]"
                    style={{ gridTemplateColumns: `repeat(${GRID_MAX}, 1fr)` }}
                    onMouseLeave={() => { setHoverRows(0); setHoverCols(0); }}
                >
                    {Array.from({ length: GRID_MAX * GRID_MAX }, (_, i) => {
                        const r = Math.floor(i / GRID_MAX) + 1;
                        const c = (i % GRID_MAX) + 1;
                        const active = r <= hoverRows && c <= hoverCols;
                        return (
                            <button
                                key={i}
                                onMouseEnter={() => { setHoverRows(r); setHoverCols(c); }}
                                onClick={() => insert(r, c)}
                                className={cn(
                                    "w-7 h-7 rounded-sm border transition-colors",
                                    active
                                        ? "bg-primary/60 border-primary"
                                        : "bg-background border-border hover:border-primary/40"
                                )}
                            />
                        );
                    })}
                </div>
                <div className="text-[11px] text-text-muted tabular-nums h-4">
                    {hoverRows > 0 && hoverCols > 0 ? `${hoverRows} x ${hoverCols}` : `Up to ${GRID_MAX} x ${GRID_MAX}`}
                </div>
            </div>

            <div className="h-[1px] bg-border mx-2" />

            <div className="p-3 flex items-center gap-2">
                <input
                    type="number"
                    min={1}
                    max={50}
                    value={customRows}
                    onChange={(e) => setCustomRows(e.target.value)}
                    className="w-12 px-1.5 py-1 text-xs bg-background border border-border rounded text-center focus:outline-none focus:border-primary/50"
                    title="Rows"
                />
                <span className="text-text-muted text-xs">x</span>
                <input
                    type="number"
                    min={1}
                    max={50}
                    value={customCols}
                    onChange={(e) => setCustomCols(e.target.value)}
                    className="w-12 px-1.5 py-1 text-xs bg-background border border-border rounded text-center focus:outline-none focus:border-primary/50"
                    title="Columns"
                />
                <button
                    onClick={() => insert(parseInt(customRows, 10) || 0, parseInt(customCols, 10) || 0)}
                    className="flex-1 px-2 py-1 text-xs font-semibold rounded-md bg-primary/20 text-primary hover:bg-primary/30 transition-colors"
                >
                    Insert
                </button>
            </div>
        </div>,
        document.body
    );
}
