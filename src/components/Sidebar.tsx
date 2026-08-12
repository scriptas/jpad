import {
    ChevronDown,
    ChevronRight,
    Folder,
    FolderOpen,
    Search,
    FilePlus,
    FolderPlus,
    Settings as SettingsIcon,
    Trash2,
    Pencil,
    MoreVertical,
    ExternalLink,
    Maximize2,
    RefreshCw,
    X,
} from "lucide-react";
import { getVersion } from "@tauri-apps/api/app";
import { getFileIconForName } from "./FileIcons";
import { useStore, FileNode, findFileNode } from "../store/useStore";
import { useThemeStore } from "../store/useThemeStore";
import { useSettingsStore } from "../store/useSettingsStore";
import { useState, useRef, useEffect, useCallback, useLayoutEffect } from "react";
import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";
import { platform } from "@tauri-apps/plugin-os";
import { invoke } from "@tauri-apps/api/core";

function cn(...inputs: ClassValue[]) {
    return twMerge(clsx(inputs));
}

const PATH_COLORS = [
    { name: "Default", value: "" },
    { name: "Cream", value: "#f0e4d0" },
    { name: "Red", value: "#e06060" },
    { name: "Amber", value: "#d4a06a" },
    { name: "Green", value: "#a0c878" },
    { name: "Blue", value: "#5a8ae0" },
    { name: "Purple", value: "#b068c8" },
    { name: "Muted", value: "#8a7d6b" },
];

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
        deletePath,
        deletePaths,
        renamePath,
        selectedFiles,
        setSelectedFiles,
        lastSelectedId,
        setLastSelectedId,
        clearSelection,
    } = useStore();

    const { pathColors, setPathColor } = useSettingsStore();

    const [appVersion, setAppVersion] = useState<string>("");

    useEffect(() => {
        getVersion().then(setAppVersion);
    }, []);

    const [expanded, setExpanded] = useState<Record<string, boolean>>({});
    const [searchQuery, setSearchQuery] = useState("");
    const [dragOverId, setDragOverId] = useState<string | null>(null);
    const [draggedId, setDraggedId] = useState<string | null>(null);
    const [showFolderDialog, setShowFolderDialog] = useState(false);
    const [touchDraggedId, setTouchDraggedId] = useState<string | null>(null);
    const [touchTargetId, setTouchTargetId] = useState<string | null>(null);
    const [touchIndicatorPos, setTouchIndicatorPos] = useState({ x: 0, y: 0 });
    const [touchStartPos, setTouchStartPos] = useState({ x: 0, y: 0 });
    const touchDragTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const [folderDialogParentPath, setFolderDialogParentPath] = useState<string | undefined>();
    const [folderNameInput, setFolderNameInput] = useState("");
    const folderInputRef = useRef<HTMLInputElement>(null);
    const searchTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const renameInputRef = useRef<HTMLInputElement>(null);
    const menuRef = useRef<HTMLDivElement>(null);
    const internalDropHandledRef = useRef(false);

    const [contextMenu, setContextMenu] = useState<{
        x: number;
        y: number;
        node: FileNode;
    } | null>(null);

    const [renamingId, setRenamingId] = useState<string | null>(null);
    const [renamingName, setRenamingName] = useState("");
    const [showDeleteConfirm, setShowDeleteConfirm] = useState<FileNode | null>(null);
    const [showBulkDeleteConfirm, setShowBulkDeleteConfirm] = useState(false);

    const isMobile = platform() === "android" || platform() === "ios";

    // Auto-focus folder name input when dialog opens
    useEffect(() => {
        if (showFolderDialog && folderInputRef.current) {
            folderInputRef.current.focus();
        }
    }, [showFolderDialog]);

    // Auto-focus renaming input and select the base name (before extension)
    useEffect(() => {
        if (renamingId && renameInputRef.current) {
            renameInputRef.current.focus();
            const name = renameInputRef.current.value;
            const dotIndex = name.lastIndexOf(".");
            // Select just the base name; if no dot, select all
            if (dotIndex > 0) {
                renameInputRef.current.setSelectionRange(0, dotIndex);
            } else {
                renameInputRef.current.select();
            }
        }
    }, [renamingId]);

    // Close context menu on click outside
    useEffect(() => {
        const handleClickOutside = () => setContextMenu(null);
        if (contextMenu) {
            window.addEventListener("click", handleClickOutside);
        }
        return () => window.removeEventListener("click", handleClickOutside);
    }, [contextMenu]);

    // Adjust context menu position to prevent it from going offscreen
    useLayoutEffect(() => {
        if (contextMenu && menuRef.current) {
            const rect = menuRef.current.getBoundingClientRect();
            const x = Math.max(8, Math.min(contextMenu.x, window.innerWidth - rect.width - 8));
            const y = Math.max(8, Math.min(contextMenu.y, window.innerHeight - rect.height - 8));
            menuRef.current.style.left = `${x}px`;
            menuRef.current.style.top = `${y}px`;
        }
    }, [contextMenu]);

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

    // Global keyboard listener for sidebar actions
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            // Only trigger if sidebar is focused or event target is not an input/editor
            const target = e.target as HTMLElement;
            const isInput = target.closest(".jpad-editor") ||
                target.isContentEditable ||
                ["INPUT", "TEXTAREA"].includes(target.tagName);
            if (isInput) return;

            if (e.key === "Delete" || (e.key === "Backspace" && !isMobile)) {
                if (selectedFiles.size > 0) {
                    setShowBulkDeleteConfirm(true);
                } else if (activeFileId) {
                    const node = findFileNode(files, activeFileId);
                    if (node) setShowDeleteConfirm(node);
                }
            }

            // F2 to start rename
            if (e.key === "F2") {
                const targetId = Array.from(selectedFiles)[0] || activeFileId;
                if (targetId) {
                    const node = findFileNode(files, targetId);
                    if (node) handleRenameStart(node);
                }
            }
        };

        window.addEventListener("keydown", handleKeyDown);
        return () => window.removeEventListener("keydown", handleKeyDown);
    }, [selectedFiles, activeFileId, files, isMobile, setShowBulkDeleteConfirm, setShowDeleteConfirm]);

    // Additional shortcuts for selection
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            const target = e.target as HTMLElement;
            const isInput = target.closest(".jpad-editor") ||
                target.isContentEditable ||
                ["INPUT", "TEXTAREA"].includes(target.tagName);
            if (isInput) return;

            // Ctrl+A to select all visible files
            if ((e.ctrlKey || e.metaKey) && e.key === "a") {
                e.preventDefault();
                const allIds = getAllFileIds(files);
                setSelectedFiles(new Set(allIds));
            }

            // Escape to clear selection
            if (e.key === "Escape") {
                clearSelection();
            }
        };

        window.addEventListener("keydown", handleKeyDown);
        return () => window.removeEventListener("keydown", handleKeyDown);
    }, [files, setSelectedFiles, clearSelection]);

    // Cleanup touch drag timeout on unmount
    useEffect(() => {
        return () => {
            if (touchDragTimeoutRef.current) {
                clearTimeout(touchDragTimeoutRef.current);
            }
        };
    }, []);

    const handleCreateFile = async (parentPath?: string) => {
        const { fileNamePrefix } = useSettingsStore.getState();
        const date = new Date();
        const timestamp = `${date.getHours()}${date.getMinutes()}${date.getSeconds()}`;
        const defaultName = `${fileNamePrefix}-${timestamp}.md`;
        
        let basePath = parentPath;
        if (!basePath) {
            const targetId = lastSelectedId || activeFileId;
            if (targetId) {
                const node = findFileNode(files, targetId);
                if (node) {
                    if (node.type === "folder") {
                        basePath = node.id;
                    } else {
                        // It's a file, get parent folder
                        basePath = node.id.substring(0, node.id.lastIndexOf("/"));
                    }
                }
            }
        }
        
        if (!basePath) {
            basePath = notesRoot;
        }

        await createFile(`${basePath}/${defaultName}`);
        
        // Ensure the folder is expanded so the user sees the new file
        if (basePath !== notesRoot) {
            setExpanded(prev => ({ ...prev, [basePath]: true }));
        }
    };

    const handleCreateFolder = async (parentPath?: string) => {
        let basePath = parentPath;
        if (!basePath) {
            const targetId = lastSelectedId || activeFileId;
            if (targetId) {
                const node = findFileNode(files, targetId);
                if (node) {
                    if (node.type === "folder") {
                        basePath = node.id;
                    } else {
                        // It's a file, get parent folder
                        basePath = node.id.substring(0, node.id.lastIndexOf("/"));
                    }
                }
            }
        }

        setFolderDialogParentPath(basePath || notesRoot);
        setFolderNameInput("");
        setShowFolderDialog(true);
    };

    const handleDragStart = (e: React.DragEvent, id: string) => {
        // If the dragged item is part of the selection, drag the whole selection
        if (selectedFiles.has(id)) {
            const dragData = Array.from(selectedFiles).join("|");
            e.dataTransfer.setData("text/plain", dragData);
            e.dataTransfer.setData("jpad/multi-select", "true");
        } else {
            setDraggedId(id);
            e.dataTransfer.setData("text/plain", id);
        }
        internalDropHandledRef.current = false;
    };

    const handleDragEnd = async (e: React.DragEvent, id: string) => {
        setDraggedId(null);

        // If we handled the drop internally within the app (on a folder), 
        // don't try to open in a new window.
        if (internalDropHandledRef.current) {
            return;
        }

        // Wayland/Linux boundary checks: 
        // When dragging outside, clientX/Y might be 0, or stick exactly to the edges.
        const buffer = 5;
        const isOutside =
            e.clientX <= buffer ||
            e.clientY <= buffer ||
            e.clientX >= window.innerWidth - buffer ||
            e.clientY >= window.innerHeight - buffer;

        // On Linux/Wayland, dropEffect can be unreliable. 
        // We rely on our internal drop tracking and boundary checks.
        if (e.dataTransfer.dropEffect === "none" || isOutside) {
            const pathsToOpen = selectedFiles.has(id)
                ? Array.from(selectedFiles)
                : [id];

            for (const path of pathsToOpen) {
                const node = findFileNode(files, path);
                // Only open files in new window, not folders
                if (node && node.type === "file") {
                    try {
                        await invoke("open_in_new_window", { path });
                    } catch (error) {
                        console.error("Failed to open in new window:", error);
                    }
                }
            }
        }
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
        internalDropHandledRef.current = true;
        const rawData = e.dataTransfer.getData("text/plain");
        const isMulti = e.dataTransfer.getData("jpad/multi-select") === "true";

        setDragOverId(null);
        setDraggedId(null);

        if (!rawData || targetFolder.type !== "folder") {
            return;
        }

        const sourcePaths = isMulti ? rawData.split("|") : [rawData];

        for (const sourcePath of sourcePaths) {
            if (sourcePath === targetFolder.id) continue;

            const fileName = sourcePath.split("/").pop();
            const newPath = `${targetFolder.id}/${fileName}`;

            if (sourcePath === newPath) continue;

            try {
                await movePath(sourcePath, newPath);
            } catch (error) {
                console.error(`Failed to move ${sourcePath}:`, error);
            }
        }

        setExpanded(prev => ({ ...prev, [targetFolder.id]: true }));
    };

    const handleTouchStart = (e: React.TouchEvent, id: string) => {
        const touch = e.touches[0];
        setTouchStartPos({ x: touch.clientX, y: touch.clientY });
        setTouchIndicatorPos({ x: touch.clientX, y: touch.clientY });
        
        // Set a timeout to start dragging after 500ms of holding
        touchDragTimeoutRef.current = setTimeout(() => {
            setTouchDraggedId(id);
        }, 500);
    };

    const handleTouchMove = (e: React.TouchEvent) => {
        const touch = e.touches[0];
        const deltaX = Math.abs(touch.clientX - touchStartPos.x);
        const deltaY = Math.abs(touch.clientY - touchStartPos.y);
        
        // If user moves finger more than 10px before drag starts, cancel drag and allow scroll
        if (!touchDraggedId && (deltaX > 10 || deltaY > 10)) {
            if (touchDragTimeoutRef.current) {
                clearTimeout(touchDragTimeoutRef.current);
                touchDragTimeoutRef.current = null;
            }
            return;
        }
        
        if (!touchDraggedId) return;
        
        setTouchIndicatorPos({ x: touch.clientX, y: touch.clientY });

        // Find drop target under finger
        const element = document.elementFromPoint(touch.clientX, touch.clientY);
        const folderEl = element?.closest('[data-folder-id]');
        const folderId = folderEl?.getAttribute('data-folder-id');

        if (folderId && folderId !== touchDraggedId) {
            setTouchTargetId(folderId);
        } else {
            setTouchTargetId(null);
        }

        // Prevent scrolling while dragging
        if (e.cancelable) e.preventDefault();
    };

    const handleTouchEnd = async () => {
        // Clear the drag timeout if it hasn't fired yet
        if (touchDragTimeoutRef.current) {
            clearTimeout(touchDragTimeoutRef.current);
            touchDragTimeoutRef.current = null;
        }
        
        if (!touchDraggedId) return;

        const sourcePath = touchDraggedId;
        const targetId = touchTargetId;

        setTouchDraggedId(null);
        setTouchTargetId(null);

        if (sourcePath && targetId && sourcePath !== targetId) {
            const fileName = sourcePath.split("/").pop();
            const newPath = `${targetId}/${fileName}`;
            if (sourcePath !== newPath) {
                try {
                    await movePath(sourcePath, newPath);
                    setExpanded(prev => ({ ...prev, [targetId]: true }));
                } catch (error) {
                    console.error("Failed to move file (touch):", error);
                }
            }
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

    const handleRenameStart = (node: FileNode, e?: React.MouseEvent) => {
        e?.stopPropagation();
        setRenamingId(node.id);
        // Show the full filename including extension so the user can change it freely
        setRenamingName(node.name);
        setContextMenu(null);
    };

    const handleRenameSubmit = async () => {
        if (!renamingId || !renamingName.trim()) {
            setRenamingId(null);
            return;
        }

        const node = findFileNode(files, renamingId);
        if (!node) {
            setRenamingId(null);
            return;
        }

        const parentPath = renamingId.substring(0, renamingId.lastIndexOf("/"));
        // Use the name exactly as typed – the user controls the extension
        const newName = renamingName.trim();
        const newPath = `${parentPath}/${newName}`;

        if (renamingId === newPath) {
            setRenamingId(null);
            return;
        }

        try {
            await renamePath(renamingId, newPath);
            setRenamingId(null);
        } catch (error) {
            console.error("Failed to rename:", error);
        }
    };

    const handleDelete = async (node: FileNode) => {
        try {
            await deletePath(node.id);
            setShowDeleteConfirm(null);
            const newSelected = new Set(selectedFiles);
            newSelected.delete(node.id);
            setSelectedFiles(newSelected);
        } catch (error) {
            console.error("Failed to delete:", error);
        }
    };

    const handleBulkDelete = async (viaTerminal = false) => {
        try {
            if (viaTerminal) {
                await invoke("delete_with_terminal", { paths: Array.from(selectedFiles) });
            } else {
                await deletePaths(Array.from(selectedFiles));
            }
            setSelectedFiles(new Set());
            setShowBulkDeleteConfirm(false);
        } catch (error) {
            console.error("Failed to delete multiple:", error);
        }
    };

    const handleReveal = async (node: FileNode, event: React.MouseEvent) => {
        event.stopPropagation();
        try {
            await invoke("reveal_path", { path: node.id });
            setContextMenu(null);
        } catch (error) {
            console.error("Failed to reveal path:", error);
        }
    };

    const handlePopOut = async (node: FileNode, event: React.MouseEvent) => {
        event.stopPropagation();
        try {
            await invoke("open_in_new_window", { path: node.id });
            setContextMenu(null);
        } catch (error) {
            console.error("Failed to open in new window:", error);
        }
    };

    /** One-time, user-initiated upgrade of a legacy .jt note (raw HTML) to a real .md file. */
    const handleConvertToMarkdown = async (node: FileNode) => {
        setContextMenu(null);
        try {
            const html = await invoke<string>("read_file", { path: node.id });
            const { convertLegacyHtmlToMarkdown } = await import("../utils/legacyMarkdownConvert");
            const markdown = convertLegacyHtmlToMarkdown(html);

            // Avoid clobbering an existing .md file with the same base name
            let newPath = node.id.replace(/\.jt$/i, ".md");
            let suffix = 1;
            while (true) {
                try {
                    await invoke("read_file", { path: newPath });
                    newPath = node.id.replace(/\.jt$/i, `-${suffix}.md`);
                    suffix += 1;
                } catch {
                    break;
                }
            }

            await invoke("write_file", { path: newPath, content: markdown });
            await invoke("delete_path", { path: node.id });

            useSettingsStore.getState().renamePathColors(node.id, newPath);
            const { activeFileId: currentActiveId, setActiveFileId: setActive, refreshFiles } = useStore.getState();
            if (currentActiveId === node.id) {
                setActive(newPath);
            }
            await refreshFiles();
        } catch (error) {
            console.error("Failed to convert file to Markdown:", error);
        }
    };

    const handleContextMenu = (e: React.MouseEvent, node: FileNode) => {
        e.preventDefault();
        e.stopPropagation();

        // If node is not in current selection, select it (unless Ctrl/Cmd is held)
        if (!selectedFiles.has(node.id)) {
            setSelectedFiles(new Set([node.id]));
            setLastSelectedId(node.id);
        }

        setContextMenu({
            x: e.clientX,
            y: e.clientY,
            node
        });
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
            setSelectedFiles(new Set([node.id]));
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

    const getFileIcon = (name: string) => {
        return getFileIconForName(name, isMobile ? 18 : 14, "mr-1.5 flex-shrink-0");
    };

    const renderTree = (nodes: FileNode[], depth = 0) => {
        return nodes.map((node) => {
            const isExpanded = expanded[node.id];
            const isActive = activeFileId === node.id;
            const isSelected = selectedFiles.has(node.id);
            const isDragOver = dragOverId === node.id || touchTargetId === node.id;
            const isDragging = draggedId === node.id || touchDraggedId === node.id;
            const customColor = pathColors[node.id];

            return (
                <div key={node.id} className="animate-in fade-in duration-150">
                    <div
                        draggable
                        data-folder-id={node.type === "folder" ? node.id : undefined}
                        onDragStart={(e) => handleDragStart(e, node.id)}
                        onDragEnd={(e) => handleDragEnd(e, node.id)}
                        onDragOver={(e) => handleDragOver(e, node)}
                        onDragLeave={handleDragLeave}
                        onDrop={(e) => handleDrop(e, node)}
                        onTouchStart={(e) => handleTouchStart(e, node.id)}
                        onTouchMove={handleTouchMove}
                        onTouchEnd={handleTouchEnd}
                        className={cn(
                            "flex items-center py-[6px] px-2 cursor-pointer rounded-md mx-1 group transition-all duration-150 relative",
                            "hover:bg-surface-hover/60",
                            isActive && "bg-surface text-primary ring-1 ring-primary/20",
                            isSelected && !isActive && "bg-primary/20 ring-1 ring-primary/40",
                            isDragOver && "bg-primary/40 ring-2 ring-primary shadow-xl scale-[1.05] z-50",
                            isDragging && "opacity-50",
                            isMobile ? "min-h-[52px]" : "cursor-grab active:cursor-grabbing"
                        )}
                        style={{
                            paddingLeft: `${depth * 16 + 8}px`,
                            color: customColor || undefined,
                            ...(customColor ? { "--color-primary": customColor } : {})
                        } as React.CSSProperties}
                        onClick={(e) => handleFileClick(node, e)}
                        onContextMenu={(e) => handleContextMenu(e, node)}
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
                            {renamingId === node.id ? (
                                <input
                                    ref={renameInputRef}
                                    type="text"
                                    value={renamingName}
                                    onChange={(e) => setRenamingName(e.target.value)}
                                    onKeyDown={(e) => {
                                        if (e.key === "Enter") handleRenameSubmit();
                                        if (e.key === "Escape") setRenamingId(null);
                                    }}
                                    onClick={(e) => e.stopPropagation()}
                                    onBlur={handleRenameSubmit}
                                    className="bg-surface border border-primary/40 rounded px-1 py-0.5 text-[13px] w-full focus:outline-none focus:ring-1 focus:ring-primary/40"
                                />
                            ) : (
                                <span className={cn(
                                    isMobile ? "text-[16px]" : "text-[13px] truncate",
                                    isActive ? "font-semibold" : "font-normal"
                                )}>
                                    {node.name}
                                </span>
                            )}
                        </div>

                        {!isMobile && !renamingId && (
                            <button
                                onClick={(e) => {
                                    e.stopPropagation();
                                    setContextMenu({ x: e.clientX, y: e.clientY, node });
                                }}
                                className="opacity-0 group-hover:opacity-100 p-1 hover:bg-surface-hover rounded-md transition-all text-text-muted hover:text-primary z-10"
                            >
                                <MoreVertical size={14} />
                            </button>
                        )}
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
            const node: FileNode = { id: result.path, name: result.name, type: "file" };
            const customColor = pathColors[result.path];

            return (
                <div
                    key={result.path}
                    className={cn(
                        "flex flex-col py-3 px-3 mx-1 cursor-pointer rounded-md group transition-all duration-150",
                        "hover:bg-surface-hover/60",
                        isActive && "bg-surface text-primary ring-1 ring-primary/20",
                        isMobile && "mb-2 min-h-[60px] justify-center"
                    )}
                    style={{
                        color: customColor || undefined,
                        ...(customColor ? { "--color-primary": customColor } : {})
                    } as React.CSSProperties}
                    onClick={() => {
                        setActiveFileId(result.path);
                        setSelectedFiles(new Set([result.path]));
                        setLastSelectedId(result.path);
                        setSearchQuery("");
                        clearSearch();
                        if (isMobile) toggleSidebar();
                    }}
                    onContextMenu={(e) => handleContextMenu(e, node)}
                >
                    <div className="flex items-center gap-2">
                        {getFileIcon(result.name)}
                        {renamingId === result.path ? (
                            <input
                                ref={renameInputRef}
                                type="text"
                                value={renamingName}
                                onChange={(e) => setRenamingName(e.target.value)}
                                onKeyDown={(e) => {
                                    if (e.key === "Enter") handleRenameSubmit();
                                    if (e.key === "Escape") setRenamingId(null);
                                }}
                                onClick={(e) => e.stopPropagation()}
                                onBlur={handleRenameSubmit}
                                className="bg-surface border border-primary/40 rounded px-1 py-0.5 text-[13px] w-full focus:outline-none focus:ring-1 focus:ring-primary/40"
                            />
                        ) : (
                            <span className={cn(
                                isMobile ? "text-[16px]" : "text-[13px] truncate flex-1",
                                isActive ? "font-semibold" : "font-normal"
                            )}>
                                {result.name}
                            </span>
                        )}
                        {!isMobile && !renamingId && (
                            <button
                                onClick={(e) => {
                                    e.stopPropagation();
                                    setContextMenu({ x: e.clientX, y: e.clientY, node });
                                }}
                                className="opacity-0 group-hover:opacity-100 p-1 hover:bg-surface-hover rounded-md transition-all text-text-muted hover:text-primary z-10"
                            >
                                <MoreVertical size={14} />
                            </button>
                        )}
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
                    {selectedFiles.size > 0 && (
                        <button
                            onClick={() => setShowBulkDeleteConfirm(true)}
                            className="p-2 hover:bg-red-500/20 text-red-400 rounded-xl transition-all border border-red-500/30"
                            title={`Delete ${selectedFiles.size} items`}
                        >
                            <Trash2 size={isMobile ? 22 : 14} />
                        </button>
                    )}
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
            <div
                className="flex-1 overflow-y-auto py-2"
                onClick={(e) => {
                    // Clear selection if clicking on the background of the file tree
                    if (e.target === e.currentTarget) {
                        clearSelection();
                    }
                }}
            >
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
                    v{appVersion}
                </div>
            </div>

            {/* Drag Ghost for Touch */}
            {touchDraggedId && (
                <div
                    className="fixed pointer-events-none z-[300] bg-primary/90 text-white px-3 py-2 rounded-xl text-sm font-bold shadow-2xl flex items-center gap-2"
                    style={{
                        left: touchIndicatorPos.x + 20,
                        top: touchIndicatorPos.y - 40,
                        transform: "translate(-50%, -50%)",
                    }}
                >
                    <FilePlus size={16} />
                    Moving...
                </div>
            )}

            {/* Folder Creation Dialog Overlay */}
            {showFolderDialog && (
                <div className="fixed inset-0 z-[200] flex items-center justify-center p-6 animate-in fade-in zoom-in duration-200">
                    <div className="absolute inset-0 bg-black/80 backdrop-blur-sm" onClick={() => setShowFolderDialog(false)} />
                    <div className="relative w-full max-md bg-sidebar/95 border-2 border-primary/30 rounded-2xl p-6 shadow-2xl backdrop-blur-md">
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

            {/* Custom Context Menu */}
            {contextMenu && (
                <div
                    ref={menuRef}
                    className="fixed z-[300] bg-surface border-2 border-border rounded-xl shadow-2xl py-1.5 w-48 animate-in backdrop-blur-md bg-surface/95"
                    style={{ left: `${contextMenu.x}px`, top: `${contextMenu.y}px` }}
                    onClick={(e) => e.stopPropagation()}
                >
                    <button
                        onClick={(e) => {
                            e.stopPropagation();
                            handleCreateFile(contextMenu.node.type === 'folder' ? contextMenu.node.id : undefined);
                            setContextMenu(null);
                        }}
                        className="w-full flex items-center gap-3 px-3 py-2 hover:bg-surface-hover text-sm transition-colors text-text"
                    >
                        <FilePlus size={14} className="text-primary" />
                        New File
                    </button>
                    <button
                        onClick={(e) => {
                            e.stopPropagation();
                            handleCreateFolder(contextMenu.node.type === 'folder' ? contextMenu.node.id : undefined);
                            setContextMenu(null);
                        }}
                        className="w-full flex items-center gap-3 px-3 py-2 hover:bg-surface-hover text-sm transition-colors text-text"
                    >
                        <FolderPlus size={14} className="text-primary" />
                        New Folder
                    </button>
                    <div className="h-[1px] bg-border my-1.5 mx-2" />
                    <button
                        onClick={(e) => { e.stopPropagation(); handleRenameStart(contextMenu.node); }}
                        className="w-full flex items-center gap-3 px-3 py-2 hover:bg-surface-hover text-sm transition-colors text-text"
                    >
                        <Pencil size={14} className="text-primary" />
                        Rename
                    </button>
                    <button
                        onClick={(e) => handleReveal(contextMenu.node, e)}
                        className="w-full flex items-center gap-3 px-3 py-2 hover:bg-surface-hover text-sm transition-colors text-text"
                    >
                        <ExternalLink size={14} className="text-primary" />
                        Reveal in Explorer
                    </button>
                    {!isMobile && contextMenu.node.type === "file" && (
                        <button
                            onClick={(e) => handlePopOut(contextMenu.node, e)}
                            className="w-full flex items-center gap-3 px-3 py-2 hover:bg-surface-hover text-sm transition-colors text-text"
                        >
                            <Maximize2 size={14} className="text-primary" />
                            Pop in separate window
                        </button>
                    )}
                    {contextMenu.node.type === "file" && /\.jt$/i.test(contextMenu.node.id) && (
                        <button
                            onClick={(e) => { e.stopPropagation(); handleConvertToMarkdown(contextMenu.node); }}
                            className="w-full flex items-center gap-3 px-3 py-2 hover:bg-surface-hover text-sm transition-colors text-text"
                        >
                            <RefreshCw size={14} className="text-primary" />
                            Convert to Markdown
                        </button>
                    )}
                    <div className="h-[1px] bg-border my-1.5 mx-2" />
                    <div className="px-3 py-1 text-[10px] font-semibold text-text-muted uppercase tracking-wider">
                        Color
                    </div>
                    <div className="flex items-center gap-1.5 px-3 py-1.5 flex-wrap">
                        {PATH_COLORS.map((c) => {
                            const isCurrent = (pathColors[contextMenu.node.id] || "") === c.value;
                            return (
                                <button
                                    key={c.name}
                                    title={c.name}
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        setPathColor(contextMenu.node.id, c.value || null);
                                        setContextMenu(null);
                                    }}
                                    className={cn(
                                        "w-5 h-5 rounded-full border border-border cursor-pointer transition-transform hover:scale-125 active:scale-95 flex items-center justify-center",
                                        isCurrent && "ring-1 ring-primary"
                                    )}
                                    style={{
                                        backgroundColor: c.value || "transparent",
                                        ...(c.value === "" ? {
                                            background: "linear-gradient(135deg, transparent 40%, #e06060 40%, #e06060 60%, transparent 60%)",
                                            border: "1px dashed var(--color-border)",
                                        } : {}),
                                    }}
                                >
                                    {isCurrent && (
                                        <div className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: c.value === '#f0e4d0' ? '#000' : 'var(--color-text)' }} />
                                    )}
                                </button>
                            );
                        })}
                    </div>
                    <div className="h-[1px] bg-border my-1.5 mx-2" />
                    <button
                        onClick={(e) => {
                            e.stopPropagation();
                            if (selectedFiles.has(contextMenu.node.id) && selectedFiles.size > 1) {
                                setShowBulkDeleteConfirm(true);
                            } else {
                                setShowDeleteConfirm(contextMenu.node);
                            }
                            setContextMenu(null);
                        }}
                        className="w-full flex items-center gap-3 px-3 py-2 hover:bg-red-500/20 text-red-400 hover:text-red-300 text-sm transition-colors"
                    >
                        <Trash2 size={14} />
                        {selectedFiles.has(contextMenu.node.id) && selectedFiles.size > 1
                            ? `Delete Selected (${selectedFiles.size})`
                            : 'Delete'}
                    </button>
                </div>
            )}

            {/* Delete Confirmation Dialog */}
            {showDeleteConfirm && (
                <div className="fixed inset-0 z-[400] flex items-center justify-center p-6 animate-in fade-in zoom-in duration-200">
                    <div className="absolute inset-0 bg-black/80 backdrop-blur-sm" onClick={() => setShowDeleteConfirm(null)} />
                    <div className="relative w-full max-w-sm bg-sidebar/95 border-2 border-primary/30 rounded-2xl p-6 shadow-2xl backdrop-blur-md">
                        <h2 className="text-lg font-bold mb-2 flex items-center gap-2 text-red-400">
                            <Trash2 size={20} />
                            Delete {showDeleteConfirm.type === 'folder' ? 'Folder' : 'File'}?
                        </h2>
                        <p className="text-sm text-text-muted mb-6 leading-relaxed">
                            Are you sure you want to delete <span className="font-bold text-text">"{showDeleteConfirm.name}"</span>?
                            {showDeleteConfirm.type === 'folder' && " This will permanently delete all files inside."}
                            This action cannot be undone.
                        </p>
                        <div className="flex gap-3">
                            <button
                                onClick={() => setShowDeleteConfirm(null)}
                                className="flex-1 px-4 py-3 rounded-xl border-2 border-border font-semibold hover:bg-surface-hover transition-all text-text"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={() => handleDelete(showDeleteConfirm)}
                                className="flex-1 px-4 py-3 rounded-xl bg-red-500 text-white font-bold hover:bg-red-600 transition-all shadow-lg shadow-red-500/20"
                            >
                                Delete
                            </button>
                            {!isMobile && (
                                <button
                                    onClick={async () => {
                                        try {
                                            await invoke("delete_with_terminal", { paths: [showDeleteConfirm.id] });
                                            setShowDeleteConfirm(null);
                                        } catch (e) {
                                            console.error(e);
                                        }
                                    }}
                                    className="px-4 py-3 rounded-xl bg-orange-600 text-white font-bold hover:bg-orange-700 transition-all shadow-lg shadow-orange-500/20"
                                    title="Delete using terminal (rm -rf)"
                                >
                                    RM
                                </button>
                            )}
                        </div>
                    </div>
                </div>
            )}

            {/* Bulk Delete Confirmation Dialog */}
            {showBulkDeleteConfirm && (
                <div className="fixed inset-0 z-[400] flex items-center justify-center p-6 animate-in fade-in zoom-in duration-200">
                    <div className="absolute inset-0 bg-black/80 backdrop-blur-sm" onClick={() => setShowBulkDeleteConfirm(false)} />
                    <div className="relative w-full max-w-sm bg-sidebar/95 border-2 border-primary/30 rounded-2xl p-6 shadow-2xl backdrop-blur-md">
                        <h2 className="text-lg font-bold mb-2 flex items-center gap-2 text-red-400">
                            <Trash2 size={20} />
                            Delete {selectedFiles.size} items?
                        </h2>
                        <p className="text-sm text-text-muted mb-6 leading-relaxed">
                            Are you sure you want to delete <span className="font-bold text-text">{selectedFiles.size}</span> items?
                            This will permanently delete all selected files and folders.
                            This action cannot be undone.
                        </p>
                        <div className="flex gap-3">
                            <button
                                onClick={() => setShowBulkDeleteConfirm(false)}
                                className="flex-1 px-4 py-3 rounded-xl border-2 border-border font-semibold hover:bg-surface-hover transition-all text-text"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={() => handleBulkDelete(false)}
                                className="flex-1 px-4 py-3 rounded-xl bg-red-500 text-white font-bold hover:bg-red-600 transition-all shadow-lg shadow-red-500/20"
                            >
                                Delete All
                            </button>
                            {!isMobile && (
                                <button
                                    onClick={() => handleBulkDelete(true)}
                                    className="px-4 py-3 rounded-xl bg-orange-600 text-white font-bold hover:bg-orange-700 transition-all shadow-lg shadow-orange-500/20"
                                    title="Delete using terminal (rm -rf)"
                                >
                                    Terminal RM
                                </button>
                            )}
                        </div>
                    </div>
                </div>
            )}
        </aside>
    );
}
