/**
 * Browser-safe pure helpers and option types shared by the build-time
 * markdown-it plugin and the client-side Vue component. No Node built-ins here.
 */
import type { EngineName } from 'graphviz-ts';

/** How a diagram is rendered: at build time (inline static SVG) or client-side. */
export type RenderMode = 'build' | 'client';

/** Options for the DOT-rendering plugin. */
export interface GraphvizPluginOptions {
  /**
   * The fenced-code info-string that triggers rendering. Default `"dot"`.
   * Set to e.g. `"graphviz"` to render ```` ```graphviz ```` while leaving
   * ```` ```dot ```` blocks as normal syntax-highlighted source.
   */
  renderLanguage?: string;
  /**
   * Default render mode. `"build"` (default) renders to inline SVG during the
   * VitePress build; `"client"` renders in the browser on mount (requires the
   * `GraphvizDiagram` component registered in your theme). Per-block override
   * (space-separated in the fence info): ```` ```dot client ```` or
   * ```` ```dot build ````.
   */
  mode?: RenderMode;
  /**
   * Layout engine used when a block does not specify one. Default `"dot"`.
   * Per-block override: ```` ```dot engine=neato ````.
   *
   * @remarks Use the space-separated form, not `{...}` — VitePress reserves
   * curly braces in fence info for line highlighting and strips them before
   * the plugin sees the info-string.
   */
  defaultEngine?: EngineName;
  /** CSS class on the wrapper `<div>` around each diagram. Default `"graphviz"`. */
  wrapperClass?: string;
  /**
   * Build mode only: render in a child process with this millisecond timeout,
   * so a non-terminating graph fails to an error panel instead of hanging the
   * build. Omit for fast in-process rendering (trusted author content).
   */
  timeout?: number;
  /**
   * Build mode only. `"panel"` (default) renders a readable error box on
   * failure; `"throw"` fails the build on the first bad diagram.
   */
  onError?: 'panel' | 'throw';
  /**
   * Remap graphviz's default black strokes/text to `currentColor` so diagrams
   * inherit the surrounding theme's text color (auto-adapts to dark mode with
   * no re-render). Default `false`.
   */
  useCurrentColor?: boolean;
}

const ESCAPE_MAP: Record<string, string> = {
  '&': '&amp;',
  '<': '&lt;',
  '>': '&gt;',
  '"': '&quot;',
  "'": '&#39;',
};

export function escapeHtml(s: string): string {
  return s.replace(/[&<>"']/g, (c) => ESCAPE_MAP[c]);
}

/** A parsed fence info-string. */
export interface ParsedFence {
  lang: string;
  noRender: boolean;
  engine?: string;
  mode?: RenderMode;
}

/** Parse a fence info-string: language + `no-render`/`client`/`build` flags + `engine=`. */
export function parseFenceInfo(info: string): ParsedFence {
  const trimmed = info.trim();
  const sp = trimmed.search(/\s/);
  const lang = sp === -1 ? trimmed : trimmed.slice(0, sp);
  const rest = sp === -1 ? '' : trimmed.slice(sp + 1);
  const engine = rest.match(/\bengine\s*=\s*["']?([A-Za-z][\w-]*)["']?/)?.[1];
  let mode: RenderMode | undefined;
  if (/\bclient\b/.test(rest)) mode = 'client';
  else if (/\bbuild\b/.test(rest)) mode = 'build';
  return { lang, noRender: /\bno-render\b/.test(rest), engine, mode };
}

/**
 * graphviz-ts emits a standalone SVG document (`<?xml ?>` prolog + `<!DOCTYPE>`
 * + comment). Strip everything before the root `<svg` so the fragment is valid
 * to embed inline inside HTML.
 */
export function toInlineSvg(svg: string): string {
  const i = svg.indexOf('<svg');
  return i > 0 ? svg.slice(i) : svg;
}

/** Map graphviz's default black strokes/fills to `currentColor`. */
export function currentColorRemap(svg: string): string {
  return svg
    .replace(/(stroke|fill)="black"/g, '$1="currentColor"')
    .replace(/(stroke|fill)="#000000"/g, '$1="currentColor"')
    .replace(/(stroke|fill)="#000"/g, '$1="currentColor"');
}
