/**
 * markdown-it plugin: render Graphviz DOT fenced code blocks — either to inline
 * SVG at build time (default) or to a client-side `<DotDiagram>` component
 * — using the pure-TypeScript `graphviz-ts` engine.
 *
 * This is the engine of `@knowvah/vitepress-plugin-dot`. Use it directly
 * via VitePress's `markdown.config`, or use the {@link withDot} wrapper
 * from the package root.
 */
import { execFileSync } from 'node:child_process';
import { createRequire } from 'node:module';
import { pathToFileURL } from 'node:url';
import { tryRenderSvg } from 'graphviz-ts';
import type { EngineName, GvError, RenderResult } from 'graphviz-ts';
import type MarkdownIt from 'markdown-it';
import {
  currentColorRemap,
  escapeHtml,
  parseFenceInfo,
  toInlineSvg,
  type DotPluginOptions,
  type RenderMode,
} from './shared.js';

export { parseFenceInfo } from './shared.js';
export type { DotPluginOptions, RenderMode } from './shared.js';

// --- build-mode child-process worker (the `timeout` safe-mode) --------------

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

// --- HTML emission ----------------------------------------------------------

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
  mode: RenderMode;
  defaultEngine: EngineName;
  wrapperClass: string;
  onError: 'panel' | 'throw';
  timeout?: number;
  useCurrentColor?: boolean;
}

/** Build mode: render one DOT block to inline SVG (or an error panel / throw). */
function renderBuild(
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
      `[vitepress-plugin-dot] ${err?.message ?? 'render failed'}`,
    );
  }
  return errorPanel(err, cfg.wrapperClass);
}

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

// --- markdown-it wiring ------------------------------------------------------

type FenceRule = NonNullable<MarkdownIt['renderer']['rules']['fence']>;

const fallbackFence: FenceRule = (tokens, idx, opts, _env, self) =>
  self.renderToken(tokens, idx, opts);

const CONFIG_DEFAULTS = {
  renderLanguage: 'dot',
  mode: 'build',
  defaultEngine: 'dot',
  wrapperClass: 'dot-diagram',
  onError: 'panel',
} satisfies Partial<ResolvedConfig>;

function resolveConfig(options: DotPluginOptions): ResolvedConfig {
  const provided = Object.fromEntries(
    Object.entries(options).filter((entry) => entry[1] !== undefined),
  );
  return { ...CONFIG_DEFAULTS, ...provided } as ResolvedConfig;
}

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
      : renderBuild(token.content, engine, cfg);
  };
}

export default dotMarkdown;
