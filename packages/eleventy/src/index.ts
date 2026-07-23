/**
 * Eleventy (11ty) plugin: render Graphviz DOT fenced code blocks to inline SVG
 * at build time, using the framework-agnostic `@knowvah/dot-core` engine.
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
 * Include the stylesheet in your layout (or copy it into your assets):
 * `@knowvah/eleventy-plugin-dot/style.css`.
 *
 * Eleventy is a static generator, so this plugin renders at build time only.
 * `client`-mode blocks are treated as `no-render` (delegated to normal
 * highlighting) for now.
 */
import type MarkdownIt from 'markdown-it';
import type { EngineName } from 'graphviz-ts';
import {
  parseFenceInfo,
  renderDotHtml,
  resolveConfig,
  type DotPluginOptions,
} from '@knowvah/dot-core';

export { parseFenceInfo } from '@knowvah/dot-core';
export type { DotPluginOptions } from '@knowvah/dot-core';

type FenceRule = NonNullable<MarkdownIt['renderer']['rules']['fence']>;

/**
 * Install a build-mode DOT fence renderer onto a markdown-it instance.
 * Non-DOT blocks — and `no-render` / `client` blocks — delegate to the existing
 * fence rule untouched.
 */
export function installDotFence(
  md: MarkdownIt,
  options: DotPluginOptions = {},
): void {
  const cfg = resolveConfig(options);
  const fallback: FenceRule = (tokens, idx, opts, _env, self) =>
    self.renderToken(tokens, idx, opts);
  const delegate = md.renderer.rules.fence ?? fallback;

  md.renderer.rules.fence = (tokens, idx, opts, env, self) => {
    const token = tokens[idx];
    const info = parseFenceInfo(token.info);
    const clientRequested = (info.mode ?? cfg.mode) === 'client';
    if (info.lang !== cfg.renderLanguage || info.noRender || clientRequested) {
      return delegate(tokens, idx, opts, env, self);
    }
    const engine = (info.engine ?? cfg.defaultEngine) as EngineName;
    return renderDotHtml(token.content, engine, cfg);
  };
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
  eleventyConfig.amendLibrary('md', (md) => installDotFence(md, options));
}
