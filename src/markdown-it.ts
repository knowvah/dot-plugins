/**
 * markdown-it plugin: render Graphviz DOT fenced code blocks to inline SVG at
 * build time using the pure-TypeScript `graphviz-ts` engine.
 *
 * This is the engine of `@knowvah/vitepress-plugin-graphviz`. Use it directly
 * via VitePress's `markdown.config`, or use the {@link withGraphviz} wrapper
 * from the package root.
 */
import { execFileSync } from 'node:child_process';
import { createRequire } from 'node:module';
import { pathToFileURL } from 'node:url';
import { tryRenderSvg } from 'graphviz-ts';
import type { EngineName, GvError, RenderResult } from 'graphviz-ts';
import type MarkdownIt from 'markdown-it';

/** Options for the DOT-rendering markdown-it plugin. */
export interface GraphvizPluginOptions {
  /**
   * The fenced-code info-string that triggers rendering. Default `"dot"`.
   * Set to e.g. `"graphviz"` to render ```` ```graphviz ```` while leaving
   * ```` ```dot ```` blocks as normal syntax-highlighted source.
   */
  renderLanguage?: string;
  /**
   * Layout engine used when a block does not specify one. Default `"dot"`.
   * Per-block override: ```` ```dot {engine=neato} ````.
   */
  defaultEngine?: EngineName;
  /** CSS class on the wrapper `<div>` around each diagram. Default `"graphviz"`. */
  wrapperClass?: string;
  /**
   * When set, render in a child process with this millisecond timeout, so a
   * non-terminating graph fails to an error panel instead of hanging the build.
   * Omit for fast in-process rendering (trusted author content).
   */
  timeout?: number;
  /**
   * `"panel"` (default) renders a readable error box on failure; `"throw"`
   * fails the build on the first bad diagram.
   */
  onError?: 'panel' | 'throw';
  /**
   * Remap graphviz's default black strokes/text to `currentColor` so diagrams
   * inherit the surrounding theme's text color (useful for dark mode).
   * Default `false`.
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

function escapeHtml(s: string): string {
  return s.replace(/[&<>"']/g, (c) => ESCAPE_MAP[c]);
}

/** Parse a fence info-string: language + optional `no-render` flag + `engine=`. */
export function parseFenceInfo(info: string): {
  lang: string;
  noRender: boolean;
  engine?: string;
} {
  const trimmed = info.trim();
  const sp = trimmed.search(/\s/);
  const lang = sp === -1 ? trimmed : trimmed.slice(0, sp);
  const rest = sp === -1 ? '' : trimmed.slice(sp + 1);
  const noRender = /\bno-render\b/.test(rest);
  const m = rest.match(/\bengine\s*=\s*["']?([A-Za-z][\w-]*)["']?/);
  return { lang, noRender, engine: m?.[1] };
}

/**
 * graphviz-ts emits a standalone SVG document (`<?xml ?>` prolog + `<!DOCTYPE>`
 * + comment). Strip everything before the root `<svg` so the fragment is valid
 * to embed inline inside HTML.
 */
function toInlineSvg(svg: string): string {
  const i = svg.indexOf('<svg');
  return i > 0 ? svg.slice(i) : svg;
}

function currentColorRemap(svg: string): string {
  return svg
    .replace(/(stroke|fill)="black"/g, '$1="currentColor"')
    .replace(/(stroke|fill)="#000000"/g, '$1="currentColor"')
    .replace(/(stroke|fill)="#000"/g, '$1="currentColor"');
}

// Inline ESM worker: read DOT from stdin, render, write a JSON RenderResult.
// Passing the graphviz-ts module URL + engine via env avoids any dependency on
// the plugin's on-disk layout (bundlers relocate/​split files freely).
const CHILD_SCRIPT = [
  'const { tryRenderSvg } = await import(process.env.GV_MODULE);',
  "let input = ''; process.stdin.setEncoding('utf8');",
  "process.stdin.on('data', (c) => { input += c; });",
  "process.stdin.on('end', () => process.stdout.write(",
  "  JSON.stringify(tryRenderSvg(input, process.env.GV_ENGINE || 'dot'))));",
].join('\n');

let cachedModuleUrl: string | undefined;
function graphvizModuleUrl(): string {
  cachedModuleUrl ??= pathToFileURL(
    createRequire(import.meta.url).resolve('graphviz-ts'),
  ).href;
  return cachedModuleUrl;
}

function renderInChild(
  dot: string,
  engine: EngineName,
  timeout: number,
): RenderResult {
  try {
    const out = execFileSync(
      process.execPath,
      ['--input-type=module', '-e', CHILD_SCRIPT],
      {
        input: dot,
        timeout,
        maxBuffer: 64 * 1024 * 1024,
        encoding: 'utf8',
        env: {
          ...process.env,
          GV_MODULE: graphvizModuleUrl(),
          GV_ENGINE: engine,
          GV_FONT_QUIET: '1',
        },
      },
    );
    return JSON.parse(out) as RenderResult;
  } catch (err: unknown) {
    return childErrorResult(err, timeout);
  }
}

function childErrorResult(err: unknown, timeout: number): RenderResult {
  const e = err as { killed?: boolean; code?: string; signal?: string | null };
  const timedOut =
    e.killed === true || e.code === 'ETIMEDOUT' || e.signal != null;
  const friendlyMessage = timedOut
    ? `Rendering exceeded the ${timeout}ms timeout and was aborted.`
    : 'The DOT graph could not be rendered in the worker process.';
  return {
    errors: [
      {
        type: 'render',
        code: 'RENDER_ERROR',
        message: String((err as Error)?.message ?? err),
        friendlyMessage,
      },
    ],
  };
}

function errorPanel(err: GvError | undefined, wrapperClass: string): string {
  const friendly = escapeHtml(
    err?.friendlyMessage ?? 'The DOT graph could not be rendered.',
  );
  const where =
    err?.location != null
      ? ` <code>line ${err.location.line}, column ${err.location.column}</code>`
      : '';
  const detail = err?.message ? escapeHtml(err.message) : '';
  return (
    `<div class="${escapeHtml(wrapperClass)}-error" role="alert">` +
    `<strong>Graphviz render error</strong>${where}<br>${friendly}` +
    (detail ? `<br><code>${detail}</code>` : '') +
    `</div>\n`
  );
}

interface ResolvedConfig {
  renderLanguage: string;
  defaultEngine: EngineName;
  wrapperClass: string;
  onError: 'panel' | 'throw';
  timeout?: number;
  useCurrentColor?: boolean;
}

/** Render one DOT block to HTML: a diagram wrapper on success, an error panel
 * (or a thrown build error) on failure. */
function renderDotBlock(
  dot: string,
  engine: EngineName,
  cfg: ResolvedConfig,
): string {
  const result: RenderResult = cfg.timeout
    ? renderInChild(dot, engine, cfg.timeout)
    : tryRenderSvg(dot, engine);

  if (result.svg != null) {
    const inline = toInlineSvg(result.svg);
    const svg = cfg.useCurrentColor ? currentColorRemap(inline) : inline;
    return `<div class="${escapeHtml(cfg.wrapperClass)}">${svg}</div>\n`;
  }

  const err = result.errors?.[0];
  if (cfg.onError === 'throw') {
    throw new Error(
      `[vitepress-plugin-graphviz] ${err?.message ?? 'render failed'}`,
    );
  }
  return errorPanel(err, cfg.wrapperClass);
}

type FenceRule = NonNullable<MarkdownIt['renderer']['rules']['fence']>;

const fallbackFence: FenceRule = (tokens, idx, opts, _env, self) =>
  self.renderToken(tokens, idx, opts);

function resolveConfig(options: GraphvizPluginOptions): ResolvedConfig {
  return {
    renderLanguage: options.renderLanguage ?? 'dot',
    defaultEngine: options.defaultEngine ?? 'dot',
    wrapperClass: options.wrapperClass ?? 'graphviz',
    onError: options.onError ?? 'panel',
    timeout: options.timeout,
    useCurrentColor: options.useCurrentColor,
  };
}

/**
 * Install the DOT renderer onto a markdown-it instance. Preserves any existing
 * `fence` rule and delegates to it for non-DOT blocks (so syntax highlighting
 * of other languages — and of opted-out ```` ```dot no-render ```` blocks — is
 * untouched).
 */
export function graphvizMarkdown(
  md: MarkdownIt,
  options: GraphvizPluginOptions = {},
): void {
  const cfg = resolveConfig(options);
  const delegate = md.renderer.rules.fence ?? fallbackFence;

  md.renderer.rules.fence = (tokens, idx, opts, env, self) => {
    const info = parseFenceInfo(tokens[idx].info);
    if (info.lang !== cfg.renderLanguage || info.noRender) {
      return delegate(tokens, idx, opts, env, self);
    }
    const engine = (info.engine ?? cfg.defaultEngine) as EngineName;
    return renderDotBlock(tokens[idx].content, engine, cfg);
  };
}

export default graphvizMarkdown;
