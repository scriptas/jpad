import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Image from "@tiptap/extension-image";
import Youtube from "@tiptap/extension-youtube";
import Underline from "@tiptap/extension-underline";
import Placeholder from "@tiptap/extension-placeholder";
import Color from "@tiptap/extension-color";
import { TextStyle } from "@tiptap/extension-text-style";
import Highlight from "@tiptap/extension-highlight";
import { DOMSerializer, DOMParser } from "@tiptap/pm/model";
import { useStore, findFileNode } from "../store/useStore";
import { useSettingsStore } from "../store/useSettingsStore";
import { useEffect, useRef, useState } from "react";
import { invoke } from "@tauri-apps/api/core";
import { getCurrentWebview } from "@tauri-apps/api/webview";
import {
    Bold,
    Italic,
    Underline as UnderlineIcon,
    List,
    ListOrdered,
    Quote,
    Code,
    ImageIcon,
    YoutubeIcon,
    Heading1,
    Heading2,
    Heading3,
    Minus,
    Undo2,
    Redo2,
    Type,
    Palette,
    Highlighter,
    ChevronDown,
} from "lucide-react";
import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

function cn(...inputs: ClassValue[]) {
    return twMerge(clsx(inputs));
}

/** Color palette for text coloring */
const TEXT_COLORS = [
    { name: "Default", value: "" },
    { name: "Cream", value: "#f0e4d0" },
    { name: "White", value: "#ffffff" },
    { name: "Terracotta", value: "#e8845a" },
    { name: "Coral", value: "#e06060" },
    { name: "Rose", value: "#d46a8a" },
    { name: "Amber", value: "#d4a06a" },
    { name: "Gold", value: "#c8b040" },
    { name: "Sand", value: "#c8b878" },
    { name: "Lime", value: "#a0c878" },
    { name: "Mint", value: "#68c8a0" },
    { name: "Teal", value: "#58b8b8" },
    { name: "Sky", value: "#6ab4d4" },
    { name: "Blue", value: "#5a8ae0" },
    { name: "Violet", value: "#9878c8" },
    { name: "Purple", value: "#b068c8" },
    { name: "Muted", value: "#8a7d6b" },
    { name: "Dark", value: "#4a4038" },
];

const HIGHLIGHT_COLORS = [
    { name: "None", value: "" },
    { name: "Amber", value: "rgba(212, 160, 106, 0.3)" },
    { name: "Rose", value: "rgba(224, 96, 96, 0.25)" },
    { name: "Lime", value: "rgba(160, 200, 120, 0.25)" },
    { name: "Sky", value: "rgba(106, 180, 212, 0.25)" },
    { name: "Violet", value: "rgba(152, 120, 200, 0.25)" },
    { name: "Gold", value: "rgba(200, 176, 64, 0.3)" },
];

/** ToolbarButton component for consistent styling */
function ToolbarButton({
    onClick,
    isActive = false,
    title,
    children,
    className: extraClass,
}: {
    onClick: (e: React.MouseEvent) => void;
    isActive?: boolean;
    title: string;
    children: React.ReactNode;
    className?: string;
}) {
    return (
        <button
            onMouseDown={(e) => {
                e.preventDefault();
                onClick(e);
            }}
            title={title}
            className={cn(
                "p-1.5 rounded-md transition-all duration-150",
                "hover:bg-surface-hover active:scale-95",
                isActive && "text-primary bg-surface ring-1 ring-primary/20",
                extraClass
            )}
        >
            {children}
        </button>
    );
}

