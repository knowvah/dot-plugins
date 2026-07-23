/**
 * Eleventy (11ty) plugin: render Graphviz DOT fenced code blocks — to inline SVG
 * at build time (default), or (with `client`) to a `<dot-diagram>` web component
 * rendered in the browser — via the shared `@knowvah/dot-markdown-it` plugin.
 *
 * ```js
 * // eleventy.config.js
 * import eleventyPluginDot from '@knowvah/eleventy-plugin-dot';
 *
 * export default function (eleventyConfig) {
 *   eleventyConfig.addPlugin(eleventyPluginDot, { useCurrentColor: true });
 * }
 * ```
 *
 * Include the stylesheet (`@knowvah/eleventy-plugin-dot/style.css`). For
 * client-mode blocks, register the web component in your site's browser JS:
 *
 * ```js
 * import { defineDotDiagram } from '@knowvah/eleventy-plugin-dot/client';
 * defineDotDiagram();
 * ```
 */
import type MarkdownIt from 'markdown-it';
import { dotMarkdown, type DotPluginOptions } from '@knowvah/dot-markdown-it';

export { parseFenceInfo } from '@knowvah/dot-markdown-it';
export type { DotPluginOptions } from '@knowvah/dot-core';

/** Install the DOT fence renderer onto a markdown-it instance. */
export function installDotFence(
  md: MarkdownIt,
  options: DotPluginOptions = {},
): void {
  dotMarkdown(md, options);
}

/** Minimal structural view of Eleventy's config — avoids depending on
 * `@11ty/eleventy`'s types. */
interface EleventyConfig {
  amendLibrary(name: 'md', callback: (md: MarkdownIt) => void): void;
}

/**
 * Eleventy plugin. Register with
 * `eleventyConfig.addPlugin(eleventyPluginDot, options)`. Requires Eleventy 2.0+
 * (uses `amendLibrary`) and its default markdown-it engine.
 */
export default function eleventyPluginDot(
  eleventyConfig: EleventyConfig,
  options: DotPluginOptions = {},
): void {
  eleventyConfig.amendLibrary('md', (md) => dotMarkdown(md, options));
}
