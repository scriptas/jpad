import StarterKit from "@tiptap/starter-kit";
import Image from "@tiptap/extension-image";
import Youtube from "@tiptap/extension-youtube";
import Color from "@tiptap/extension-color";
import { TextStyle } from "@tiptap/extension-text-style";
import Highlight from "@tiptap/extension-highlight";
import { Markdown } from "@tiptap/markdown";
import { type JSONContent, type MarkdownRendererHelpers } from "@tiptap/core";

/** Custom Image extension with size and inline support */
export const CustomImage = Image.extend({
    addOptions() {
        return {
            ...(this.parent?.() as any),
            inline: true,
            allowBase64: true,
        };
    },

    addAttributes() {
        return {
            ...this.parent?.(),
            src: {
                default: null,
                parseHTML: element => element.getAttribute('src'),
                renderHTML: attributes => ({
                    src: attributes.src,
                }),
            },
            size: {
                default: "medium",
                parseHTML: (element) => element.getAttribute("data-size") || "medium",
                renderHTML: (attributes) => {
                    return {
                        "data-size": attributes.size,
                        class: `jpad-image image-${attributes.size}`,
                    };
                },
            },
        };
    },

    // Default-size images serialize as plain ![alt](src) markdown. Resized images
    // fall back to raw HTML (valid inline HTML in Markdown) so the `size` survives
    // the round trip through a .md file.
    renderMarkdown(node: JSONContent) {
        const { src, alt, size, title } = (node.attrs || {}) as {
            src?: string;
            alt?: string;
            size?: string;
            title?: string;
        };
        const safeSrc = src || "";
        const safeAlt = alt || "";
        if (size && size !== "medium") {
            return `<img src="${safeSrc}" alt="${safeAlt}" data-size="${size}" class="jpad-image image-${size}" />`;
        }
        return title ? `![${safeAlt}](${safeSrc} "${title}")` : `![${safeAlt}](${safeSrc})`;
    },
});

/** TextStyle mark extended to preserve inline color/highlight-background as raw HTML in Markdown */
export const CustomTextStyle = TextStyle.extend({
    renderMarkdown(node: JSONContent, helpers: MarkdownRendererHelpers) {
        const { color, backgroundColor } = (node.attrs || {}) as {
            color?: string;
            backgroundColor?: string;
        };
        const inner = helpers.renderChildren(node);
        const styles: string[] = [];
        if (color) styles.push(`color: ${color}`);
        if (backgroundColor) styles.push(`background-color: ${backgroundColor}`);
        if (!styles.length) return inner;
        return `<span style="${styles.join("; ")}">${inner}</span>`;
    },
});

/**
 * The shared content schema (nodes/marks) used both by the live editor and by
 * headless HTML->Markdown conversion (see utils/legacyMarkdownConvert.ts).
 * Keeping this in one place ensures both stay in sync.
 */
export function createContentExtensions(opts?: { undoRedo?: { newGroupDelay: number } }) {
    const starterKitConfig: Record<string, unknown> = { heading: { levels: [1, 2, 3] } };
    if (opts?.undoRedo) {
        starterKitConfig.undoRedo = opts.undoRedo;
    }

    return [
        // Underline is bundled by StarterKit itself as of Tiptap 3.x
        StarterKit.configure(starterKitConfig),
        CustomTextStyle,
        Color,
        Highlight.configure({
            multicolor: true,
        }),
        CustomImage,
        Markdown,
        Youtube.configure({
            HTMLAttributes: {
                class: "mx-auto rounded-lg shadow-lg border border-border max-w-full my-4",
            },
        }),
    ];
}
