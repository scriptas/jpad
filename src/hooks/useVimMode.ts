import { useEffect, useRef } from "react";
import { Editor } from "@tiptap/react";
import { useStore } from "../store/useStore";

export type VimMode = "NORMAL" | "INSERT" | "VISUAL" | "COMMAND";

interface VimState {
    mode: VimMode;
    commandBuffer: string;
    searchTerm: string;
    yankBuffer: string;
    count: string;
    searchMatches: number;
    currentMatch: number;
}

export function useVimMode(editor: Editor | null, enabled: boolean) {
    const { setVimState } = useStore();
    const stateRef = useRef<VimState>({
        mode: "NORMAL",
        commandBuffer: "",
        searchTerm: "",
        yankBuffer: "",
        count: "",
        searchMatches: 0,
        currentMatch: 0,
    });

    const updateState = (updater: (prev: VimState) => VimState) => {
        stateRef.current = updater(stateRef.current);
        setVimState(stateRef.current);
    };

    useEffect(() => {
        if (!enabled || !editor) return;
        
        // Wait for editor to be fully mounted - use try-catch since view getter throws
        try {
            if (!editor.view || !editor.view.dom) return;
        } catch {
            // Editor not mounted yet
            return;
        }

        // Start in NORMAL mode and keep editor focused
        updateState(prev => ({ ...prev, mode: "NORMAL" }));
        editor.commands.focus();

        const handleKeyDown = (e: KeyboardEvent) => {
            const state = stateRef.current;

            // COMMAND mode (: commands)
            if (state.mode === "COMMAND") {
                e.preventDefault();
                e.stopPropagation();
                
                if (e.key === "Escape") {
                    updateState(prev => ({ ...prev, mode: "NORMAL", commandBuffer: "" }));
                    return;
                }
                if (e.key === "Enter") {
                    executeCommand(state.commandBuffer);
                    updateState(prev => ({ ...prev, mode: "NORMAL", commandBuffer: "" }));
                    return;
                }
                if (e.key === "Backspace") {
                    updateState(prev => ({ ...prev, commandBuffer: prev.commandBuffer.slice(0, -1) }));
                    return;
                }
                if (e.key.length === 1 && !e.ctrlKey && !e.metaKey && !e.altKey) {
                    updateState(prev => ({ ...prev, commandBuffer: prev.commandBuffer + e.key }));
                }
                return;
            }

            // INSERT mode - allow normal typing, only intercept Escape
            if (state.mode === "INSERT") {
                if (e.key === "Escape") {
                    e.preventDefault();
                    e.stopPropagation();
                    updateState(prev => ({ ...prev, mode: "NORMAL" }));
                }
                // Let all other keys pass through normally in INSERT mode
                return;
            }

            // NORMAL mode - vim keybindings
            if (state.mode === "NORMAL") {
                // Check if this is a vim command key - if so, prevent default
                const isVimKey = /^[hjklwbeioxaAIOgGdunN0\$\^\/:]$/.test(e.key) || 
                                 (e.ctrlKey && e.key === 'r') ||
                                 e.key === 'Escape';
                
                // Check if this is a navigation key we want to allow
                const isNavigationKey = ['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 
                                         'PageUp', 'PageDown', 'Home', 'End'].includes(e.key);
                
                if (!isVimKey && !isNavigationKey) {
                    // Not a vim key or navigation key - prevent all input
                    e.preventDefault();
                    e.stopPropagation();
                    return;
                }
                
                if (isNavigationKey) {
                    // Allow navigation keys to work normally
                    return;
                }
                
                // This is a vim key, prevent default and handle it
                e.preventDefault();
                e.stopPropagation();

                // Numbers for count
                if (/^[0-9]$/.test(e.key)) {
                    updateState(prev => ({ ...prev, count: prev.count + e.key }));
                    return;
                }

                const count = parseInt(state.count) || 1;

                // Mode switches
                if (e.key === "i") {
                    updateState(prev => ({ ...prev, mode: "INSERT", count: "" }));
                    editor.commands.focus();
                    return;
                }
                if (e.key === "a") {
                    updateState(prev => ({ ...prev, mode: "INSERT", count: "" }));
                    editor.commands.focus();
                    // Move cursor right
                    const { from } = editor.state.selection;
                    editor.commands.setTextSelection(from + 1);
                    return;
                }
                if (e.key === "A") {
                    updateState(prev => ({ ...prev, mode: "INSERT", count: "" }));
                    editor.commands.focus();
                    // Move to end of line
                    const { state } = editor;
                    const { $from } = state.selection;
                    const end = $from.end();
                    editor.commands.setTextSelection(end);
                    return;
                }
                if (e.key === "I") {
                    updateState(prev => ({ ...prev, mode: "INSERT", count: "" }));
                    editor.commands.focus();
                    // Move to start of line
                    const { state } = editor;
                    const { $from } = state.selection;
                    const start = $from.start();
                    editor.commands.setTextSelection(start);
                    return;
                }
                if (e.key === "o") {
                    updateState(prev => ({ ...prev, mode: "INSERT", count: "" }));
                    editor.commands.focus();
                    // Move to end of line and insert new line
                    const { state } = editor;
                    const { $from } = state.selection;
                    const end = $from.end();
                    editor.commands.setTextSelection(end);
                    editor.commands.enter();
                    return;
                }
                if (e.key === "O") {
                    updateState(prev => ({ ...prev, mode: "INSERT", count: "" }));
                    editor.commands.focus();
                    // Move to start of line, insert new line, and move up
                    const { state } = editor;
                    const { $from } = state.selection;
                    const start = $from.start();
                    editor.commands.setTextSelection(start);
                    editor.commands.enter();
                    // Move cursor back up
                    const newPos = editor.state.selection.from - 1;
                    if (newPos >= 0) {
                        editor.commands.setTextSelection(newPos);
                    }
                    return;
                }

                // Navigation
                if (e.key === "h") {
                    for (let i = 0; i < count; i++) {
                        const { from } = editor.state.selection;
                        if (from > 0) {
                            editor.commands.setTextSelection(from - 1);
                        }
                    }
                    scrollCursorIntoView(editor);
                    updateState(prev => ({ ...prev, count: "" }));
                    return;
                }
                if (e.key === "j") {
                    for (let i = 0; i < count; i++) {
                        moveDown(editor);
                    }
                    scrollCursorIntoView(editor);
                    updateState(prev => ({ ...prev, count: "" }));
                    return;
                }
                if (e.key === "k") {
                    for (let i = 0; i < count; i++) {
                        moveUp(editor);
                    }
                    scrollCursorIntoView(editor);
                    updateState(prev => ({ ...prev, count: "" }));
                    return;
                }
                if (e.key === "l") {
                    for (let i = 0; i < count; i++) {
                        const { from } = editor.state.selection;
                        const maxPos = editor.state.doc.content.size;
                        if (from < maxPos) {
                            editor.commands.setTextSelection(from + 1);
                        }
                    }
                    scrollCursorIntoView(editor);
                    updateState(prev => ({ ...prev, count: "" }));
                    return;
                }

                // Word navigation
                if (e.key === "w") {
                    for (let i = 0; i < count; i++) {
                        moveToNextWord(editor);
                    }
                    scrollCursorIntoView(editor);
                    updateState(prev => ({ ...prev, count: "" }));
                    return;
                }
                if (e.key === "b") {
                    for (let i = 0; i < count; i++) {
                        moveToPrevWord(editor);
                    }
                    scrollCursorIntoView(editor);
                    updateState(prev => ({ ...prev, count: "" }));
                    return;
                }
                if (e.key === "e") {
                    for (let i = 0; i < count; i++) {
                        moveToEndOfWord(editor);
                    }
                    scrollCursorIntoView(editor);
                    updateState(prev => ({ ...prev, count: "" }));
                    return;
                }

                // Line navigation
                if (e.key === "0") {
                    const { state } = editor;
                    const { $from } = state.selection;
                    const start = $from.start();
                    editor.commands.setTextSelection(start);
                    scrollCursorIntoView(editor);
                    updateState(prev => ({ ...prev, count: "" }));
                    return;
                }
                if (e.key === "$") {
                    const { state } = editor;
                    const { $from } = state.selection;
                    const end = $from.end();
                    editor.commands.setTextSelection(end);
                    scrollCursorIntoView(editor);
                    updateState(prev => ({ ...prev, count: "" }));
                    return;
                }
                if (e.key === "^") {
                    const { state } = editor;
                    const { $from } = state.selection;
                    const start = $from.start();
                    editor.commands.setTextSelection(start);
                    scrollCursorIntoView(editor);
                    updateState(prev => ({ ...prev, count: "" }));
                    return;
                }

                // Document navigation
                if (e.key === "g") {
                    if (state.commandBuffer === "g") {
                        // gg - go to top
                        editor.commands.setTextSelection(0);
                        scrollCursorIntoView(editor);
                        updateState(prev => ({ ...prev, commandBuffer: "", count: "" }));
                    } else {
                        updateState(prev => ({ ...prev, commandBuffer: "g" }));
                        setTimeout(() => {
                            if (stateRef.current.commandBuffer === "g") {
                                updateState(prev => ({ ...prev, commandBuffer: "" }));
                            }
                        }, 1000);
                    }
                    return;
                }
                if (e.key === "G") {
                    // Go to bottom
                    const endPos = editor.state.doc.content.size;
                    editor.commands.setTextSelection(endPos);
                    scrollCursorIntoView(editor);
                    updateState(prev => ({ ...prev, count: "" }));
                    return;
                }

                // Editing
                if (e.key === "x") {
                    for (let i = 0; i < count; i++) {
                        editor.commands.deleteSelection();
                        const { from } = editor.state.selection;
                        editor.commands.setTextSelection({ from, to: from + 1 });
                        editor.commands.deleteSelection();
                    }
                    updateState(prev => ({ ...prev, count: "" }));
                    return;
                }
                if (e.key === "d") {
                    if (state.commandBuffer === "d") {
                        // dd - delete line
                        for (let i = 0; i < count; i++) {
                            deleteLine(editor);
                        }
                        updateState(prev => ({ ...prev, commandBuffer: "", count: "" }));
                    } else {
                        updateState(prev => ({ ...prev, commandBuffer: "d" }));
                        setTimeout(() => {
                            if (stateRef.current.commandBuffer === "d") {
                                updateState(prev => ({ ...prev, commandBuffer: "" }));
                            }
                        }, 1000);
                    }
                    return;
                }

                // Undo/Redo
                if (e.key === "u") {
                    for (let i = 0; i < count; i++) {
                        editor.commands.undo();
                    }
                    updateState(prev => ({ ...prev, count: "" }));
                    return;
                }
                if (e.ctrlKey && e.key === "r") {
                    for (let i = 0; i < count; i++) {
                        editor.commands.redo();
                    }
                    updateState(prev => ({ ...prev, count: "" }));
                    return;
                }

                // Search
                if (e.key === "/") {
                    updateState(prev => ({ ...prev, mode: "COMMAND", commandBuffer: "/" }));
                    return;
                }
                if (e.key === "n") {
                    // Find next occurrence
                    if (state.searchTerm) {
                        findNext(editor, state.searchTerm, (matches, current) => {
                            updateState(prev => ({ 
                                ...prev, 
                                searchMatches: matches, 
                                currentMatch: current 
                            }));
                        });
                    }
                    return;
                }
                if (e.key === "N") {
                    // Find previous occurrence
                    if (state.searchTerm) {
                        findPrev(editor, state.searchTerm, (matches, current) => {
                            updateState(prev => ({ 
                                ...prev, 
                                searchMatches: matches, 
                                currentMatch: current 
                            }));
                        });
                    }
                    return;
                }

                // Command mode
                if (e.key === ":") {
                    updateState(prev => ({ ...prev, mode: "COMMAND", commandBuffer: "" }));
                    return;
                }

                // Clear count on escape
                if (e.key === "Escape") {
                    updateState(prev => ({ ...prev, count: "", commandBuffer: "" }));
                    return;
                }
            }
        };

        window.addEventListener("keydown", handleKeyDown, true); // Use capture phase
        return () => window.removeEventListener("keydown", handleKeyDown, true);
    }, [enabled, editor]);

    const executeCommand = (cmd: string) => {
        if (!editor) return;

        if (cmd.startsWith("/")) {
            // Search
            const term = cmd.slice(1);
            if (term) {
                findNext(editor, term, (matches, current) => {
                    updateState(prev => ({ 
                        ...prev, 
                        searchTerm: term,
                        searchMatches: matches,
                        currentMatch: current
                    }));
                });
            }
        } else if (cmd === "w" || cmd === "write") {
            // Save (already auto-saves)
            console.log("File saved");
        } else if (cmd === "q" || cmd === "quit") {
            // Close file - just blur the editor
            editor.commands.blur();
        } else if (cmd === "wq") {
            // Save and close
            editor.commands.blur();
        }
    };

    // Cleanup on unmount or when disabled
    useEffect(() => {
        if (!enabled) {
            setVimState(null);
        }
    }, [enabled, setVimState]);
}

