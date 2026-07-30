# Changelog

## 1.1.0

- **Raised the minimum supported VS Code version to 1.125.0** (was 1.85.0).
  Existing installs on older VS Code builds keep working, but they will no
  longer receive updates — upgrade VS Code to continue getting them. There is
  no functional change to the extension itself in this release; the bump aligns
  the declared engine with the `@types/vscode` version the extension builds
  against, and narrows the range of VS Code builds this extension is tested on.

## 1.0.1

- Fix a Marketplace publish failure caused by an invalid tag: the `@knowvah/dot-engine`
  keyword (a leftover from an engine rename) can't be a Marketplace tag because
  tags may not start with `@`. Replaced it with `svg`. No functional change.

## 1.0.0

First stable release.

- Syntax highlighting for Graphviz **DOT** (`.dot` / `.gv`) files.
- Live SVG **preview** (_Open Preview to the Side_, `Ctrl`/`Cmd`+`K` `V`),
  rendered in a worker thread with a configurable timeout so a pathological
  graph can never hang the editor.
- Per-file **layout-engine** selection (_Select Layout Engine_), an
  `// engine:` directive, and the `dot.preview.defaultEngine` setting.
- Renders ` ```dot ` fenced blocks in VS Code's built-in **Markdown preview**.
- Diagrams render **native black by default**; opt into theme-aware colors with
  `dot.preview.useCurrentColor`. Both settings apply live — no window reload.
- **No external Graphviz install** — powered by the pure-TypeScript
  `@knowvah/dot-engine`, bundled into the extension (no `dot` binary, no
  network).
