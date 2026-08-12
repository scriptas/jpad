import { invoke } from "@tauri-apps/api/core";

export interface ImportProgress {
    current: number;
    total: number;
    currentFile: string;
}

/** Migrates a folder directly from a filesystem path (native folder dialog) */
export async function migrateFolderFromPath(
    folderPath: string,
    notesRoot: string,
    onProgress: (status: ImportProgress) => void
) {
    // 1. Get all files in the directory recursively
    const allFilePaths = await invoke<string[]>("list_all_files", { path: folderPath });

    // Filter out config / hidden files & folders (.obsidian, .git, etc.)
    const isHiddenOrConfig = (p: string) => p.includes("/.") || p.includes("\\.");
    const validPaths = allFilePaths.filter(p => !isHiddenOrConfig(p));

    const mdFilePaths = validPaths.filter(p => p.endsWith(".md") || p.endsWith(".markdown"));

    // Index non-markdown assets (images) by filename
    const assetMap = new Map<string, string>();
    validPaths.forEach(p => {
        if (!p.endsWith(".md") && !p.endsWith(".markdown")) {
            const filename = p.split("/").pop() || "";
            if (filename) {
                assetMap.set(filename.toLowerCase(), p);
            }
        }
    });

    const total = mdFilePaths.length;
    if (total === 0) {
        throw new Error("No markdown (.md) files found in the selected folder.");
    }

    // Normalize folder path slashes
    const normalizedFolder = folderPath.replace(/\\/g, "/").replace(/\/+$/, "");

    for (let i = 0; i < total; i++) {
        const mdPath = mdFilePaths[i];
        const filename = mdPath.split("/").pop() || mdPath;

        onProgress({
            current: i + 1,
            total,
            currentFile: filename
        });

        // Read Markdown content and embed any local images as base64 data URIs
        const markdown = await invoke<string>("read_file", { path: mdPath });
        const content = await resolveAndEmbedImages(markdown, assetMap);

        // Compute relative path relative to folderPath
        const normalizedMd = mdPath.replace(/\\/g, "/");
        let relativePath = "";
        if (normalizedMd.startsWith(normalizedFolder)) {
            relativePath = normalizedMd.slice(normalizedFolder.length).replace(/^[/\\]+/, "");
        } else {
            relativePath = filename;
        }

        // Normalize .markdown to .md for a consistent vault
        relativePath = relativePath.replace(/\.markdown$/i, ".md");

        if (!relativePath || relativePath === ".md") {
            relativePath = filename.replace(/\.markdown$/i, ".md");
        }

        const destinationPath = `${notesRoot.replace(/\/+$/, "")}/${relativePath}`;

        // Write to JPad's notes directory as real Markdown
        await invoke("write_file", { path: destinationPath, content });
    }
}

/** Migrates a list of selected file paths from disk */
export async function migrateFilePaths(
    filePaths: string[],
    notesRoot: string,
    onProgress: (status: ImportProgress) => void
) {
    const mdPaths = filePaths.filter(p => p.endsWith(".md") || p.endsWith(".markdown"));
    const total = mdPaths.length;
    if (total === 0) {
        throw new Error("No markdown (.md) files selected.");
    }

    const assetMap = new Map<string, string>();

    for (let i = 0; i < total; i++) {
        const mdPath = mdPaths[i];
        const filename = mdPath.split("/").pop() || mdPath;

        onProgress({
            current: i + 1,
            total,
            currentFile: filename
        });

        const markdown = await invoke<string>("read_file", { path: mdPath });
        const content = await resolveAndEmbedImages(markdown, assetMap);

        const relativePath = filename.replace(/\.markdown$/i, ".md");
        const destinationPath = `${notesRoot.replace(/\/+$/, "")}/${relativePath}`;

        await invoke("write_file", { path: destinationPath, content });
    }
}