// Helper functions
function scrollCursorIntoView(editor: Editor) {
    try {
        const { from } = editor.state.selection;
        const { node } = editor.view.domAtPos(from);
        const element = node instanceof Element ? node : node.parentElement;
        if (element) {
            element.scrollIntoView({ 
                behavior: 'auto', 
                block: 'nearest',
                inline: 'nearest'
            });
        }
    } catch (e) {
        // Ignore scroll errors
    }
}

function moveUp(editor: Editor) {
    const { state } = editor;
    const { $from } = state.selection;
    
    // Try to move to the previous block
    const prevBlockPos = $from.before($from.depth);
    
    if (prevBlockPos <= 0) {
        // Already at the first block
        return;
    }
    
    // Find the previous block
    const $prevBlock = state.doc.resolve(prevBlockPos - 1);
    
    // Try to maintain horizontal position
    const targetOffset = Math.min($from.parentOffset, $prevBlock.parent.content.size);
    const newPos = $prevBlock.start() + targetOffset;
    
    editor.commands.setTextSelection(newPos);
}

function moveDown(editor: Editor) {
    const { state } = editor;
    const { $from } = state.selection;
    
    // Try to move to the next block
    const nextBlockPos = $from.after($from.depth);
    
    if (nextBlockPos >= state.doc.content.size) {
        // Already at the last block
        return;
    }
    
    // Find the next block
    const $nextBlock = state.doc.resolve(nextBlockPos + 1);
    
    // Try to maintain horizontal position
    const targetOffset = Math.min($from.parentOffset, $nextBlock.parent.content.size);
    const newPos = $nextBlock.start() + targetOffset;
    
    editor.commands.setTextSelection(newPos);
}
function moveToNextWord(editor: Editor) {
    const { state } = editor;
    const { from } = state.selection;
    const text = state.doc.textBetween(0, state.doc.content.size, "\n");
    const remaining = text.slice(from);
    const match = remaining.match(/\W*\w+/);
    if (match) {
        editor.commands.setTextSelection(from + match[0].length);
    }
}

