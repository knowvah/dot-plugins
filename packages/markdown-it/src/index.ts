/**
 * Shared markdown-it plugin for rendering Graphviz DOT fenced code blocks —
 * used by `@knowvah/vitepress-plugin-dot` and `@knowvah/eleventy-plugin-dot`.
 *
 * Build mode renders inline SVG via `@knowvah/dot-core`; client mode emits a
 * placeholder (the framework-neutral `<dot-diagram>` custom element by default,
 * or an adapter-supplied {@link ClientEmitter}). Non-DOT and `no-render` blocks
 * delegate to the host's existing fence rule.
 */
import type { MarkdownIt } from 'markdown-it';
import type { EngineName } from '@knowvah/dot-engine';
import {
  escapeHtml,
  parseFenceInfo,
  renderDotHtml,
  resolveConfig,
  type DotPluginOptions,
  type ResolvedConfig,
} from '@knowvah/dot-core';

export { parseFenceInfo } from '@knowvah/dot-core';
export type {
  DotPluginOptions,
  RenderMode,
  ResolvedConfig,
} from '@knowvah/dot-core';

/**
 * Produces the client-mode HTML for one DOT block. Adapters supply their own
 * (e.g. a Vue/React component tag); the default renders the framework-neutral
 * `<dot-diagram>` custom element.
 */
export type ClientEmitter = (
  dot: string,
  engine: EngineName,
  cfg: ResolvedConfig,
) => string;

export interface DotMarkdownOptions extends DotPluginOptions {
  /** Client-mode emitter; defaults to {@link emitDotDiagramElement}. */
  emitClient?: ClientEmitter;
  /**
   * Resolve the default engine (for a block with no ` engine= ` directive) at
   * render time instead of once at install. This lets a host whose markdown-it
   * instance is cached across renders — e.g. VS Code's Markdown preview, which
   * rebuilds only on window reload — observe a changed setting on the next
   * render. Returning `undefined` falls back to the static `defaultEngine`.
   */
  resolveDefaultEngine?: () => EngineName | undefined;
  /** Resolve `useCurrentColor` at render time, for the same reason as
   * {@link resolveDefaultEngine}. `undefined` falls back to the static value. */
  resolveUseCurrentColor?: () => boolean | undefined;
}

/** Default client emitter: the `<dot-diagram>` custom element (register it with
 * `@knowvah/dot-core/element`'s `defineDotDiagram()`). */
export function emitDotDiagramElement(
  dot: string,
  engine: EngineName,
  cfg: ResolvedConfig,
): string {
  const attrs = [
    `graph="${encodeURIComponent(dot)}"`,
    `engine="${escapeHtml(engine)}"`,
    `wrapper-class="${escapeHtml(cfg.wrapperClass)}"`,
    cfg.useCurrentColor ? 'use-current-color' : '',
  ]
    .filter(Boolean)
    .join(' ');
  return `<dot-diagram ${attrs}></dot-diagram>\n`;
}

type FenceRule = NonNullable<MarkdownIt['renderer']['rules']['fence']>;

const fallbackFence: FenceRule = (tokens, idx, opts, _env, self) =>
  self.renderToken(tokens, idx, opts);

/**
 * Install the DOT fence renderer onto a markdown-it instance. Preserves any
 * existing `fence` rule and delegates non-DOT / `no-render` blocks to it.
 */
export function dotMarkdown(
  md: MarkdownIt,
  options: DotMarkdownOptions = {},
): void {
  const {
    emitClient = emitDotDiagramElement,
    resolveDefaultEngine,
    resolveUseCurrentColor,
    ...pluginOptions
  } = options;
  const cfg = resolveConfig(pluginOptions);
  const delegate = md.renderer.rules.fence ?? fallbackFence;

  md.renderer.rules.fence = (tokens, idx, opts, env, self) => {
    const token = tokens[idx];
    const info = parseFenceInfo(token.info);
    if (info.lang !== cfg.renderLanguage || info.noRender) {
      return delegate(tokens, idx, opts, env, self);
    }
    // Precedence: per-block ` engine= ` → live resolver → static default.
    const engine = (info.engine ??
      resolveDefaultEngine?.() ??
      cfg.defaultEngine) as EngineName;
    const mode = info.mode ?? cfg.mode;
    // A live `useCurrentColor` overrides the resolved config for this render.
    const liveCurrentColor = resolveUseCurrentColor?.();
    const renderCfg =
      liveCurrentColor === undefined
        ? cfg
        : { ...cfg, useCurrentColor: liveCurrentColor };
    return mode === 'client'
      ? emitClient(token.content, engine, renderCfg)
      : renderDotHtml(token.content, engine, renderCfg);
  };
}

export default dotMarkdown;
