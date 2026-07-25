# Changelog

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