function moveToPrevWord(editor: Editor) {
    const { state } = editor;
    const { from } = state.selection;
    const text = state.doc.textBetween(0, from, "\n");
    const reversed = text.split("").reverse().join("");
    const match = reversed.match(/\W*\w+/);
    if (match) {
        editor.commands.setTextSelection(from - match[0].length);
    }
}

function moveToEndOfWord(editor: Editor) {
    const { state } = editor;
    const { from } = state.selection;
    const text = state.doc.textBetween(0, state.doc.content.size, "\n");
    const remaining = text.slice(from);
    const match = remaining.match(/\w+/);
    if (match) {
        editor.commands.setTextSelection(from + match[0].length);
    }
}

function deleteLine(editor: Editor) {
    const { state } = editor;
    const { $from } = state.selection;
    
    // Get the current line boundaries
    const lineStart = $from.start();
    const lineEnd = $from.end();
    
    // Determine what to delete
    let deleteFrom = lineStart;
    let deleteTo = lineEnd;
    
    // Check if there's a next line (content after current line end)
    if (lineEnd < state.doc.content.size - 1) {
        // Not the last line - delete from line start to after the newline
        if (lineStart > 0) {
            deleteFrom = lineStart - 1; // Include the newline before
        }
        deleteTo = lineEnd;
    } else {
        // This is the last line
        if (lineStart > 0) {
            // Delete the newline before this line and the line content
            deleteFrom = lineStart - 1;
            deleteTo = lineEnd;
        } else {
            // Only line in document - just clear its content
            deleteFrom = lineStart;
            deleteTo = lineEnd;
        }
    }
    
    // Perform the deletion
    const tr = state.tr.delete(deleteFrom, deleteTo);
    editor.view.dispatch(tr);
}

