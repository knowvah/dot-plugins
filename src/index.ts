/**
 * `@knowvah/vitepress-plugin-graphviz`
 *
 * Render Graphviz DOT fenced code blocks to inline SVG in VitePress, **at build
 * time** — no client-side JavaScript, no flash of unrendered code — using the
 * pure-TypeScript synchronous {@link https://www.npmjs.com/package/graphviz-ts | graphviz-ts}
 * engine.
 *
 * @example
 * ```ts
 * // docs/.vitepress/config.ts
 * import { defineConfig } from 'vitepress';
 * import { withGraphviz } from '@knowvah/vitepress-plugin-graphviz';
 * import '@knowvah/vitepress-plugin-graphviz/style.css';
 *
 * export default withGraphviz(defineConfig({ title: 'My Docs' }), {
 *   defaultEngine: 'dot',
 * });
 * ```
 */
import { graphvizMarkdown, type GraphvizPluginOptions } from './markdown-it.js';

export { graphvizMarkdown, parseFenceInfo } from './markdown-it.js';
export type { GraphvizPluginOptions, RenderMode } from './markdown-it.js';

/** Minimal structural view of a VitePress `UserConfig` — avoids a hard
 * dependency on the `vitepress` types so the raw markdown-it plugin stays
 * usable without VitePress installed. */
interface MarkdownConfigLike {
  config?: (md: unknown) => void;
  [key: string]: unknown;
}
interface UserConfigLike {
  markdown?: MarkdownConfigLike;
  [key: string]: unknown;
}

/**
 * Wrap a VitePress config so DOT fences render to SVG. Preserves any existing
 * `markdown.config` hook, so it composes with other markdown plugins (e.g.
 * `withMermaid`): `withGraphviz(withMermaid(defineConfig({ ... })))`.
 *
 * @param config  the VitePress `UserConfig` (typically `defineConfig({...})`)
 * @param options DOT-rendering options
 * @returns the same config object, mutated in place
 */
export function withGraphviz<T extends UserConfigLike>(
  config: T,
  options: GraphvizPluginOptions = {},
): T {
  const markdown: MarkdownConfigLike = (config.markdown ??= {});
  const prev = markdown.config;
  markdown.config = (md: unknown) => {
    // graphvizMarkdown captures the current fence rule (VitePress's Shiki
    // highlighter) and delegates non-DOT fences to it.
    graphvizMarkdown(md as Parameters<typeof graphvizMarkdown>[0], options);
    prev?.(md);
  };
  return config;
}

export default withGraphviz;
