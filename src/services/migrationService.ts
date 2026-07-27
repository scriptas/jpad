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

        // Read Markdown content
        const markdown = await invoke<string>("read_file", { path: mdPath });

        // Parse Markdown to basic HTML
        let html = parseMarkdown(markdown);

        // Resolve images
        html = await resolveAndEmbedImages(html, assetMap);

        // Compute relative path relative to folderPath
        const normalizedMd = mdPath.replace(/\\/g, "/");
        let relativePath = "";
        if (normalizedMd.startsWith(normalizedFolder)) {
            relativePath = normalizedMd.slice(normalizedFolder.length).replace(/^[/\\]+/, "");
        } else {
            relativePath = filename;
        }

        // Replace .md / .markdown with .jt
        relativePath = relativePath.replace(/\.(md|markdown)$/i, ".jt");

        if (!relativePath || relativePath === ".jt") {
            relativePath = filename.replace(/\.(md|markdown)$/i, ".jt");
        }

        const destinationPath = `${notesRoot.replace(/\/+$/, "")}/${relativePath}`;

        // Write to JPad's notes directory
        await invoke("write_file", { path: destinationPath, content: html });
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
        let html = parseMarkdown(markdown);
        html = await resolveAndEmbedImages(html, assetMap);

        const relativePath = filename.replace(/\.(md|markdown)$/i, ".jt");
        const destinationPath = `${notesRoot.replace(/\/+$/, "")}/${relativePath}`;

        await invoke("write_file", { path: destinationPath, content: html });
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

        // 2. Parse Markdown to basic HTML
        let html = parseMarkdown(markdown);

        // 3. Resolve images (Wiki links `![[image.png]]` & standard `![alt](image.png)`)
        html = await resolveAndEmbedImages(html, assetMap);

        // 4. Determine JPad destination path cleanly
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

        relativePath = relativePath.replace(/\.(md|markdown)$/i, ".jt");
        if (!relativePath || relativePath === ".jt") {
            relativePath = file.name.replace(/\.(md|markdown)$/i, ".jt");
        }

        const destinationPath = `${notesRoot.replace(/\/+$/, "")}/${relativePath}`;

        // 5. Write to JPad's notes directory
        await invoke("write_file", { path: destinationPath, content: html });
    }
}

/** Converts markdown elements to HTML elements compatible with TipTap */
function parseMarkdown(markdown: string): string {
    let html = markdown
        .replace(/\r\n/g, "\n")
        // Escaping raw HTML characters that could conflict with parser tags
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;");

    // 1. Extract code blocks and replace with safe alphanumeric placeholder
    const codeBlocks: string[] = [];
    html = html.replace(/```(\w*)\n([\s\S]*?)```/g, (_, lang, code) => {
        const placeholder = `JPADCODEBLOCK${codeBlocks.length}`;
        codeBlocks.push(`<pre><code class="language-${lang}">${code}</code></pre>`);
        return placeholder;
    });

    // Inline code
    html = html.replace(/`([^`]+)`/g, "<code>$1</code>");

    // Headings (ordered H3 to H1 to avoid overlapping matching)
    html = html.replace(/^### (.*$)/gim, "<h3>$1</h3>");
    html = html.replace(/^## (.*$)/gim, "<h2>$1</h2>");
    html = html.replace(/^# (.*$)/gim, "<h1>$1</h1>");

    // Bold / Italic
    html = html.replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>");
    html = html.replace(/\*([^*]+)\*/g, "<em>$1</em>");
    html = html.replace(/_([^_]+)_/g, "<em>$1</em>");

    // Blockquotes (matching escaped character &gt;)
    html = html.replace(/^&gt; (.*$)/gim, "<blockquote>$1</blockquote>");

    // List rendering logic
    const lines = html.split("\n");
    let inList = false;
    let inOrderedList = false;
    const processedLines = lines.map(line => {
        const ulMatch = line.match(/^[\*\-\+] (.*$)/);
        const olMatch = line.match(/^\d+\. (.*$)/);

        if (ulMatch) {
            let res = "";
            if (inOrderedList) { res += "</ol>\n"; inOrderedList = false; }
            if (!inList) { res += "<ul>\n"; inList = true; }
            res += `<li>${ulMatch[1]}</li>`;
            return res;
        } else if (olMatch) {
            let res = "";
            if (inList) { res += "</ul>\n"; inList = false; }
            if (!inOrderedList) { res += "<ol>\n"; inOrderedList = true; }
            res += `<li>${olMatch[1]}</li>`;
            return res;
        } else {
            let res = "";
            if (inList) { res += "</ul>\n"; inList = false; }
            if (inOrderedList) { res += "</ol>\n"; inOrderedList = false; }

            const trimmed = line.trim();
            if (trimmed &&
                !trimmed.startsWith("<h") &&
                !trimmed.startsWith("<pre") &&
                !trimmed.startsWith("</pre") &&
                !trimmed.startsWith("<code") &&
                !trimmed.startsWith("</code") &&
                !trimmed.startsWith("<blockquote") &&
                !trimmed.startsWith("JPADCODEBLOCK")) {
                return res + `<p>${line}</p>`;
            }
            return res + line;
        }
    });

    if (inList) processedLines.push("</ul>");
    if (inOrderedList) processedLines.push("</ol>");

    html = processedLines.join("\n");

    // 2. Restore code blocks
    codeBlocks.forEach((block, idx) => {
        html = html.replace(`JPADCODEBLOCK${idx}`, block);
    });

    return html;
}

/** Scans HTML content, reads matching local image blobs/paths, and replaces src with Base64 strings */
async function resolveAndEmbedImages(
    html: string,
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

    // 1. Process wiki-style images: ![[my-image.png]] or ![[my-image.png|100]]
    const wikiRegex = /!\[\[([^\]|]+)(?:\|[^\]]+)?\]\]/g;
    let match;
    let newHtml = html;

    while ((match = wikiRegex.exec(html)) !== null) {
        const fullMatch = match[0];
        const parts = match[1].split("|");
        const filename = decodeURIComponent(parts[0].trim());

        const asset = assetMap.get(filename.toLowerCase());
        if (asset) {
            const base64 = await fetchBase64(asset);
            if (base64) {
                newHtml = newHtml.replace(fullMatch, `<img src="${base64}" class="jpad-image image-medium" />`);
            } else {
                newHtml = newHtml.replace(fullMatch, `[Image Missing: ${filename}]`);
            }
        } else {
            newHtml = newHtml.replace(fullMatch, `[Image Missing: ${filename}]`);
        }
    }

    html = newHtml;

    // 2. Process markdown-style images: ![alt](path/to/my-image.png)
    const mdRegex = /!\[([^\]]*)\]\(([^)]+)\)/g;
    while ((match = mdRegex.exec(html)) !== null) {
        const fullMatch = match[0];
        const altText = match[1];
        const imagePath = match[2];

        // Skip web URLs
        if (imagePath.startsWith("http://") || imagePath.startsWith("https://") || imagePath.startsWith("data:")) {
            continue;
        }

        const filename = decodeURIComponent(imagePath.split("/").pop() || "");
        const asset = assetMap.get(filename.toLowerCase());
        if (asset) {
            const base64 = await fetchBase64(asset);
            if (base64) {
                newHtml = newHtml.replace(fullMatch, `<img src="${base64}" class="jpad-image image-medium" alt="${altText}" />`);
            } else {
                newHtml = newHtml.replace(fullMatch, `[Image Missing: ${filename}]`);
            }
        } else {
            newHtml = newHtml.replace(fullMatch, `[Image Missing: ${filename}]`);
        }
    }

    return newHtml;
}
