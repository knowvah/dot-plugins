// SPDX-License-Identifier: MIT
/**
 * Pure preview helpers — engine selection and webview HTML wrapping. No
 * `vscode` dependency and no rendering (that runs in a terminable worker; see
 * `render-service.ts`), so this stays trivially unit-testable.
 */
import { escapeHtml, normalizeEngine } from '@knowvah/dot-core';
import type { BuiltinEngine } from '@knowvah/dot-engine';

/** A rendered preview: either inline SVG, or a human-readable error message. */
export interface PreviewResult {
  svg?: string;
  error?: string;
}

/** The built-in layout engines (graphviz-ts throws on any other name, so a name
 * from a comment or setting must be validated against this set before use). */
export const BUILTIN_ENGINES: readonly BuiltinEngine[] = [
  'dot',
  'neato',
  'fdp',
  'sfdp',
  'circo',
  'twopi',
  'osage',
  'patchwork',
];

// A per-file engine directive in a leading line comment, e.g. `// engine: neato`
// or `# engine = fdp`.
const ENGINE_DIRECTIVE = /\bengine\s*[:=]\s*([A-Za-z]+)/i;

function isLineComment(line: string): boolean {
  return line.startsWith('//') || line.startsWith('#');
}

/** A located engine directive: the engine plus its position in the source, so
 * the extension can anchor a diagnostic on it. Columns are 0-based. */
export interface EngineDirective {
  engine: BuiltinEngine;
  line: number;
  start: number;
  end: number;
}

/**
 * Find the engine directive in a document's leading line comments
 * (`// engine: neato`), with its location. Scanning stops at the first line of
 * graph content, so only a header comment counts. `undefined` if there is no
 * (recognized) directive.
 */
export function findEngineDirective(dot: string): EngineDirective | undefined {
  const lines = dot.split('\n');
  for (let i = 0; i < lines.length; i++) {
    const trimmed = lines[i].trim();
    if (trimmed === '') continue;
    if (!isLineComment(trimmed)) break; // reached the graph body
    const match = ENGINE_DIRECTIVE.exec(lines[i]); // raw line → correct columns
    if (match !== null) {
      const name = normalizeEngine(match[1]) as BuiltinEngine;
      if (BUILTIN_ENGINES.includes(name)) {
        return { engine: name, line: i, start: match.index, end: match.index + match[0].length };
      }
    }
  }
  return undefined;
}

/** The engine declared by a document's directive, or `undefined` if none. */
export function parseEngineDirective(dot: string): BuiltinEngine | undefined {
  return findEngineDirective(dot)?.engine;
}

/** A remembered override that disagrees with the file's declared directive. */
export interface EngineConflict extends EngineDirective {
  override: BuiltinEngine;
}

/**
 * Detect a conflict between what is *declared* (an in-file directive) and what
 * is *stored* (a remembered per-file override). Returns the located conflict
 * when both are present and differ, else `undefined`.
 */
export function engineConflict(
  dot: string,
  override: BuiltinEngine | undefined,
): EngineConflict | undefined {
  if (override === undefined) return undefined;
  const directive = findEngineDirective(dot);
  if (directive === undefined || directive.engine === override) return undefined;
  return { ...directive, override };
}

/** The ordered engine sources for a document; the first present one wins. */
export interface EngineSources {
  /** A remembered per-file user selection (highest precedence). */
  override?: BuiltinEngine;
  /** An in-file `// engine:` directive. */
  directive?: BuiltinEngine;
  /** The configured default engine (used when nothing else applies). */
  fallback: BuiltinEngine;
}

/** Layered resolution: remembered override → in-file directive → default. */
export function resolveEngine(sources: EngineSources): BuiltinEngine {
  return sources.override ?? sources.directive ?? sources.fallback;
}

/** Wrap a render result in a complete, theme-aware webview HTML document.
 * `cspSource` is the webview's `webview.cspSource` (its allowed asset origin). */
export function previewDocument(result: PreviewResult, cspSource: string): string {
  return htmlDocument(result.svg ?? errorMarkup(result.error), cspSource);
}

function errorMarkup(error: string | undefined): string {
  const message = escapeHtml(error ?? 'Failed to render graph.');
  return `<div class="error" role="alert">${message}</div>`;
}

function htmlDocument(body: string, cspSource: string): string {
  const csp = [
    "default-src 'none'",
    `style-src ${cspSource} 'unsafe-inline'`,
    `img-src ${cspSource} data:`,
  ].join('; ');
  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta http-equiv="Content-Security-Policy" content="${csp}">
<style>${STYLE}</style>
</head>
<body>${body}</body>
</html>`;
}

const STYLE = `
  body { margin: 0; padding: 16px; text-align: center;
    color: var(--vscode-editor-foreground);
    background: var(--vscode-editor-background); }
  svg { max-width: 100%; height: auto; }
  .error { display: inline-block; text-align: left; padding: 12px 16px;
    border-radius: 6px;
    border: 1px solid var(--vscode-inputValidation-errorBorder, #e5534b);
    background: var(--vscode-inputValidation-errorBackground, rgba(229,83,75,.1));
    color: var(--vscode-errorForeground, #e5534b);
    font-family: var(--vscode-editor-font-family, monospace); }
`;
