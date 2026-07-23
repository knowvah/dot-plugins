# DOT (Graphviz) Preview & Syntax — VS Code extension

Syntax highlighting and a **live SVG preview** for Graphviz **DOT** (`.dot` /
`.gv`) files, powered by the pure-TypeScript
[graphviz-ts](https://www.npmjs.com/package/graphviz-ts) engine (via
[`@knowvah/dot-core`](../core)). Rendering happens **in the extension host** —
no external Graphviz install, no `dot` binary on your PATH, no network.

## Features

- **Syntax highlighting** for `.dot` and `.gv` (a TextMate grammar for
  `source.dot`), plus comment/bracket editing behavior.
- **Live preview** — `DOT: Open Preview to the Side` renders the active file to
  inline SVG in a webview beside the editor and re-renders as you type.
- **Theme-aware** — diagrams inherit the editor's foreground color (black
  strokes/text are remapped to `currentColor`), so they read correctly in light
  and dark themes.

## Usage

Open a `.dot` or `.gv` file and either:

- click the **Open Preview to the Side** button in the editor title bar, or
- run **DOT: Open Preview to the Side** from the Command Palette, or
- press `Ctrl+K V` (`Cmd+K V` on macOS).

## Building from source

This package lives in the [`dot-plugins`](../..) pnpm workspace.

```bash
pnpm install
pnpm --filter dot-vscode build       # esbuild → dist/extension.js (bundled)
pnpm --filter dot-vscode typecheck
pnpm --filter dot-vscode test         # vitest — preview render unit tests
pnpm --filter dot-vscode package      # vsce → dot-vscode-<version>.vsix
```

`build` bundles the extension host with esbuild, inlining `@knowvah/dot-core`
and `graphviz-ts` into a single CJS file, so the packaged `.vsix` ships with no
`node_modules`. To debug, open this folder in VS Code and press **F5** (Run
Extension) after a `build`.

## Architecture

The render logic is a pure, `vscode`-free module (`src/preview.ts`): DOT string
→ complete webview HTML (inline SVG or an error panel), which makes it unit
testable in isolation. `src/extension.ts` is the thin imperative shell — it owns
the command, the webview panel, and document-change syncing. Grammar and
language association are declarative (`package.json` `contributes`).

## Known limitations (v1)

- **Synchronous, in-process render.** A pathological non-terminating graph could
  hang the extension host until the window is reloaded. graphviz-ts's own
  documented infinite-loop cases are rare; a future version can move rendering
  to a terminable worker with a timeout.
- **No per-file engine selection yet** — the preview always uses the `dot`
  layout engine. (`neato`/`fdp`/`circo`/… support is a natural follow-up.)
- Markdown-preview support for ` ```dot ` fenced blocks is a separate,
  planned feature (it reuses `@knowvah/dot-markdown-it`).

## Licensing

The extension code is **MIT** (see [LICENSE](LICENSE)). One bundled asset —
`syntaxes/dot.tmLanguage.json` (the `source.dot` TextMate grammar) — is reused
from graphviz-ts and is licensed **EPL-2.0**; it retains that license rather
than MIT. Both licenses permit redistribution; the marketplace listing notes
this rather than claiming a blanket MIT license.