/** Dropdown color picker */
function ColorPicker({
    colors,
    currentColor,
    onSelect,
    onClose,
    label,
}: {
    colors: { name: string; value: string }[];
    currentColor: string;
    onSelect: (color: string) => void;
    onClose: () => void;
    label: string;
}) {
    const ref = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const handle = (e: MouseEvent) => {
            if (ref.current && !ref.current.contains(e.target as Node)) {
                onClose();
            }
        };
        document.addEventListener("mousedown", handle);
        return () => document.removeEventListener("mousedown", handle);
    }, [onClose]);

    return (
        <div
            ref={ref}
            className="absolute top-full left-0 mt-1 z-50 bg-surface border border-border rounded-lg shadow-xl shadow-black/40 animate-in"
        >
            <div className="px-3 py-1.5 text-[10px] font-semibold text-text-muted uppercase tracking-wider border-b border-border">
                {label}
            </div>
            <div className="color-picker-grid">
                {colors.map((c) => (
                    <button
                        key={c.name}
                        title={c.name}
                        className={cn(
                            "color-swatch",
                            currentColor === c.value && "active"
                        )}
                        style={{
                            backgroundColor: c.value || "#f0e4d0",
                            ...(c.value === "" ? {
                                background: "linear-gradient(135deg, #f0e4d0 40%, transparent 40%, transparent 60%, #f0e4d0 60%)",
                                border: "2px dashed #8a7d6b"
                            } : {}),
                        }}
                        onClick={() => {
                            onSelect(c.value);
                            onClose();
                        }}
                    />
                ))}
            </div>
        </div>
    );
}

/** Read a File as a base64 data URI */
function readFileAsDataURL(file: File): Promise<string> {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result as string);
        reader.onerror = reject;
        reader.readAsDataURL(file);
    });
}

