/**
 * markdown-it plugin: render Graphviz DOT fenced code blocks — to inline SVG at
 * build time (default), or to a client-side `<DotDiagram>` component — using the
 * framework-agnostic `@knowvah/dot-core` engine.
 *
 * Use it directly via VitePress's `markdown.config`, or use the {@link withDot}
 * wrapper from the package root.
 */
import type MarkdownIt from 'markdown-it';
import type { EngineName } from 'graphviz-ts';
import {
  escapeHtml,
  parseFenceInfo,
  renderDotHtml,
  resolveConfig,
  type DotPluginOptions,
  type ResolvedConfig,
} from '@knowvah/dot-core';

export { parseFenceInfo } from '@knowvah/dot-core';
export type { DotPluginOptions, RenderMode } from '@knowvah/dot-core';

/** Client mode: emit a `<DotDiagram>` component (rendered in the browser).
 * Requires the component registered in the VitePress theme's `enhanceApp`. */
function renderClient(
  dot: string,
  engine: EngineName,
  cfg: ResolvedConfig,
): string {
  const attrs = [
    `graph="${encodeURIComponent(dot)}"`,
    `engine="${escapeHtml(engine)}"`,
    `wrapper-class="${escapeHtml(cfg.wrapperClass)}"`,
    cfg.useCurrentColor ? ':use-current-color="true"' : '',
  ]
    .filter(Boolean)
    .join(' ');
  return `<ClientOnly><DotDiagram ${attrs}></DotDiagram></ClientOnly>\n`;
}

type FenceRule = NonNullable<MarkdownIt['renderer']['rules']['fence']>;

const fallbackFence: FenceRule = (tokens, idx, opts, _env, self) =>
  self.renderToken(tokens, idx, opts);

/**
 * Install the DOT renderer onto a markdown-it instance. Preserves any existing
 * `fence` rule and delegates to it for non-DOT blocks (so syntax highlighting
 * of other languages — and of opted-out ```` ```dot no-render ```` blocks — is
 * untouched).
 */
export function dotMarkdown(
  md: MarkdownIt,
  options: DotPluginOptions = {},
): void {
  const cfg = resolveConfig(options);
  const delegate = md.renderer.rules.fence ?? fallbackFence;

  md.renderer.rules.fence = (tokens, idx, opts, env, self) => {
    const token = tokens[idx];
    const info = parseFenceInfo(token.info);
    if (info.lang !== cfg.renderLanguage || info.noRender) {
      return delegate(tokens, idx, opts, env, self);
    }
    const engine = (info.engine ?? cfg.defaultEngine) as EngineName;
    const mode = info.mode ?? cfg.mode;
    return mode === 'client'
      ? renderClient(token.content, engine, cfg)
      : renderDotHtml(token.content, engine, cfg);
  };
}

export default dotMarkdown;
