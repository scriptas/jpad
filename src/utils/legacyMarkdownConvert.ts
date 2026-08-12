import { generateJSON } from "@tiptap/core";
import { MarkdownManager } from "@tiptap/markdown";
import { createContentExtensions } from "../tiptap/contentExtensions";

// Built once and reused: same schema the live editor uses, so a legacy .jt
// file's raw HTML round-trips through the exact same node/mark rules.
const EXTENSIONS = createContentExtensions();
const manager = new MarkdownManager({ extensions: EXTENSIONS });

/** Converts a legacy JPad .jt file's raw HTML content into real Markdown. */
export function convertLegacyHtmlToMarkdown(html: string): string {
    if (!html || !html.trim()) return "";
    const json = generateJSON(html, EXTENSIONS);
    return manager.serialize(json);
}