export default function Editor() {
    const { activeFileId, files, saveActiveFile, loadFileContent, isSaving, setEditorContent, setSelectedContent } = useStore();
    const saveTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const isLoadingRef = useRef(false);
    const saveRef = useRef(saveActiveFile);
    saveRef.current = saveActiveFile;
    const fileInputRef = useRef<HTMLInputElement>(null);

    const [showTextColor, setShowTextColor] = useState(false);
    const [showHighlight, setShowHighlight] = useState(false);

    const activeFile = activeFileId ? findFileNode(files, activeFileId) : null;

    const editor = useEditor(
        {
            extensions: [
                StarterKit.configure({
                    heading: { levels: [1, 2, 3] },
                }),
                Underline,
                TextStyle,
                Color,
                Highlight.configure({
                    multicolor: true,
                }),
                Image.configure({
                    inline: false,
                    allowBase64: true,
                    HTMLAttributes: {
                        class: "jpad-image",
                        style: "max-width: 100%; min-width: min(300px, 100%); height: auto;",
                    },
                }),
                Youtube.configure({
                    HTMLAttributes: {
                        class: "mx-auto rounded-lg shadow-lg border border-border max-w-full my-4",
                    },
                }),
                Placeholder.configure({
                    placeholder: "Start writing your thoughts...",
                    emptyEditorClass: "is-editor-empty",
                }),
            ],
            content: "",
            editorProps: {
                attributes: {
                    class: "jpad-editor focus:outline-none min-h-[500px] pt-6",
                },
                handleDrop: (view, event, _slice, moved) => {
                    if (moved || !event.dataTransfer?.files?.length) return false;

                    const images = Array.from(event.dataTransfer.files).filter((f) =>
                        f.type.startsWith("image/")
                    );
                    if (!images.length) return false;

                    event.preventDefault();

                    const coordinates = view.posAtCoords({
                        left: event.clientX,
                        top: event.clientY,
                    });

                    images.forEach(async (image) => {
                        const dataUrl = await readFileAsDataURL(image);
                        const node = view.state.schema.nodes.image.create({
                            src: dataUrl,
                        });
                        const tr = view.state.tr.insert(
                            coordinates?.pos ?? view.state.selection.anchor,
                            node
                        );
                        view.dispatch(tr);
                    });

                    return true;
                },
                handlePaste: (view, event) => {
                    const items = event.clipboardData?.items;
                    if (!items) return false;

                    const imageItems = Array.from(items).filter((item) =>
                        item.type.startsWith("image/")
                    );
                    if (imageItems.length) {
                        event.preventDefault();
                        imageItems.forEach(async (item) => {
                            const file = item.getAsFile();
                            if (!file) return;
                            const dataUrl = await readFileAsDataURL(file);
                            const node = view.state.schema.nodes.image.create({
                                src: dataUrl,
                            });
                            const tr = view.state.tr.replaceSelectionWith(node);
                            view.dispatch(tr);
                        });
                        return true;
                    }

                    const text = event.clipboardData?.getData("text/plain");
                    const html = event.clipboardData?.getData("text/html");
                    if (!text) return false;

                    const { state } = view;
                    const { $from } = state.selection;
                    let insideList = false;
                    for (let i = $from.depth; i > 0; i--) {
                        if (["listItem", "orderedList", "bulletList"].includes($from.node(i).type.name)) {
                            insideList = true;
                            break;
                        }
                    }

                    if (insideList) {
                        // Prevent multi-line text from splitting existing list item into multiple numbered items
                        event.preventDefault();
                        const htmlContent = text
                            .split(/\r?\n/)
                            .map(line => line.replace(/</g, "&lt;").replace(/>/g, "&gt;"))
                            .join("<br>");

                        const dom = document.createElement("div");
                        dom.innerHTML = htmlContent;
                        const slice = DOMParser.fromSchema(state.schema).parseSlice(dom);
                        const tr = state.tr.replaceSelection(slice);
                        view.dispatch(tr);
                        return true;
                    }

                    // Only intercept if there's NO HTML (i.e. pure plain text paste from Notepad/Terminal)
                    if (!html) {
                        event.preventDefault();

                        // Parse single newlines as <br>, double newlines as separate <p>
                        const htmlContent = text
                            .split(/(?:\r?\n){2,}/) // split into blocks by double newlines
                            .map(block => {
                                const blockContent = block.split(/\r?\n/)
                                    .map(line => line.replace(/</g, "&lt;").replace(/>/g, "&gt;"))
                                    .join("<br>");
                                return `<p>${blockContent}</p>`;
                            })
                            .join("");

                        const dom = document.createElement("div");
                        dom.innerHTML = htmlContent;
                        const slice = DOMParser.fromSchema(state.schema).parseSlice(dom);
                        const tr = state.tr.replaceSelection(slice);
                        view.dispatch(tr);
                        return true;
                    }

                    return false;
                },

            },
            onUpdate: ({ editor }) => {
                if (isLoadingRef.current) return;
                const content = editor.getHTML();
                setEditorContent(content); // Update store immediately for stats
                if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
                saveTimeoutRef.current = setTimeout(() => {
                    saveRef.current(content);
                }, 600);
            },
            onSelectionUpdate: ({ editor }) => {
                // Update selected content when selection changes
                if (!isLoadingRef.current) {
                    const { from, to, empty } = editor.state.selection;
                    if (empty) {
                        setSelectedContent("");
                    } else {
                        // Get HTML of selected content
                        const slice = editor.state.doc.slice(from, to);
                        const serializer = DOMSerializer.fromSchema(editor.state.schema);
                        const fragment = serializer.serializeFragment(slice.content);
                        const div = document.createElement("div");
                        div.appendChild(fragment);
                        setSelectedContent(div.innerHTML);
                    }
                }
            },
        },
        []
    );

    // Load file content when active file changes
    useEffect(() => {
        if (editor && activeFileId) {
            isLoadingRef.current = true;
            loadFileContent(activeFileId).then((content) => {
                editor.commands.setContent(content || "");
                editor.commands.focus(); // Auto-focus for "instastart"
                
                // Position cursor at end of document
                setTimeout(() => {
                    const { state } = editor;
                    const endPos = state.doc.content.size;
                    editor.commands.setTextSelection(endPos);
                }, 50);
                
                isLoadingRef.current = false;
            });
        }
        return () => {
            if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
        };
    }, [activeFileId, editor]);

    // Handle the custom jpad-undo event from App.tsx (navigation buttons)
    useEffect(() => {
        const handleUndo = () => {
            if (editor && editor.isFocused) {
                editor.chain().focus().undo().run();
            }
        };
        window.addEventListener("jpad-undo", handleUndo);
        return () => window.removeEventListener("jpad-undo", handleUndo);
    }, [editor]);

    // Handle copy to include images in clipboard
    useEffect(() => {
        if (!editor || editor.isDestroyed) return;

        // IMPORTANT: This handler must be SYNCHRONOUS.
        // e.clipboardData is only available during the synchronous phase of the copy event.
        // Using the async navigator.clipboard.write() API was causing Google Docs crashes
        // because it writes data in a different format than what most apps expect.
        const handleCopy = (e: ClipboardEvent) => {
            if (!editor || editor.isDestroyed || !editor.view) return;
            const view = editor.view;
            const { from, to, empty } = view.state.selection;
            if (empty) return;

            e.preventDefault();

            // 1. Plain text (clean, no placeholders)
            const text = view.state.doc.textBetween(from, to, "\n", "\n");

            // 2. Full HTML with base64 images preserved
            // This is what rich text apps (JPad, Word, etc.) will read.
            // Google Docs will also read this - it handles the HTML natively.
            const slice = view.state.doc.slice(from, to);
            const domSerializer = DOMSerializer.fromSchema(view.state.schema);
            const domFragment = domSerializer.serializeFragment(slice.content);
            const tempDiv = document.createElement("div");
            tempDiv.appendChild(domFragment);
            const html = tempDiv.innerHTML;

            // Use the standard synchronous clipboard API (what ALL apps expect)
            e.clipboardData!.setData("text/plain", text);
            e.clipboardData!.setData("text/html", html);
        };

        // Delay attaching to ensure view is mounted
        const timeout = setTimeout(() => {
            if (!editor || editor.isDestroyed || !editor.view) return;
            const dom = editor.view.dom;
            dom.addEventListener("copy", handleCopy as any);
        }, 100);

        return () => {
            clearTimeout(timeout);
            if (!editor || editor.isDestroyed || !editor.view) return;
            const dom = editor.view.dom;
            dom.removeEventListener("copy", handleCopy as any);
        };
    }, [editor]);

    // Handle external file drops from the OS via Tauri's drag-drop API
    useEffect(() => {
        if (!editor) return;

        let unlisten: (() => void) | undefined;

        const IMAGE_EXTENSIONS = ["png", "jpg", "jpeg", "gif", "webp", "svg", "bmp", "ico", "avif"];

        (async () => {
            try {
                unlisten = await getCurrentWebview().onDragDropEvent(async (event) => {
                    if (event.payload.type === "drop") {
                        const paths = event.payload.paths;
                        for (const filePath of paths) {
                            const ext = filePath.split(".").pop()?.toLowerCase() || "";
                            if (!IMAGE_EXTENSIONS.includes(ext)) continue;
                            try {
                                const dataUrl = await invoke<string>("read_file_base64", { path: filePath });
                                editor.chain().focus().setImage({ src: dataUrl }).run();
                            } catch (err) {
                                console.error("Failed to read dropped image:", err);
                            }
                        }
                    }
                });
            } catch (err) {
                console.error("Failed to setup drag-drop listener:", err);
            }
        })();

        return () => {
            unlisten?.();
        };
    }, [editor]);

    if (!activeFile) {
        return (
            <div className="h-full w-full flex flex-col items-center justify-center bg-background select-none animate-in fade-in duration-500">
                <div className="relative mb-8 group">
                    <div className="absolute inset-0 blur-3xl bg-primary/20 rounded-full scale-150 group-hover:bg-primary/30 transition-all duration-700" />
                    <div className="relative bg-surface/40 p-10 rounded-[2.5rem] border border-border group-hover:border-primary/30 transition-all duration-500 shadow-2xl shadow-black/50">
                        <Type size={80} className="text-primary opacity-60 group-hover:opacity-100 transition-all duration-500 transform group-hover:scale-110" strokeWidth={1} />
                    </div>
                </div>

                <div className="text-center space-y-2 relative z-10">
                    <h2 className="text-2xl font-bold text-text tracking-tight">No File Open</h2>
                    <p className="text-text-muted/60 max-w-[280px] leading-relaxed">
                        Select a thought from the explorer or{" "}
                        <button
                            onClick={() => {
                                const { notesRoot, createFile } = useStore.getState();
                                const { fileNamePrefix } = useSettingsStore.getState();
                                const date = new Date();
                                const timestamp = `${date.getHours()}${date.getMinutes()}${date.getSeconds()}`;
                                const defaultName = `${fileNamePrefix}-${timestamp}.jt`;
                                createFile(`${notesRoot}/${defaultName}`);
                            }}
                            className="text-primary font-medium hover:underline focus:outline-none"
                        >
                            create a new note
                        </button>{" "}
                        to begin writing.
                    </p>
                </div>
                <div className="absolute top-[20%] left-[15%] w-1 h-1 bg-primary/20 rounded-full" />
                <div className="absolute bottom-[30%] right-[20%] w-1.5 h-1.5 bg-primary/10 rounded-full" />
                <div className="absolute top-[60%] right-[10%] w-1 h-1 bg-primary/30 rounded-full" />
            </div>
        );
    }

    const addImage = () => {
        fileInputRef.current?.click();
    };

    const handleImageFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const files = e.target.files;
        if (!files?.length || !editor) return;
        for (const file of Array.from(files)) {
            if (!file.type.startsWith("image/")) continue;
            const dataUrl = await readFileAsDataURL(file);
            editor.chain().focus().setImage({ src: dataUrl }).run();
        }
        e.target.value = "";
    };

    const addYoutube = () => {
        const url = window.prompt("Enter YouTube URL");
        if (url) editor?.chain().focus().setYoutubeVideo({ src: url }).run();
    };

    const currentTextColor = editor?.getAttributes("textStyle")?.color || "";
    const currentHighlight = editor?.getAttributes("highlight")?.color || "";

    return (
        <div className="flex-1 flex flex-col h-full overflow-hidden bg-background">
            <div className="flex items-center gap-0.5 px-2 py-1.5 border-b border-border bg-surface/30 backdrop-blur-sm sticky top-0 z-10 flex-wrap">
                <ToolbarButton
                    onClick={() => editor?.chain().focus().undo().run()}
                    title="Undo (Ctrl+Z)"
                >
                    <Undo2 size={15} />
                </ToolbarButton>
                <ToolbarButton
                    onClick={() => editor?.chain().focus().redo().run()}
                    title="Redo (Ctrl+Y)"
                >
                    <Redo2 size={15} />
                </ToolbarButton>

                <div className="w-[1px] h-4 bg-border mx-1" />

                <ToolbarButton
                    onClick={() => editor?.chain().focus().toggleHeading({ level: 1 }).run()}
                    isActive={editor?.isActive("heading", { level: 1 }) ?? false}
                    title="Heading 1"
                >
                    <Heading1 size={15} />
                </ToolbarButton>
                <ToolbarButton
                    onClick={() => editor?.chain().focus().toggleHeading({ level: 2 }).run()}
                    isActive={editor?.isActive("heading", { level: 2 }) ?? false}
                    title="Heading 2"
                >
                    <Heading2 size={15} />
                </ToolbarButton>
                <ToolbarButton
                    onClick={() => editor?.chain().focus().toggleHeading({ level: 3 }).run()}
                    isActive={editor?.isActive("heading", { level: 3 }) ?? false}
                    title="Heading 3"
                >
                    <Heading3 size={15} />
                </ToolbarButton>

                <div className="w-[1px] h-4 bg-border mx-1" />

                <ToolbarButton
                    onClick={() => editor?.chain().focus().toggleBold().run()}
                    isActive={editor?.isActive("bold") ?? false}
                    title="Bold (Ctrl+B)"
                >
                    <Bold size={15} />
                </ToolbarButton>
                <ToolbarButton
                    onClick={() => editor?.chain().focus().toggleItalic().run()}
                    isActive={editor?.isActive("italic") ?? false}
                    title="Italic (Ctrl+I)"
                >
                    <Italic size={15} />
                </ToolbarButton>
                <ToolbarButton
                    onClick={() => editor?.chain().focus().toggleUnderline().run()}
                    isActive={editor?.isActive("underline") ?? false}
                    title="Underline (Ctrl+U)"
                >
                    <UnderlineIcon size={15} />
                </ToolbarButton>

                <div className="w-[1px] h-4 bg-border mx-1" />

                <div className="relative">
                    <button
                        onClick={() => { setShowTextColor(!showTextColor); setShowHighlight(false); }}
                        title="Text Color"
                        className={cn(
                            "flex items-center gap-0.5 px-1.5 py-1.5 rounded-md transition-all duration-150",
                            "hover:bg-surface-hover active:scale-95",
                            showTextColor && "bg-surface ring-1 ring-primary/20"
                        )}
                    >
                        <Palette size={15} />
                        <div
                            className="w-3 h-1.5 rounded-sm mt-0.5"
                            style={{ backgroundColor: currentTextColor || "#f0e4d0" }}
                        />
                        <ChevronDown size={10} className="opacity-50" />
                    </button>
                    {showTextColor && (
                        <ColorPicker
                            colors={TEXT_COLORS}
                            currentColor={currentTextColor}
                            onSelect={(color) => {
                                if (color) {
                                    editor?.chain().focus().setColor(color).run();
                                } else {
                                    editor?.chain().focus().unsetColor().run();
                                }
                            }}
                            onClose={() => setShowTextColor(false)}
                            label="Text Color"
                        />
                    )}
                </div>

                <div className="relative">
                    <button
                        onClick={() => { setShowHighlight(!showHighlight); setShowTextColor(false); }}
                        title="Highlight"
                        className={cn(
                            "flex items-center gap-0.5 px-1.5 py-1.5 rounded-md transition-all duration-150",
                            "hover:bg-surface-hover active:scale-95",
                            showHighlight && "bg-surface ring-1 ring-primary/20"
                        )}
                    >
                        <Highlighter size={15} />
                        <div
                            className="w-3 h-1.5 rounded-sm mt-0.5"
                            style={{ backgroundColor: currentHighlight || "transparent", border: currentHighlight ? "none" : "1px dashed #8a7d6b" }}
                        />
                        <ChevronDown size={10} className="opacity-50" />
                    </button>
                    {showHighlight && (
                        <ColorPicker
                            colors={HIGHLIGHT_COLORS}
                            currentColor={currentHighlight}
                            onSelect={(color) => {
                                if (color) {
                                    editor?.chain().focus().toggleHighlight({ color }).run();
                                } else {
                                    editor?.chain().focus().unsetHighlight().run();
                                }
                            }}
                            onClose={() => setShowHighlight(false)}
                            label="Highlight"
                        />
                    )}
                </div>

                <div className="w-[1px] h-4 bg-border mx-1" />

                <ToolbarButton
                    onClick={() => editor?.chain().focus().toggleBulletList().run()}
                    isActive={editor?.isActive("bulletList") ?? false}
                    title="Bullet List"
                >
                    <List size={15} />
                </ToolbarButton>
                <ToolbarButton
                    onClick={() => editor?.chain().focus().toggleOrderedList().run()}
                    isActive={editor?.isActive("orderedList") ?? false}
                    title="Numbered List"
                >
                    <ListOrdered size={15} />
                </ToolbarButton>
                <ToolbarButton
                    onClick={() => editor?.chain().focus().toggleBlockquote().run()}
                    isActive={editor?.isActive("blockquote") ?? false}
                    title="Blockquote"
                >
                    <Quote size={15} />
                </ToolbarButton>
                <ToolbarButton
                    onClick={() => editor?.chain().focus().toggleCodeBlock().run()}
                    isActive={editor?.isActive("codeBlock") ?? false}
                    title="Code Block"
                >
                    <Code size={15} />
                </ToolbarButton>
                <ToolbarButton
                    onClick={() => editor?.chain().focus().setHorizontalRule().run()}
                    title="Horizontal Rule"
                >
                    <Minus size={15} />
                </ToolbarButton>

                <div className="flex-1" />

                <div className="flex items-center gap-0.5">
                    <ToolbarButton onClick={addImage} title="Insert Image">
                        <ImageIcon size={15} />
                    </ToolbarButton>
                    <ToolbarButton onClick={addYoutube} title="Insert YouTube Video">
                        <YoutubeIcon size={15} />
                    </ToolbarButton>
                </div>

                {isSaving && (
                    <div className="ml-2 flex items-center gap-1.5 text-text-muted/60">
                        <div className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse" />
                        <span className="text-[10px] font-medium">Saving</span>
                    </div>
                )}
            </div>

            <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                multiple
                onChange={handleImageFileChange}
                className="hidden"
            />

            <div className="flex-1 overflow-y-auto px-6 md:px-16 lg:px-32 pb-20">
                <EditorContent editor={editor} />
            </div>
        </div>
    );
}
