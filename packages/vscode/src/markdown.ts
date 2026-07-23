// SPDX-License-Identifier: MIT
/**
 * Markdown-preview integration: contributes a markdown-it plugin so ` ```dot `
 * fenced code blocks render as inline SVG in VS Code's built-in Markdown
 * preview. Reuses `@knowvah/dot-markdown-it` in build mode (synchronous, no
 * client scripts — the preview runs no extension JS).
 *
 * No `vscode` dependency, so it is unit-testable with a plain markdown-it
 * instance; `extension.ts` returns `{ extendMarkdownIt }` from `activate()`.
 */
import type MarkdownIt from 'markdown-it';
import { dotMarkdown, type ClientEmitter } from '@knowvah/dot-markdown-it';
import { renderDotHtml } from '@knowvah/dot-core';

// The Markdown preview has no client runtime, so a `client`-directive fence
// can't hydrate a <dot-diagram> element (and the sanitizer would strip it
// anyway). Render every block to inline SVG at preview time instead.
const renderInline: ClientEmitter = (dot, engine, cfg) =>
  renderDotHtml(dot, engine, cfg);

/** VS Code's `extendMarkdownIt` contribution: install the DOT fence renderer.
 * `defaultEngine` is the engine for blocks without an ` engine=… ` directive. */
export function extendMarkdownIt(md: MarkdownIt, defaultEngine = 'dot'): MarkdownIt {
  return md.use(dotMarkdown, {
    useCurrentColor: true,
    defaultEngine,
    emitClient: renderInline,
  });
}