function getAllMatches(editor: Editor, term: string): number[] {
    if (!term) return [];
    
    const { state } = editor;
    const matches: number[] = [];
    const lowerTerm = term.toLowerCase();
    
    // Walk through the document and find all matches
    state.doc.descendants((node, pos) => {
        if (node.isText && node.text) {
            const lowerText = node.text.toLowerCase();
            let index = 0;
            while ((index = lowerText.indexOf(lowerTerm, index)) !== -1) {
                matches.push(pos + index);
                index += 1;
            }
        }
        return true;
    });
    
    return matches;
}

function findNext(editor: Editor, term: string, updateState?: (matches: number, current: number) => void) {
    if (!term) return;
    
    const { state, view } = editor;
    const { from } = state.selection;
    
    // Get all match positions
    const matches = getAllMatches(editor, term);
    if (matches.length === 0) return;
    
    // Find the next match after current position
    let nextMatch = matches.find(pos => pos > from);
    
    // If no match found after cursor, wrap to first match
    if (nextMatch === undefined) {
        nextMatch = matches[0];
    }
    
    // Find which match number this is
    const currentMatchIndex = matches.indexOf(nextMatch);
    
    // Select the found text
    editor.commands.setTextSelection({ 
        from: nextMatch, 
        to: nextMatch + term.length 
    });
    
    // Scroll into view - use a more reliable method
    setTimeout(() => {
        try {
            const { node } = view.domAtPos(nextMatch);
            const element = node instanceof Element ? node : node.parentElement;
            if (element) {
                element.scrollIntoView({ 
                    behavior: 'smooth', 
                    block: 'center',
                    inline: 'nearest'
                });
            }
        } catch (e) {
            // Fallback: just focus
            console.error('Scroll error:', e);
        }
    }, 10);
    
    // Update state if callback provided
    if (updateState) {
        updateState(matches.length, currentMatchIndex + 1);
    }
    
    editor.commands.focus();
}

