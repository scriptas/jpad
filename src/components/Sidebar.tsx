import {
    ChevronDown,
    ChevronRight,
    File,
    FileText,
    Folder,
    FolderOpen,
    Search,
    FilePlus,
    FolderPlus,
    Trash2,
    Pencil,
    MoreHorizontal,
    ExternalLink,
    Minus,
    Settings,
} from "lucide-react";
import { invoke } from "@tauri-apps/api/core";
import { useStore, FileNode, findFileNode } from "../store/useStore";
import { useThemeStore } from "../store/useThemeStore";
import { useState, useRef, useEffect, useCallback } from "react";
import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

function cn(...inputs: ClassValue[]) {
    return twMerge(clsx(inputs));
}

/** Context menu state */
interface ContextMenu {
    x: number;
    y: number;
    node: FileNode;
}

export default function Sidebar() {
    const {
        files,
        activeFileId,
        setActiveFileId,
        toggleSidebar,
        createFile,
        createFolder,
        deletePath,
        renamePath,
        movePath,
        notesRoot,
    } = useStore();

    const [expanded, setExpanded] = useState<Record<string, boolean>>({});
    const [searchQuery, setSearchQuery] = useState("");
    const [contextMenu, setContextMenu] = useState<ContextMenu | null>(null);
    const [dragOverId, setDragOverId] = useState<string | null>(null);
    const [draggedId, setDraggedId] = useState<string | null>(null);
    const [showFolderDialog, setShowFolderDialog] = useState(false);
    const [folderDialogParentPath, setFolderDialogParentPath] = useState<string | undefined>();
    const [folderNameInput, setFolderNameInput] = useState("");
    const [selectedFiles, setSelectedFiles] = useState<Set<string>>(new Set());
    const [lastSelectedId, setLastSelectedId] = useState<string | null>(null);
    const contextMenuRef = useRef<HTMLDivElement>(null);
    const dragCounterRef = useRef(0);
    const folderInputRef = useRef<HTMLInputElement>(null);

    // Close context menu when clicking outside
    useEffect(() => {
        const handleClick = (e: MouseEvent) => {
            if (contextMenuRef.current && !contextMenuRef.current.contains(e.target as Node)) {
                setContextMenu(null);
            }
        };
        document.addEventListener("mousedown", handleClick);
        return () => document.removeEventListener("mousedown", handleClick);
    }, []);

    // Auto-focus folder name input when dialog opens
    useEffect(() => {
        if (showFolderDialog && folderInputRef.current) {
            folderInputRef.current.focus();
        }
    }, [showFolderDialog]);

    const handleCreateFile = async (parentPath?: string) => {
        const date = new Date();
        const timestamp = `${date.getHours()}${date.getMinutes()}${date.getSeconds()}`;
        const defaultName = `Untitled-${timestamp}.jt`;
        const basePath = parentPath || notesRoot;

        await createFile(`${basePath}/${defaultName}`);
    };

    const handleCreateFolder = async (parentPath?: string) => {
        setFolderDialogParentPath(parentPath);
        setFolderNameInput("");
        setShowFolderDialog(true);
    };

    const handleFolderDialogSubmit = async () => {
        if (!folderNameInput || !folderNameInput.trim()) {
            return;
        }
        
        // Sanitize folder name - remove invalid characters
        const sanitized = folderNameInput.trim().replace(/[\/\\:*?"<>|]/g, "");
        
        if (!sanitized) {
            alert("Folder name cannot contain only special characters");
            return;
        }
        
        try {
            const basePath = folderDialogParentPath || notesRoot;
            const fullPath = `${basePath}/${sanitized}`;
            
            await createFolder(fullPath);
            setShowFolderDialog(false);
        } catch (error) {
            const message = error instanceof Error ? error.message : String(error);
            console.error("Failed to create folder:", message, error);
            alert(`Failed to create folder: ${message}`);
        }
    };

    const handleFolderDialogCancel = () => {
        setShowFolderDialog(false);
        setFolderNameInput("");
    };

    const handleDelete = async (node: FileNode) => {
        const confirmMsg = node.type === "folder"
            ? `Delete folder "${node.name}" and all its contents?`
            : `Delete "${node.name}"?`;
        if (window.confirm(confirmMsg)) {
            await deletePath(node.id);
        }
    };

    const handleDeleteSelected = useCallback(async () => {
        if (selectedFiles.size === 0) return;
        
        const fileNames = Array.from(selectedFiles).map(id => {
            const node = findFileNode(files, id);
            return node?.name || id;
        });
        
        const confirmMsg = selectedFiles.size === 1 
            ? `Delete "${fileNames[0]}"?`
            : `Delete ${selectedFiles.size} selected items?\n\n${fileNames.join('\n')}`;
            
        if (window.confirm(confirmMsg)) {
            // Delete all selected files
            try {
                for (const fileId of selectedFiles) {
                    await deletePath(fileId);
                }
                // Clear selection after deletion
                setSelectedFiles(new Set());
                setLastSelectedId(null);
            } catch (error) {
                console.error('Error during deletion:', error);
            }
        }
    }, [selectedFiles, files, deletePath, setSelectedFiles, setLastSelectedId]);

    const getAllFileIds = (nodes: FileNode[]): string[] => {
        const ids: string[] = [];
        const traverse = (nodeList: FileNode[]) => {
            for (const node of nodeList) {
                ids.push(node.id);
                if (node.children) {
                    traverse(node.children);
                }
            }
        };
        traverse(nodes);
        return ids;
    };

    const handleFileClick = (node: FileNode, event: React.MouseEvent) => {
        if (event.shiftKey && lastSelectedId) {
            // Shift+click: select range
            const allFiles = getAllFileIds(files);
            const lastIndex = allFiles.indexOf(lastSelectedId);
            const currentIndex = allFiles.indexOf(node.id);
            
            if (lastIndex !== -1 && currentIndex !== -1) {
                const start = Math.min(lastIndex, currentIndex);
                const end = Math.max(lastIndex, currentIndex);
                const rangeIds = allFiles.slice(start, end + 1);
                
                setSelectedFiles(new Set(rangeIds));
            }
        } else if (event.ctrlKey || event.metaKey) {
            // Ctrl/Cmd+click: toggle selection
            const newSelected = new Set(selectedFiles);
            if (newSelected.has(node.id)) {
                newSelected.delete(node.id);
            } else {
                newSelected.add(node.id);
            }
            setSelectedFiles(newSelected);
            setLastSelectedId(node.id);
        } else {
            // Regular click: clear selection and handle normally
            setSelectedFiles(new Set());
            setLastSelectedId(node.id);
            
            if (node.type === "folder") {
                toggleExpand(node.id);
            } else {
                setActiveFileId(node.id);
            }
        }
    };

    const handleRename = async (node: FileNode) => {
        const newName = window.prompt("Enter new name", node.name);
        if (newName && newName !== node.name) {
            const parts = node.id.split("/");
            parts[parts.length - 1] = newName;
            const newPath = parts.join("/");
            await renamePath(node.id, newPath);
        }
    };

    const handleKeyDown = useCallback((event: KeyboardEvent) => {
        if (event.key === 'Delete' || event.key === 'Backspace') {
            if (selectedFiles.size > 0) {
                event.preventDefault();
                handleDeleteSelected();
            }
        }
    }, [selectedFiles, handleDeleteSelected]);

    // Add keyboard event listener for delete key
    useEffect(() => {
        document.addEventListener('keydown', handleKeyDown);
        return () => document.removeEventListener('keydown', handleKeyDown);
    }, [handleKeyDown]);

    // ── Drag & Drop helpers ──

    const handleDragStart = (e: React.DragEvent, node: FileNode) => {
        e.stopPropagation();
        const payload = JSON.stringify({ id: node.id, name: node.name });
        e.dataTransfer.setData("application/jpad-node", payload);
        e.dataTransfer.effectAllowed = "move";
        setDraggedId(node.id);
    };

    const handleDragEnd = () => {
        setDraggedId(null);
        setDragOverId(null);
        dragCounterRef.current = 0;
    };

    const handleDragEnter = (e: React.DragEvent, node: FileNode) => {
        e.preventDefault();
        e.stopPropagation();
        if (node.type !== "folder") return;
        dragCounterRef.current++;
        setDragOverId(node.id);
    };

    const handleDragOver = (e: React.DragEvent, node: FileNode) => {
        e.preventDefault();
        e.stopPropagation();
        if (node.type !== "folder") {
            e.dataTransfer.dropEffect = "none";
            return;
        }
        e.dataTransfer.dropEffect = "move";
        if (dragOverId !== node.id) setDragOverId(node.id);
    };

    const handleDragLeave = (e: React.DragEvent) => {
        e.preventDefault();
        e.stopPropagation();
        dragCounterRef.current--;
        if (dragCounterRef.current <= 0) {
            dragCounterRef.current = 0;
            setDragOverId(null);
        }
    };

    const executeDrop = async (sourceId: string, sourceName: string, targetFolderId: string) => {
        if (!sourceId || sourceId === targetFolderId) return;
        // Prevent dropping a folder into itself or a descendant
        if (targetFolderId.startsWith(sourceId + "/")) {
            console.warn("Cannot drop a folder into its own subtree");
            return;
        }
        const newPath = `${targetFolderId}/${sourceName}`;
        if (sourceId === newPath) return; // Already there
        await movePath(sourceId, newPath);
    };

    const handleDrop = async (e: React.DragEvent, targetNode: FileNode) => {
        e.preventDefault();
        e.stopPropagation();
        setDragOverId(null);
        setDraggedId(null);
        dragCounterRef.current = 0;

        if (targetNode.type !== "folder") return;

        const raw = e.dataTransfer.getData("application/jpad-node");
        if (!raw) return;

        try {
            const { id: sourceId, name: sourceName } = JSON.parse(raw);
            await executeDrop(sourceId, sourceName, targetNode.id);
        } catch {
            console.error("Invalid drag data");
        }
    };

    /** Drop onto the root file-tree area (move to notes root) */
    const handleRootDragOver = (e: React.DragEvent) => {
        e.preventDefault();
        e.dataTransfer.dropEffect = "move";
    };

    const handleRootDrop = async (e: React.DragEvent) => {
        e.preventDefault();
        setDragOverId(null);
        setDraggedId(null);
        dragCounterRef.current = 0;

        const raw = e.dataTransfer.getData("application/jpad-node");
        if (!raw) return;

        try {
            const { id: sourceId, name: sourceName } = JSON.parse(raw);
            await executeDrop(sourceId, sourceName, notesRoot);
        } catch {
            console.error("Invalid drag data");
        }
    };

    const handleCopyPath = (path: string) => {
        navigator.clipboard.writeText(path);
    };

    const toggleExpand = (id: string) => {
        setExpanded((prev) => ({ ...prev, [id]: !prev[id] }));
    };

    const handleContextMenu = (e: React.MouseEvent, node: FileNode) => {
        e.preventDefault();
        e.stopPropagation();
        setContextMenu({ x: e.clientX, y: e.clientY, node });
    };

    /** Filter nodes by search query recursively */
    const filterNodes = useCallback(
        (nodes: FileNode[], query: string): FileNode[] => {
            if (!query.trim()) return nodes;
            const lowerQuery = query.toLowerCase();
            return nodes.reduce<FileNode[]>((acc, node) => {
                if (node.type === "file") {
                    if (node.name.toLowerCase().includes(lowerQuery)) {
                        acc.push(node);
                    }
                } else if (node.children) {
                    const filteredChildren = filterNodes(node.children, query);
                    if (filteredChildren.length > 0) {
                        acc.push({ ...node, children: filteredChildren });
                    } else if (node.name.toLowerCase().includes(lowerQuery)) {
                        acc.push(node);
                    }
                }
                return acc;
            }, []);
        },
        []
    );

    const getFileIcon = (name: string) => {
        const ext = name.split(".").pop()?.toLowerCase();
        switch (ext) {
            case "jt":
            case "md":
            case "txt":
                return <FileText size={14} className="mr-1.5 text-primary" />;
            default:
                return <File size={14} className="mr-1.5 opacity-70" />;
        }
    };

    const renderTree = (nodes: FileNode[], depth = 0) => {
        return nodes.map((node) => {
            const isExpanded = expanded[node.id];
            const isActive = activeFileId === node.id;
            const isDragOver = dragOverId === node.id;
            const isDragging = draggedId === node.id;
            const isSelected = selectedFiles.has(node.id);

            return (
                <div key={node.id} className="animate-in fade-in duration-150">
                    <div
                        draggable="true"
                        onDragStart={(e) => handleDragStart(e, node)}
                        onDragEnd={handleDragEnd}
                        onDragEnter={(e) => handleDragEnter(e, node)}
                        onDragOver={(e) => handleDragOver(e, node)}
                        onDragLeave={handleDragLeave}
                        onDrop={(e) => handleDrop(e, node)}
                        className={cn(
                            "flex items-center py-[5px] px-2 cursor-pointer rounded-md mx-1 group transition-all duration-150 relative",
                            "hover:bg-surface-hover/60 cursor-grab active:cursor-grabbing",
                            isActive && "bg-surface text-primary ring-1 ring-primary/20",
                            isSelected && !isActive && "bg-primary/20 ring-1 ring-primary/40",
                            isDragOver && "bg-primary/40 ring-2 ring-primary shadow-xl scale-[1.05] z-50",
                            isDragging && "opacity-50"
                        )}
                        style={{ paddingLeft: `${depth * 16 + 8}px` }}
                        onClick={(e) => handleFileClick(node, e)}
                        onContextMenu={(e) => handleContextMenu(e, node)}
                    >
                        {/* Wrapper for content to allow the div to be the drag target */}
                        <div className="flex items-center flex-1 min-w-0">
                            {node.type === "folder" ? (
                                <>
                                    {isExpanded ? (
                                        <ChevronDown size={14} className="mr-1 opacity-70 flex-shrink-0" />
                                    ) : (
                                        <ChevronRight size={14} className="mr-1 opacity-70 flex-shrink-0" />
                                    )}
                                    {isExpanded ? (
                                        <FolderOpen size={14} className="mr-1.5 text-primary flex-shrink-0" />
                                    ) : (
                                        <Folder size={14} className="mr-1.5 text-primary flex-shrink-0" />
                                    )}
                                </>
                            ) : (
                                <>
                                    <span className="w-[14px] mr-1 flex-shrink-0" />
                                    {getFileIcon(node.name)}
                                </>
                            )}
                            <span className={cn(
                                "text-[13px] truncate",
                                isActive ? "font-semibold" : "font-normal"
                            )}>
                                {node.name}
                            </span>
                        </div>
                        {/* Hover action: more menu - NOT pointer-events-none */}
                        <button
                            className="ml-auto opacity-0 group-hover:opacity-70 hover:!opacity-100 p-0.5 rounded transition-opacity flex-shrink-0 relative z-10 pointer-events-auto"
                            onClick={(e) => {
                                e.stopPropagation();
                                handleContextMenu(e, node);
                            }}
                        >
                            <MoreHorizontal size={12} />
                        </button>
                    </div>
                    {node.type === "folder" && isExpanded && node.children && (
                        <div className="overflow-hidden">
                            {renderTree(node.children, depth + 1)}
                        </div>
                    )}
                </div>
            );
        });
    };

    const displayedFiles = filterNodes(files, searchQuery);

    const activeThemeIdStore = useThemeStore((state) => state.activeThemeId);

    return (
        <aside 
            className="w-full h-full flex flex-col border-r border-border bg-sidebar" 
            tabIndex={0}
            onFocus={() => {
                // Ensure sidebar can receive keyboard events
            }}
        >
            {/* Sidebar Header */}
            <div className="flex items-center px-3 py-2.5 border-b border-border bg-sidebar/80 backdrop-blur-sm">
                <button
                    onClick={toggleSidebar}
                    title="Collapse Sidebar"
                    className="p-1.5 hover:bg-surface-hover rounded-md transition-colors opacity-70 hover:opacity-100 mr-2"
                >
                    <Minus size={14} />
                </button>
                <h1 className="text-[11px] font-bold tracking-[0.12em] text-text uppercase">
                    <span className={cn(
                        activeThemeIdStore === "cyberpunk-vibe" && "text-[#FF00FF] drop-shadow-[0_0_8px_rgba(255,0,255,0.8)]"
                    )}>E</span>xplorer
                </h1>
                <div className="flex items-center gap-0.5 ml-auto">
                    <button
                        onClick={() => handleCreateFile()}
                        title="New File"
                        className="p-1.5 hover:bg-surface-hover rounded-md transition-all opacity-70 hover:opacity-100 text-text"
                    >
                        <FilePlus size={14} />
                    </button>
                    <button
                        onClick={() => handleCreateFolder()}
                        title="New Folder"
                        className="p-1.5 hover:bg-surface-hover rounded-md transition-all opacity-70 hover:opacity-100 text-text"
                    >
                        <FolderPlus size={14} />
                    </button>
                    <button
                        onClick={() => invoke("open_folder", { path: notesRoot })}
                        title="Open file location"
                        className="p-1.5 hover:bg-surface-hover rounded-md transition-all opacity-70 hover:opacity-100 text-text"
                    >
                        <ExternalLink size={14} />
                    </button>
                </div>
            </div>

            {/* Search Box */}
            <div className="px-3 py-3">
                <div className="relative group">
                    <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-text-muted group-focus-within:text-primary transition-colors opacity-80" />
                    <input
                        type="text"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        placeholder="Search notes..."
                        className="w-full bg-surface/40 border border-border/80 rounded-lg py-1.5 pl-8 pr-3 text-xs text-text placeholder:text-text-muted/80 focus:outline-none focus:ring-1 focus:ring-primary/60 focus:border-primary/50 transition-all"
                    />
                </div>
            </div>

            {/* File Tree — also acts as root-level drop target */}
            <div
                className="flex-1 overflow-y-auto py-1"
                onDragOver={handleRootDragOver}
                onDrop={handleRootDrop}
                onClick={(e) => {
                    // Clear selection when clicking in empty space
                    if (e.target === e.currentTarget) {
                        setSelectedFiles(new Set());
                        setLastSelectedId(null);
                    }
                }}
            >
                {selectedFiles.size > 0 && (
                    <div className="mx-3 mb-2 px-2 py-1 bg-primary/10 border border-primary/20 rounded-md text-xs text-primary flex items-center justify-between">
                        <span>{selectedFiles.size} item{selectedFiles.size > 1 ? 's' : ''} selected</span>
                        <div className="flex gap-2">
                            <button
                                onClick={handleDeleteSelected}
                                className="text-red-400 hover:text-red-300 text-xs underline"
                            >
                                Delete
                            </button>
                            <button
                                onClick={() => {
                                    setSelectedFiles(new Set());
                                    setLastSelectedId(null);
                                }}
                                className="text-primary/70 hover:text-primary text-xs underline"
                            >
                                Clear
                            </button>
                        </div>
                    </div>
                )}
                {displayedFiles.length > 0 ? (
                    renderTree(displayedFiles)
                ) : (
                    <div className="text-center text-text-muted text-xs py-8 px-4 opacity-70">
                        {searchQuery
                            ? "No files match your search"
                            : "No files yet. Create one to get started!"}
                    </div>
                )}
            </div>

            {/* Bottom Toolbar */}
            <div className="px-3 py-2.5 border-t border-border bg-sidebar/50 flex items-center justify-between">
                <button
                    onClick={() => useThemeStore.getState().toggleSettings()}
                    title="Appearance Settings"
                    className="p-1.5 hover:bg-surface-hover rounded-md transition-all opacity-70 hover:opacity-100 text-text flex items-center gap-2 text-[11px] font-medium"
                >
                    <Settings size={14} />
                    <span>Settings</span>
                </button>
                <div className="text-[10px] text-text-muted font-mono opacity-50">
                    v1.1.0
                </div>
            </div>

            {/* Context Menu */}
            {contextMenu && (
                <div
                    ref={contextMenuRef}
                    className="fixed z-[100] min-w-[160px] bg-surface border border-border rounded-lg shadow-xl shadow-black/30 py-1 animate-in fade-in zoom-in-95 duration-100"
                    style={{ left: contextMenu.x, top: contextMenu.y }}
                >
                    {selectedFiles.size > 1 && (
                        <>
                            <button
                                className="w-full text-left px-3 py-1.5 text-xs text-red-400 hover:bg-red-500/10 flex items-center gap-2 transition-colors font-medium"
                                onClick={() => {
                                    handleDeleteSelected();
                                    setContextMenu(null);
                                }}
                            >
                                <Trash2 size={12} />
                                Delete Selected ({selectedFiles.size})
                            </button>
                            <div className="h-[1px] bg-border my-1 mx-2" />
                        </>
                    )}
                    {contextMenu.node.type === "folder" && (
                        <>
                            <button
                                className="w-full text-left px-3 py-1.5 text-xs text-text hover:bg-surface-hover flex items-center gap-2 transition-colors"
                                onClick={() => {
                                    handleCreateFile(contextMenu.node.id);
                                    setContextMenu(null);
                                }}
                            >
                                <FilePlus size={12} className="opacity-60" />
                                New File Here
                            </button>
                            <button
                                className="w-full text-left px-3 py-1.5 text-xs text-text hover:bg-surface-hover flex items-center gap-2 transition-colors"
                                onClick={() => {
                                    handleCreateFolder(contextMenu.node.id);
                                    setContextMenu(null);
                                }}
                            >
                                <FolderPlus size={12} className="opacity-60" />
                                New Folder Here
                            </button>
                            <div className="h-[1px] bg-border my-1 mx-2" />
                        </>
                    )}
                    <button
                        className="w-full text-left px-3 py-1.5 text-xs text-text hover:bg-surface-hover flex items-center gap-2 transition-colors"
                        onClick={() => {
                            invoke("reveal_path", { path: contextMenu.node.id });
                            setContextMenu(null);
                        }}
                    >
                        <ExternalLink size={12} className="opacity-60" />
                        Reveal in Explorer
                    </button>
                    <button
                        className="w-full text-left px-3 py-1.5 text-xs text-text hover:bg-surface-hover flex items-center gap-2 transition-colors"
                        onClick={() => {
                            handleCopyPath(contextMenu.node.id);
                            setContextMenu(null);
                        }}
                    >
                        <FileText size={12} className="opacity-60" />
                        Copy Path
                    </button>
                    <button
                        className="w-full text-left px-3 py-1.5 text-xs text-text hover:bg-surface-hover flex items-center gap-2 transition-colors"
                        onClick={() => {
                            handleRename(contextMenu.node);
                            setContextMenu(null);
                        }}
                    >
                        <Pencil size={12} className="opacity-60" />
                        Rename
                    </button>
                    <button
                        className="w-full text-left px-3 py-1.5 text-xs text-red-400 hover:bg-red-500/10 flex items-center gap-2 transition-colors"
                        onClick={() => {
                            handleDelete(contextMenu.node);
                            setContextMenu(null);
                        }}
                    >
                        <Trash2 size={12} />
                        Delete
                    </button>
                </div>
            )}

            {/* Folder Name Dialog */}
            {showFolderDialog && (
                <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/50 backdrop-blur-sm animate-in fade-in duration-200">
                    <div className="bg-surface border border-border rounded-lg shadow-xl shadow-black/40 p-6 w-80 animate-in zoom-in-95 duration-200">
                        <h3 className="text-lg font-semibold text-text mb-4">Create New Folder</h3>
                        <input
                            ref={folderInputRef}
                            type="text"
                            value={folderNameInput}
                            onChange={(e) => setFolderNameInput(e.target.value)}
                            onKeyDown={(e) => {
                                if (e.key === "Enter") {
                                    handleFolderDialogSubmit();
                                } else if (e.key === "Escape") {
                                    handleFolderDialogCancel();
                                }
                            }}
                            placeholder="Enter folder name"
                            className="w-full bg-background border border-border rounded-md py-2 px-3 text-text placeholder:text-text-muted focus:outline-none focus:ring-2 focus:ring-primary/60 focus:border-primary/50 transition-all mb-4"
                        />
                        <div className="flex gap-2 justify-end">
                            <button
                                onClick={handleFolderDialogCancel}
                                className="px-4 py-2 text-text-muted hover:text-text hover:bg-surface-hover rounded-md transition-all"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={handleFolderDialogSubmit}
                                className="px-4 py-2 bg-primary text-white hover:bg-primary/90 rounded-md transition-all font-medium"
                            >
                                Create
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </aside>
    );
}
