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
import type { MarkdownIt } from 'markdown-it';
import { dotMarkdown, type ClientEmitter } from '@knowvah/dot-markdown-it';
import { renderDotHtml } from '@knowvah/dot-core';

// The Markdown preview has no client runtime, so a `client`-directive fence
// can't hydrate a <dot-diagram> element (and the sanitizer would strip it
// anyway). Render every block to inline SVG at preview time instead.
const renderInline: ClientEmitter = (dot, engine, cfg) =>
  renderDotHtml(dot, engine, cfg);

/**
 * VS Code's `extendMarkdownIt` contribution: install the DOT fence renderer.
 *
 * VS Code caches the Markdown preview's markdown-it instance and rebuilds it
 * only on window reload, so it calls this once. The settings are therefore
 * passed as *resolvers* the fence rule calls per render (not captured values),
 * so a changed `dot.preview.defaultEngine` / `dot.preview.useCurrentColor` is
 * observed on the next preview render — no reload needed.
 *
 * `resolveDefaultEngine` supplies the engine for blocks without an ` engine=… `
 * directive; `resolveUseCurrentColor` toggles the theme-aware black→currentColor
 * remap (off by default so diagrams render native black on Graphviz's white
 * canvas). Defaults keep the function usable in plain unit tests.
 */
export function extendMarkdownIt(
  md: MarkdownIt,
  resolveDefaultEngine: () => string = () => 'dot',
  resolveUseCurrentColor: () => boolean = () => false,
): MarkdownIt {
  return md.use(dotMarkdown, {
    resolveDefaultEngine,
    resolveUseCurrentColor,
    emitClient: renderInline,
  });
}
