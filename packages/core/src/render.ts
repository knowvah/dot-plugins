/**
 * Framework-agnostic build-time render: a DOT string becomes HTML — an inline
 * SVG wrapper on success, or a readable error panel on failure. Runs in Node.
 * The optional `timeout` renders in a child process so a non-terminating graph
 * aborts to an error panel instead of hanging the build.
 */
import { execFileSync } from 'node:child_process';
import { createRequire } from 'node:module';
import { pathToFileURL } from 'node:url';
import { isGvError, tryRenderSvg } from '@knowvah/dot-engine';
import type { EngineName, GvError, RenderResult } from '@knowvah/dot-engine';
import {
  currentColorRemap,
  escapeHtml,
  normalizeEngine,
  toInlineSvg,
  type DotPluginOptions,
  type RenderMode,
} from './shared.js';

// --- thrown errors -----------------------------------------------------------

// dot-engine 2.x still returns DOT errors from tryRenderSvg, but throws a
// TypeError (ERR_INVALID_ARG_VALUE / ERR_INVALID_ARG_TYPE) for a call it cannot
// run: an unregistered engine, which user-written fence info such as
// `engine=foo` reaches, or a non-string source. Both paths below turn any throw
// into the same GvError the readable error panel already renders.

const GENERIC_RENDER_CODE = 'RENDER_ERROR';
const DEFAULT_RENDER_MESSAGE = 'The DOT graph could not be rendered.';

function messageOf(e: unknown): string {
  if (typeof e === 'object' && e !== null && 'message' in e) {
    return String(e.message);
  }
  return String(e);
}

/**
 * Convert whatever a render threw into a plain {@link GvError}: a DotEngineError
 * (or its serialized form) keeps its code, `friendlyMessage` and location; any
 * other throw, such as the engine's usage `TypeError`, becomes a `render` error
 * whose message is the readable text the engine wrote.
 */
function toGvError(e: unknown): GvError {
  const message = messageOf(e);
  if (!isGvError(e)) {
    return {
      type: 'render',
      code: GENERIC_RENDER_CODE,
      message,
      friendlyMessage: message || DEFAULT_RENDER_MESSAGE,
    };
  }
  const { type, code, friendlyMessage, location, expected } = e;
  return {
    type,
    code,
    message,
    friendlyMessage: friendlyMessage || message,
    ...(location !== undefined && { location }),
    ...(expected !== undefined && { expected }),
  };
}

// --- child-process worker (the `timeout` safe-mode) -------------------------

// Inline ESM worker: read DOT from stdin, render, write JSON: a RenderResult,
// or `{ threw }` carrying the plain fields of anything tryRenderSvg threw (the
// engine's usage TypeErrors), which the parent turns into a GvError. Passing
// the @knowvah/dot-engine module URL + engine via env avoids any dependency on
// the on-disk layout (bundlers relocate/​split files freely).
const CHILD_SCRIPT = [
  'const { tryRenderSvg } = await import(process.env.GV_MODULE);',
  "let input = ''; process.stdin.setEncoding('utf8');",
  "process.stdin.on('data', (c) => { input += c; });",
  "process.stdin.on('end', () => {",
  '  let out;',
  '  try {',
  "    out = tryRenderSvg(input, process.env.GV_ENGINE || 'dot');",
  '  } catch (e) {',
  '    out = { threw: {',
  '      type: e?.type, code: e?.code, message: String(e?.message ?? e),',
  '      friendlyMessage: e?.friendlyMessage, location: e?.location,',
  '      expected: e?.expected,',
  '    } };',
  '  }',
  '  process.stdout.write(JSON.stringify(out));',
  '});',
].join('\n');

/** What the child writes to stdout: a render result, or a serialized throw. */
interface ChildOutput extends RenderResult {
  threw?: unknown;
}

function parseChildOutput(out: string): RenderResult {
  const parsed: unknown = JSON.parse(out);
  if (typeof parsed !== 'object' || parsed === null) {
    throw new TypeError('the worker process wrote an unexpected result');
  }
  const { svg, errors, threw } = parsed as ChildOutput;
  if (threw !== undefined) return { errors: [toGvError(threw)] };
  if (typeof svg === 'string') return { svg };
  if (Array.isArray(errors)) return { errors };
  throw new TypeError('the worker process wrote an unexpected result');
}

let cachedModuleUrl: string | undefined;
function graphvizModuleUrl(): string {
  cachedModuleUrl ??= pathToFileURL(
    createRequire(import.meta.url).resolve('@knowvah/dot-engine'),
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
    return parseChildOutput(out);
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
  // The engine's usage errors carry one readable sentence as both fields.
  const detail =
    err?.message && err.message !== err.friendlyMessage
      ? escapeHtml(err.message)
      : '';
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
  const cfg = { ...CONFIG_DEFAULTS, ...provided } as ResolvedConfig;
  cfg.defaultEngine = normalizeEngine(cfg.defaultEngine) as EngineName;
  return cfg;
}

/** A build render: the inline SVG string on success, else the first error. */
export interface DotSvgResult {
  svg?: string;
  error?: GvError;
}

/**
 * Build-mode render returning the inline SVG string (standalone-doc prolog
 * stripped, `currentColor` applied when requested) or the first error. This is
 * the framework-agnostic core; wrap it however the host needs (an HTML string,
 * a JSX `dangerouslySetInnerHTML`, etc.).
 */
export function renderDotSvg(
  dot: string,
  engine: EngineName,
  cfg: ResolvedConfig,
): DotSvgResult {
  let result: RenderResult;
  try {
    const eng = normalizeEngine(engine) as EngineName; // case-insensitive engine names
    result = cfg.timeout
      ? renderInChild(dot, eng, cfg.timeout)
      : tryRenderSvg(dot, eng);
  } catch (e) {
    // dot-engine 2.x throws (not returns) for an unregistered engine or a
    // non-string source; a bad diagram must never fail the whole build.
    return { error: toGvError(e) };
  }

  if (result.svg != null) {
    const inline = toInlineSvg(result.svg);
    return { svg: cfg.useCurrentColor ? currentColorRemap(inline) : inline };
  }
  return { error: result.errors?.[0] };
}

/**
 * Build-mode render to HTML: an inline-SVG wrapper `<div>`, or — on failure —
 * an error panel (default) or a thrown build error.
 */
export function renderDotHtml(
  dot: string,
  engine: EngineName,
  cfg: ResolvedConfig,
): string {
  const { svg, error } = renderDotSvg(dot, engine, cfg);
  if (svg != null) {
    return `<div class="${escapeHtml(cfg.wrapperClass)}">${svg}</div>\n`;
  }
  if (cfg.onError === 'throw') {
    throw new Error(`[dot-core] ${error?.message ?? 'render failed'}`);
  }
  return errorPanel(error, cfg.wrapperClass);
}
