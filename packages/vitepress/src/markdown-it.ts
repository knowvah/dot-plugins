/**
 * VitePress markdown-it adapter — a thin wrapper over `@knowvah/dot-markdown-it`
 * that emits VitePress's `<ClientOnly><DotDiagram>` (a Vue component) for
 * client-mode blocks. Build mode and delegation are handled by the shared plugin.
 *
 * Use it directly via VitePress's `markdown.config`, or use the {@link withDot}
 * wrapper from the package root.
 */
import type MarkdownIt from 'markdown-it';
import type { EngineName } from '@knowvah/dot-engine';
import { escapeHtml, type ResolvedConfig } from '@knowvah/dot-core';
import { dotMarkdown as dotMarkdownBase } from '@knowvah/dot-markdown-it';
import type { DotPluginOptions } from '@knowvah/dot-core';

export { parseFenceInfo } from '@knowvah/dot-markdown-it';
export type { DotPluginOptions, RenderMode } from '@knowvah/dot-core';

/** Client mode: emit VitePress's Vue component, deferred with `<ClientOnly>`.
 * Requires `DotDiagram` registered in the theme's `enhanceApp`. */
function emitVitePressClient(
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

/**
 * Install the DOT renderer onto a markdown-it instance. Preserves any existing
 * `fence` rule and delegates non-DOT / `no-render` blocks to it.
 */
export function dotMarkdown(
  md: MarkdownIt,
  options: DotPluginOptions = {},
): void {
  dotMarkdownBase(md, { ...options, emitClient: emitVitePressClient });
}

export default dotMarkdown;
