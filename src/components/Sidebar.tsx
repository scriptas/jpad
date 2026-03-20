import {
    ChevronDown,
    ChevronRight,
    FileText,
    Folder,
    FolderOpen,
    Search,
    FilePlus,
    FolderPlus,
    Settings as SettingsIcon,
    X,
} from "lucide-react";
import { useStore, FileNode } from "../store/useStore";
import { useThemeStore } from "../store/useThemeStore";
import { useState, useRef, useEffect, useCallback } from "react";
import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";
import { platform } from "@tauri-apps/plugin-os";

function cn(...inputs: ClassValue[]) {
    return twMerge(clsx(inputs));
}

export default function Sidebar() {
    const {
        files,
        activeFileId,
        setActiveFileId,
        toggleSidebar,
        createFile,
        createFolder,
        movePath,
        notesRoot,
        searchResults,
        isSearching,
        searchFiles,
        clearSearch,
    } = useStore();

    const [expanded, setExpanded] = useState<Record<string, boolean>>({});
    const [searchQuery, setSearchQuery] = useState("");
    const [dragOverId, setDragOverId] = useState<string | null>(null);
    const [draggedId, setDraggedId] = useState<string | null>(null);
    const [showFolderDialog, setShowFolderDialog] = useState(false);
    const [folderDialogParentPath, setFolderDialogParentPath] = useState<string | undefined>();
    const [folderNameInput, setFolderNameInput] = useState("");
    const [selectedFiles, setSelectedFiles] = useState<Set<string>>(new Set());
    const [lastSelectedId, setLastSelectedId] = useState<string | null>(null);
    const folderInputRef = useRef<HTMLInputElement>(null);
    const searchTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

    const isMobile = platform() === "android" || platform() === "ios";

    // Auto-focus folder name input when dialog opens
    useEffect(() => {
        if (showFolderDialog && folderInputRef.current) {
            folderInputRef.current.focus();
        }
    }, [showFolderDialog]);

    // Debounced search
    useEffect(() => {
        if (searchTimeoutRef.current) {
            clearTimeout(searchTimeoutRef.current);
        }

        if (searchQuery.trim()) {
            searchTimeoutRef.current = setTimeout(() => {
                searchFiles(searchQuery);
            }, 300);
        } else {
            clearSearch();
        }

        return () => {
            if (searchTimeoutRef.current) {
                clearTimeout(searchTimeoutRef.current);
            }
        };
    }, [searchQuery, searchFiles, clearSearch]);

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

    const handleDragStart = (e: React.DragEvent, id: string) => {
        setDraggedId(id);
        e.dataTransfer.setData("text/plain", id);
    };

    const handleDragOver = (e: React.DragEvent, node: FileNode) => {
        if (node.type !== "folder" || node.id === draggedId) return;
        e.preventDefault();
        setDragOverId(node.id);
    };

    const handleDragLeave = () => {
        setDragOverId(null);
    };

    const handleDrop = async (e: React.DragEvent, targetFolder: FileNode) => {
        e.preventDefault();
        const sourcePath = e.dataTransfer.getData("text/plain");
        setDragOverId(null);
        setDraggedId(null);

        if (!sourcePath || targetFolder.type !== "folder" || sourcePath === targetFolder.id) {
            return;
        }

        const fileName = sourcePath.split("/").pop();
        const newPath = `${targetFolder.id}/${fileName}`;

        if (sourcePath === newPath) return;

        try {
            await movePath(sourcePath, newPath);
            setExpanded(prev => ({ ...prev, [targetFolder.id]: true }));
        } catch (error) {
            console.error("Failed to move file:", error);
        }
    };

    const handleFolderDialogSubmit = async () => {
        if (!folderNameInput || !folderNameInput.trim()) {
            return;
        }
        const sanitized = folderNameInput.trim().replace(/[\/\\:*?"<>|]/g, "");
        if (!sanitized) {
            return;
        }
        try {
            const basePath = folderDialogParentPath || notesRoot;
            const fullPath = `${basePath}/${sanitized}`;
            await createFolder(fullPath);
            setExpanded(prev => ({ ...prev, [basePath]: true }));
            setShowFolderDialog(false);
        } catch (error) {
            const message = error instanceof Error ? error.message : String(error);
            console.error("Failed to create folder:", message, error);
        }
    };

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
            const newSelected = new Set(selectedFiles);
            if (newSelected.has(node.id)) {
                newSelected.delete(node.id);
            } else {
                newSelected.add(node.id);
            }
            setSelectedFiles(newSelected);
            setLastSelectedId(node.id);
        } else {
            setSelectedFiles(new Set());
            setLastSelectedId(node.id);
            if (node.type === "folder") {
                toggleExpand(node.id);
            } else {
                setActiveFileId(node.id);
                if (isMobile) toggleSidebar();
            }
        }
    };

    const toggleExpand = (id: string) => {
        setExpanded((prev) => ({ ...prev, [id]: !prev[id] }));
    };

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

    const getFileIcon = (_name: string) => {
        return <FileText size={isMobile ? 18 : 14} className="mr-1.5 text-primary" />;
    };

    const renderTree = (nodes: FileNode[], depth = 0) => {
        return nodes.map((node) => {
            const isExpanded = expanded[node.id];
            const isActive = activeFileId === node.id;
            const isSelected = selectedFiles.has(node.id);
            const isDragOver = dragOverId === node.id;
            const isDragging = draggedId === node.id;

            return (
                <div key={node.id} className="animate-in fade-in duration-150">
                    <div
                        draggable
                        onDragStart={(e) => handleDragStart(e, node.id)}
                        onDragOver={(e) => handleDragOver(e, node)}
                        onDragLeave={handleDragLeave}
                        onDrop={(e) => handleDrop(e, node)}
                        className={cn(
                            "flex items-center py-[6px] px-2 cursor-pointer rounded-md mx-1 group transition-all duration-150 relative",
                            "hover:bg-surface-hover/60",
                            isActive && "bg-surface text-primary ring-1 ring-primary/20",
                            isSelected && !isActive && "bg-primary/20 ring-1 ring-primary/40",
                            isDragOver && "bg-primary/40 ring-2 ring-primary shadow-xl scale-[1.05] z-50",
                            isDragging && "opacity-50",
                            isMobile ? "min-h-[52px]" : "cursor-grab active:cursor-grabbing"
                        )}
                        style={{ paddingLeft: `${depth * 16 + 8}px` }}
                        onClick={(e) => handleFileClick(node, e)}
                    >
                        <div className="flex items-center flex-1 min-w-0">
                            {node.type === "folder" ? (
                                <>
                                    {isExpanded ? (
                                        <ChevronDown size={isMobile ? 20 : 14} className="mr-1 opacity-70 flex-shrink-0" />
                                    ) : (
                                        <ChevronRight size={isMobile ? 20 : 14} className="mr-1 opacity-70 flex-shrink-0" />
                                    )}
                                    {isExpanded ? (
                                        <FolderOpen size={isMobile ? 20 : 14} className="mr-1.5 text-primary flex-shrink-0" />
                                    ) : (
                                        <Folder size={isMobile ? 20 : 14} className="mr-1.5 text-primary flex-shrink-0" />
                                    )}
                                </>
                            ) : (
                                <>
                                    <span className={cn(isMobile ? "w-[20px]" : "w-[14px]", "mr-1 flex-shrink-0")} />
                                    {getFileIcon(node.name)}
                                </>
                            )}
                            <span className={cn(
                                isMobile ? "text-[16px]" : "text-[13px] truncate",
                                isActive ? "font-semibold" : "font-normal"
                            )}>
                                {node.name}
                            </span>
                        </div>
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

    const renderSearchResults = () => {
        if (searchResults.length === 0) {
            return (
                <div className="text-center text-text-muted text-xs py-10 px-4 opacity-70">
                    {isSearching ? "Searching..." : "No results found"}
                </div>
            );
        }
        return searchResults.map((result) => {
            const isActive = activeFileId === result.path;
            return (
                <div
                    key={result.path}
                    className={cn(
                        "flex flex-col py-3 px-3 mx-1 cursor-pointer rounded-md group transition-all duration-150",
                        "hover:bg-surface-hover/60",
                        isActive && "bg-surface text-primary ring-1 ring-primary/20",
                        isMobile && "mb-2 min-h-[60px] justify-center"
                    )}
                    onClick={() => {
                        setActiveFileId(result.path);
                        setSearchQuery("");
                        clearSearch();
                        if (isMobile) toggleSidebar();
                    }}
                >
                    <div className="flex items-center gap-2">
                        {getFileIcon(result.name)}
                        <span className={cn(
                            isMobile ? "text-[16px]" : "text-[13px] truncate flex-1",
                            isActive ? "font-semibold" : "font-normal"
                        )}>
                            {result.name}
                        </span>
                    </div>
                </div>
            );
        });
    };

    return (
        <aside
            className="w-full h-full flex flex-col border-r-2 border-border bg-sidebar"
            tabIndex={0}
        >
            {/* Sidebar Header */}
            <div className={cn(
                "flex items-center px-4 border-b-2 border-border bg-sidebar/80 backdrop-blur-sm",
                isMobile ? "pt-[max(env(safe-area-inset-top,44px),44px)] pb-4 min-h-[6.5rem]" : "py-2.5"
            )}>
                {isMobile ? (
                    <>
                        <button
                            onClick={toggleSidebar}
                            className="p-2.5 hover:bg-surface-hover rounded-xl transition-all"
                        >
                            <X size={24} className="text-primary" />
                        </button>
                        <h1 className="text-[14px] font-bold tracking-[0.12em] text-text uppercase ml-2 flex-1">
                            Explorer
                        </h1>
                    </>
                ) : (
                    <>
                        <h1 className="text-[11px] font-bold tracking-[0.12em] text-text uppercase flex-1">
                            Explorer
                        </h1>
                    </>
                )}
                <div className="flex items-center gap-2">
                    <button
                        onClick={() => handleCreateFile()}
                        className="p-2 hover:bg-surface-hover rounded-xl transition-all border border-border/50"
                    >
                        <FilePlus size={isMobile ? 22 : 14} />
                    </button>
                    <button
                        onClick={() => handleCreateFolder()}
                        className="p-2 hover:bg-surface-hover rounded-xl transition-all border border-border/50"
                    >
                        <FolderPlus size={isMobile ? 22 : 14} />
                    </button>
                </div>
            </div>

            {/* Search Box */}
            <div className="px-5 py-5">
                <div className="relative group">
                    <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-5 w-5 text-text-muted opacity-80" />
                    <input
                        type="text"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        placeholder="Search notes..."
                        className={cn(
                            "w-full bg-surface/40 border-2 border-border rounded-xl pl-11 pr-11 text-text placeholder:text-text-muted/60 focus:outline-none focus:ring-2 focus:ring-primary/40 transition-all",
                            isMobile ? "py-3.5 text-[16px]" : "py-1.5 text-xs"
                        )}
                    />
                </div>
            </div>

            {/* File Tree */}
            <div className="flex-1 overflow-y-auto py-2">
                {searchQuery ? (
                    <div className="animate-in fade-in duration-200">
                        {renderSearchResults()}
                    </div>
                ) : (
                    displayedFiles.length > 0 ? (
                        renderTree(displayedFiles)
                    ) : (
                        <div className="text-center text-text-muted text-sm py-16 px-8 opacity-60 italic">
                            No files yet.
                        </div>
                    )
                )}
            </div>

            {/* Bottom Toolbar */}
            <div className={cn(
                "px-5 border-t-2 border-border bg-sidebar/50 flex items-center justify-between",
                isMobile ? "py-6 pb-[calc(env(safe-area-inset-bottom,24px)+16px)]" : "py-2.5"
            )}>
                <button
                    onClick={() => useThemeStore.getState().toggleSettings()}
                    className="p-2.5 hover:bg-surface-hover rounded-xl transition-all text-text flex items-center gap-3 text-[14px] font-semibold border border-border/50"
                >
                    <SettingsIcon size={20} />
                    <span>Settings</span>
                </button>
                <div className="text-[12px] text-text-muted font-mono opacity-40">
                    v1.3.0
                </div>
            </div>

            {/* Folder Creation Dialog Overlay */}
            {showFolderDialog && (
                <div className="fixed inset-0 z-[200] flex items-center justify-center p-6 animate-in fade-in zoom-in duration-200">
                    <div className="absolute inset-0 bg-black/80 backdrop-blur-sm" onClick={() => setShowFolderDialog(false)} />
                    <div className="relative w-full max-w-md bg-sidebar/95 border-2 border-primary/30 rounded-2xl p-6 shadow-2xl backdrop-blur-md">
                        <h2 className="text-lg font-bold mb-4 flex items-center gap-2">
                            <FolderPlus size={20} className="text-primary" />
                            Create New Folder
                        </h2>
                        <input
                            ref={folderInputRef}
                            type="text"
                            value={folderNameInput}
                            onChange={(e) => setFolderNameInput(e.target.value)}
                            onKeyDown={(e) => e.key === "Enter" && handleFolderDialogSubmit()}
                            placeholder="Folder name..."
                            className="w-full bg-surface/60 border-2 border-border rounded-xl px-4 py-3 mb-6 focus:outline-none focus:ring-2 focus:ring-primary/40 transition-all text-[16px] text-text"
                        />
                        <div className="flex gap-3">
                            <button
                                onClick={() => setShowFolderDialog(false)}
                                className="flex-1 px-4 py-3 rounded-xl border-2 border-border font-semibold hover:bg-surface-hover transition-all text-text"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={handleFolderDialogSubmit}
                                className="flex-1 px-4 py-3 rounded-xl bg-primary text-white font-bold hover:bg-primary/90 transition-all shadow-lg shadow-primary/20"
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
