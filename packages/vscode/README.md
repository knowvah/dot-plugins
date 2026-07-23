# DOT (Graphviz) Preview & Syntax — VS Code extension

Syntax highlighting and a **live SVG preview** for Graphviz **DOT** (`.dot` /
`.gv`) files, powered by the pure-TypeScript
[graphviz-ts](https://www.npmjs.com/package/graphviz-ts) engine (via
[`@knowvah/dot-core`](../core)). Rendering happens **in the extension host** —
no external Graphviz install, no `dot` binary on your PATH, no network.

## Features

- **Syntax highlighting** for `.dot` and `.gv` (a TextMate grammar for
  `source.dot`), plus comment/bracket editing behavior.
- **Live file preview** — `DOT: Open Preview to the Side` renders the active
  file to inline SVG in a webview beside the editor and re-renders as you type.
  Pick the layout engine per file with a leading line-comment directive, e.g.
  `// engine: neato` (see below); the panel title shows the active engine.
- **Markdown preview** — ` ```dot ` fenced code blocks render as inline SVG in
  VS Code's built-in Markdown preview (build-time, no client scripts). Per-block
  directives work: ` ```dot engine=neato `, ` ```dot no-render ` (leave as a
  highlighted code block).
- **Theme-aware** — diagrams inherit the editor's foreground color (black
  strokes/text are remapped to `currentColor`), so they read correctly in light
  and dark themes.

## Usage

Open a `.dot` or `.gv` file and either:

- click the **Open Preview to the Side** button in the editor title bar, or
- run **DOT: Open Preview to the Side** from the Command Palette, or
- press `Ctrl+K V` (`Cmd+K V` on macOS).

### Choosing a layout engine

There are three ways to set the engine, in **precedence order** (highest first):

1. **A remembered per-file selection.** Run **DOT: Select Layout Engine** (title
   bar, Command Palette) and pick from `dot`, `neato`, `fdp`, `sfdp`, `circo`,
   `twopi`, `osage`, `patchwork`. A non-default pick is remembered for that file
   (in workspace state) and reused whenever you preview it. Picking the engine
   the file would use anyway clears the remembered selection.
2. **An in-file directive** in a leading line comment (before the graph):

   ```dot
   // engine: neato
   digraph { a -> b; }
   ```

   `# engine = fdp` works too; the match is case-insensitive and must appear
   before the graph body (later comments are ignored).
3. **The `dot.preview.defaultEngine` setting** — used when a file has neither a
   remembered selection nor a directive.

The preview panel title shows the engine in use (e.g. `Preview graph.dot
(neato)`). `dot.preview.defaultEngine` also sets the default for ` ```dot `
blocks in the Markdown preview (a per-block ` engine=… ` still overrides it).

## Building from source

This package lives in the [`dot-plugins`](../..) pnpm workspace.

```bash
pnpm install
pnpm --filter dot-vscode build       # esbuild → dist/extension.js (bundled)
pnpm --filter dot-vscode typecheck
pnpm --filter dot-vscode test         # vitest — preview render unit tests
pnpm --filter dot-vscode package      # vsce → dot-vscode-<version>.vsix
```

`build` bundles the extension host (`dist/extension.js`) and the render worker
(`dist/render-worker.js`) with esbuild, inlining `@knowvah/dot-core` and
`graphviz-ts`, so the packaged `.vsix` ships with no `node_modules`. To debug,
open this folder in VS Code and press **F5** (Run Extension) after a `build`.

## Architecture

Pure, `vscode`-free modules keep the logic unit-testable: `src/preview.ts`
(engine directive + webview HTML wrapping) and `src/render-service.ts` (the
terminable worker pool). `src/render-worker.ts` is the worker-thread entry that
actually renders. `src/extension.ts` is the thin imperative shell — command,
webview panel, debounced document-change syncing. Grammar and language
association are declarative (`package.json` `contributes`).

The file preview renders in a **worker thread** with a timeout: a non-terminating
graph is killed via `worker.terminate()` and reported as a timeout, so it can't
freeze the extension host. Edits are debounced (200 ms) and stale renders are
dropped (latest edit wins).

## Settings

- **`dot.preview.defaultEngine`** (default `dot`) — the layout engine used when
  a file has no remembered selection and no `// engine:` directive; also the
  default for Markdown-preview ` ```dot ` blocks. See *Choosing a layout engine*.
- **`dot.preview.renderTimeoutSeconds`** (default `60`, min `1`) — how long the
  file preview waits for a render before aborting to a timeout message. Because
  rendering is off the main thread, this never freezes the editor; raise it for
  very large graphs, lower it if you want a runaway graph reported sooner. The
  value is read per render, so changes take effect immediately (no reload).

## Known limitations (v1)

- **Markdown preview renders synchronously.** markdown-it fence rules can't be
  async, so ` ```dot ` blocks in the Markdown preview render in-process on the
  extension host — a pathological non-terminating graph there could hang the
  preview (the standalone file preview is unaffected; it uses the worker above).
  graphviz-ts's documented infinite-loop cases are rare.
- **HTML labels in the Markdown preview.** VS Code's built-in Markdown preview
  sanitizes rendered HTML (DOMPurify). Standard SVG shapes and text render, but
  `<foreignObject>` — which Graphviz emits for HTML-like labels
  (`label=<<table>…>>`) — is stripped by the sanitizer, so those labels won't
  show *in the Markdown preview*. Plain (string-label) graphs are unaffected,
  and the standalone **file preview** renders HTML labels correctly (it's the
  extension's own webview, not subject to the Markdown preview sanitizer).

## Licensing

The extension code is **MIT** (see [LICENSE](LICENSE)). One bundled asset —
`syntaxes/dot.tmLanguage.json` (the `source.dot` TextMate grammar) — is reused
from graphviz-ts and is licensed **EPL-2.0**; it retains that license rather
than MIT. Both licenses permit redistribution; the marketplace listing notes
this rather than claiming a blanket MIT license.
