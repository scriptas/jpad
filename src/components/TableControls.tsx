import { useCallback, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import type { Editor } from "@tiptap/react";
import { Plus } from "lucide-react";

const HOVER_HIDE_DELAY = 200;
const STRIP = 16;

/**
 * Hover controls on the right/bottom edges of a table, Notion-style: hovering
 * near an edge reveals a highlighted line (showing whether a row or a column
 * will be inserted) with a "+" button; the corner adds both at once.
 */
export default function TableControls({ editor }: { editor: Editor | null }) {
    const [table, setTable] = useState<HTMLTableElement | null>(null);
    const [rect, setRect] = useState<DOMRect | null>(null);
    const hideTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);

    const clearHide = useCallback(() => {
        if (hideTimeout.current) {
            clearTimeout(hideTimeout.current);
            hideTimeout.current = null;
        }
    }, []);

    const scheduleHide = useCallback(() => {
        clearHide();
        hideTimeout.current = setTimeout(() => {
            setTable(null);
            setRect(null);
        }, HOVER_HIDE_DELAY);
    }, [clearHide]);

    const updateRectFromTable = useCallback((t: HTMLTableElement | null) => {
        if (!t || !t.isConnected) {
            setRect(null);
            return;
        }
        setRect(t.getBoundingClientRect());
    }, []);

    // Track which table (if any) the mouse is currently over inside the editor
    useEffect(() => {
        if (!editor) return;
        const dom = editor.view.dom;

        const handleMouseMove = (e: MouseEvent) => {
            const target = e.target as HTMLElement | null;
            const closestTable = target?.closest("table") as HTMLTableElement | null;
            if (closestTable && dom.contains(closestTable)) {
                clearHide();
                setTable((prev) => (prev === closestTable ? prev : closestTable));
                updateRectFromTable(closestTable);
            } else {
                scheduleHide();
            }
        };

        dom.addEventListener("mousemove", handleMouseMove);
        return () => dom.removeEventListener("mousemove", handleMouseMove);
    }, [editor, clearHide, scheduleHide, updateRectFromTable]);

    // Keep the overlay glued to the table while it's being tracked
    useEffect(() => {
        if (!table) return;
        const onReposition = () => updateRectFromTable(table);
        window.addEventListener("scroll", onReposition, true);
        window.addEventListener("resize", onReposition);
        const txHandler = () => requestAnimationFrame(onReposition);
        editor?.on("transaction", txHandler);
        return () => {
            window.removeEventListener("scroll", onReposition, true);
            window.removeEventListener("resize", onReposition);
            editor?.off("transaction", txHandler);
        };
    }, [table, editor, updateRectFromTable]);

    const runOnLastCell = useCallback((mode: "row" | "col") => {
        if (!editor || !table) return;
        const rows = table.rows;
        if (!rows.length) return;
        const lastRow = rows[rows.length - 1];
        const lastCell = lastRow.cells[lastRow.cells.length - 1] as HTMLElement | undefined;
        if (!lastCell) return;
        try {
            const pos = editor.view.posAtDOM(lastCell, 0);
            const chain = editor.chain().focus().setTextSelection(pos);
            if (mode === "col") {
                chain.addColumnAfter().run();
            } else {
                chain.addRowAfter().run();
            }
            requestAnimationFrame(() => updateRectFromTable(table));
        } catch {
            // Table DOM changed underneath us; next hover will re-sync.
        }
    }, [editor, table, updateRectFromTable]);

    const addBoth = useCallback(() => {
        runOnLastCell("col");
        requestAnimationFrame(() => runOnLastCell("row"));
    }, [runOnLastCell]);

    if (!editor || !editor.isEditable || !table || !rect) return null;

    return createPortal(
        <div onMouseEnter={clearHide} onMouseLeave={scheduleHide}>
            <button
                title="Add column"
                onClick={() => runOnLastCell("col")}
                className="table-add-strip"
                style={{ position: "fixed", top: rect.top, left: rect.right, width: STRIP, height: rect.height }}
            >
                <span className="table-add-line table-add-line-v" />
                <span className="table-add-plus">
                    <Plus size={11} strokeWidth={3} />
                </span>
            </button>

            <button
                title="Add row"
                onClick={() => runOnLastCell("row")}
                className="table-add-strip"
                style={{ position: "fixed", top: rect.bottom, left: rect.left, width: rect.width, height: STRIP }}
            >
                <span className="table-add-line table-add-line-h" />
                <span className="table-add-plus">
                    <Plus size={11} strokeWidth={3} />
                </span>
            </button>

            <button
                title="Add row and column"
                onClick={addBoth}
                className="table-add-corner"
                style={{ position: "fixed", top: rect.bottom, left: rect.right, width: STRIP, height: STRIP }}
            >
                <Plus size={10} strokeWidth={3} />
            </button>
        </div>,
        document.body
    );
}
