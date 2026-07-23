// SPDX-License-Identifier: MIT
/**
 * Pure preview rendering: a DOT string → a complete, theme-aware webview HTML
 * document (inline SVG on success, a readable error panel on failure). No
 * `vscode` dependency, so it is unit-testable in isolation — `extension.ts`
 * supplies the webview's `cspSource` and hosts the result.
 */
import {
  renderDotSvg,
  resolveConfig,
  escapeHtml,
  type ResolvedConfig,
} from '@knowvah/dot-core';
import type { BuiltinEngine, GvError } from 'graphviz-ts';

// `useCurrentColor` remaps graphviz's black strokes/text to `currentColor`, so
// the diagram inherits the editor foreground in any theme (light or dark).
const CONFIG: ResolvedConfig = resolveConfig({ useCurrentColor: true });

// The built-in layout engines (graphviz-ts throws on any other name, so a stray
// comment match must be validated against this set before it is used).
const BUILTIN_ENGINES: readonly BuiltinEngine[] = [
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

/**
 * Pick the layout engine for a document from an optional directive in its
 * leading line comments (`// engine: neato`). Scanning stops at the first line
 * of graph content, so only a header comment counts. Unknown or absent → `dot`.
 */
export function resolveEngine(dot: string): BuiltinEngine {
  for (const raw of dot.split('\n')) {
    const line = raw.trim();
    if (line === '') continue;
    if (!isLineComment(line)) break; // reached the graph body
    const match = ENGINE_DIRECTIVE.exec(line);
    if (match !== null) {
      const name = match[1].toLowerCase() as BuiltinEngine;
      if (BUILTIN_ENGINES.includes(name)) return name;
    }
  }
  return 'dot';
}

/**
 * Render DOT to a full webview HTML document.
 * @param dot - the document's DOT source
 * @param cspSource - the webview's `webview.cspSource` (its allowed asset origin)
 */
export function renderPreviewHtml(dot: string, cspSource: string): string {
  const { svg, error } = renderDotSvg(dot, resolveEngine(dot), CONFIG);
  return htmlDocument(svg ?? errorMarkup(error), cspSource);
}

function errorMarkup(error: GvError | undefined): string {
  const message = escapeHtml(error?.friendlyMessage ?? 'Failed to render graph.');
  const at = error?.location
    ? ` <span class="loc">(line ${error.location.line}, column ${error.location.column})</span>`
    : '';
  return `<div class="error" role="alert">${message}${at}</div>`;
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
  .error .loc { opacity: .8; }
`;