function findPrev(editor: Editor, term: string, updateState?: (matches: number, current: number) => void) {
    if (!term) return;
    
    const { state, view } = editor;
    const { from } = state.selection;
    
    // Get all match positions
    const matches = getAllMatches(editor, term);
    if (matches.length === 0) return;
    
    // Find the previous match before current position
    let prevMatch: number | undefined;
    for (let i = matches.length - 1; i >= 0; i--) {
        if (matches[i] < from) {
            prevMatch = matches[i];
            break;
        }
    }
    
    // If no match found before cursor, wrap to last match
    if (prevMatch === undefined) {
        prevMatch = matches[matches.length - 1];
    }
    
    // Find which match number this is
    const currentMatchIndex = matches.indexOf(prevMatch);
    
    // Select the found text
    editor.commands.setTextSelection({ 
        from: prevMatch, 
        to: prevMatch + term.length 
    });
    
    // Scroll into view - use a more reliable method
    setTimeout(() => {
        try {
            const { node } = view.domAtPos(prevMatch);
            const element = node instanceof Element ? node : node.parentElement;
            if (element) {
                element.scrollIntoView({ 
                    behavior: 'smooth', 
                    block: 'center',
                    inline: 'nearest'
                });
            }
        } catch (e) {
            // Fallback: just focus
            console.error('Scroll error:', e);
        }
    }, 10);
    
    // Update state if callback provided
    if (updateState) {
        updateState(matches.length, currentMatchIndex + 1);
    }
    
    editor.commands.focus();
}