/** Parses markdown into HTML and embeds referenced local images as base64 (HTML FileList fallback) */
export async function migrateFolder(
    files: FileList | File[],
    notesRoot: string,
    onProgress: (status: ImportProgress) => void
) {
    const fileArray = Array.from(files);

    // Find all markdown files (excluding config folders like .obsidian, .git, or system folders)
    const mdFiles = fileArray.filter(
        f => (f.name.endsWith(".md") || f.name.endsWith(".markdown")) && !f.webkitRelativePath.includes("/.")
    );

    // Keep a dictionary index of all non-markdown files (images/attachments) by filename for rapid lookup
    const assetMap = new Map<string, File>();
    fileArray.forEach(f => {
        if (!f.name.endsWith(".md") && !f.name.endsWith(".markdown")) {
            assetMap.set(f.name.toLowerCase(), f);
        }
    });

    const total = mdFiles.length;
    if (total === 0) {
        throw new Error("No markdown (.md) files found in the selection.");
    }

    for (let i = 0; i < total; i++) {
        const file = mdFiles[i];

        onProgress({
            current: i + 1,
            total,
            currentFile: file.name
        });

        // 1. Read Markdown content
        const markdown = await file.text();

        // 2. Resolve images (Wiki links `![[image.png]]` & standard `![alt](image.png)`)
        const content = await resolveAndEmbedImages(markdown, assetMap);

        // 3. Determine JPad destination path cleanly
        let relativePath = "";
        if (file.webkitRelativePath) {
            const parts = file.webkitRelativePath.split("/");
            if (parts.length > 1) {
                parts.shift(); // remove root folder name
                relativePath = parts.join("/");
            } else if (parts.length === 1 && parts[0]) {
                relativePath = parts[0];
            }
        }

        if (!relativePath) {
            relativePath = file.name;
        }

        relativePath = relativePath.replace(/\.markdown$/i, ".md");
        if (!relativePath || relativePath === ".md") {
            relativePath = file.name.replace(/\.markdown$/i, ".md");
        }

        const destinationPath = `${notesRoot.replace(/\/+$/, "")}/${relativePath}`;

        // 4. Write to JPad's notes directory
        await invoke("write_file", { path: destinationPath, content });
    }
}

/** Scans Markdown text, reads matching local image blobs/paths, and replaces image sources with Base64 data URIs */
async function resolveAndEmbedImages(
    markdown: string,
    assetMap: Map<string, File | string>
): Promise<string> {
    const fetchBase64 = async (asset: File | string): Promise<string> => {
        if (typeof asset === "string") {
            try {
                return await invoke<string>("read_file_base64", { path: asset });
            } catch (err) {
                console.warn("Failed to read image base64 from path:", asset, err);
                return "";
            }
        } else {
            return new Promise((resolve) => {
                const reader = new FileReader();
                reader.onload = () => resolve(reader.result as string);
                reader.onerror = () => resolve("");
                reader.readAsDataURL(asset);
            });
        }
    };

    let content = markdown;

    // 1. Process wiki-style images: ![[my-image.png]] or ![[my-image.png|100]]
    const wikiRegex = /!\[\[([^\]|]+)(?:\|[^\]]+)?\]\]/g;
    let match;

    while ((match = wikiRegex.exec(markdown)) !== null) {
        const fullMatch = match[0];
        const parts = match[1].split("|");
        const filename = decodeURIComponent(parts[0].trim());

        const asset = assetMap.get(filename.toLowerCase());
        if (asset) {
            const base64 = await fetchBase64(asset);
            content = content.replace(fullMatch, base64 ? `![${filename}](${base64})` : `[Image Missing: ${filename}]`);
        } else {
            content = content.replace(fullMatch, `[Image Missing: ${filename}]`);
        }
    }

    // 2. Process standard markdown images: ![alt](path/to/my-image.png)
    const mdRegex = /!\[([^\]]*)\]\(([^)]+)\)/g;
    while ((match = mdRegex.exec(markdown)) !== null) {
        const fullMatch = match[0];
        const altText = match[1];
        const imagePath = match[2];

        // Skip web URLs and already-embedded data URIs
        if (imagePath.startsWith("http://") || imagePath.startsWith("https://") || imagePath.startsWith("data:")) {
            continue;
        }

        const filename = decodeURIComponent(imagePath.split("/").pop() || "");
        const asset = assetMap.get(filename.toLowerCase());
        if (asset) {
            const base64 = await fetchBase64(asset);
            content = content.replace(fullMatch, base64 ? `![${altText}](${base64})` : `[Image Missing: ${filename}]`);
        } else {
            content = content.replace(fullMatch, `[Image Missing: ${filename}]`);
        }
    }

    return content;
}
