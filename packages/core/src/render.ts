/**
 * Framework-agnostic build-time render: a DOT string becomes HTML — an inline
 * SVG wrapper on success, or a readable error panel on failure. Runs in Node.
 * The optional `timeout` renders in a child process so a non-terminating graph
 * aborts to an error panel instead of hanging the build.
 */
import { execFileSync } from 'node:child_process';
import { createRequire } from 'node:module';
import { pathToFileURL } from 'node:url';
import { tryRenderSvg } from 'graphviz-ts';
import type { EngineName, GvError, RenderResult } from 'graphviz-ts';
import {
  currentColorRemap,
  escapeHtml,
  toInlineSvg,
  type DotPluginOptions,
  type RenderMode,
} from './shared.js';

// --- child-process worker (the `timeout` safe-mode) -------------------------

// Inline ESM worker: read DOT from stdin, render, write a JSON RenderResult.
// Passing the graphviz-ts module URL + engine via env avoids any dependency on
// the on-disk layout (bundlers relocate/​split files freely).
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

// --- config -----------------------------------------------------------------

export interface ResolvedConfig {
  renderLanguage: string;
  mode: RenderMode;
  defaultEngine: EngineName;
  wrapperClass: string;
  onError: 'panel' | 'throw';
  timeout?: number;
  useCurrentColor?: boolean;
}

const CONFIG_DEFAULTS = {
  renderLanguage: 'dot',
  mode: 'build',
  defaultEngine: 'dot',
  wrapperClass: 'dot-diagram',
  onError: 'panel',
} satisfies Partial<ResolvedConfig>;

/** Merge caller options over the defaults (ignoring `undefined` values). */
export function resolveConfig(options: DotPluginOptions): ResolvedConfig {
  const provided = Object.fromEntries(
    Object.entries(options).filter((entry) => entry[1] !== undefined),
  );
  return { ...CONFIG_DEFAULTS, ...provided } as ResolvedConfig;
}

/**
 * Build-mode render: a DOT block becomes an inline-SVG wrapper `<div>`, or —
 * on failure — an error panel (default) or a thrown build error.
 */
export function renderDotHtml(
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
    throw new Error(`[dot-core] ${err?.message ?? 'render failed'}`);
  }
  return errorPanel(err, cfg.wrapperClass);
}
