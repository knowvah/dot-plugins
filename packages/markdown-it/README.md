# @knowvah/dot-markdown-it

The shared [markdown-it](https://github.com/markdown-it/markdown-it) plugin
behind [`@knowvah/vitepress-plugin-dot`](../vitepress) and
[`@knowvah/eleventy-plugin-dot`](../eleventy). It renders Graphviz **DOT** fenced
code blocks to inline SVG at build time (via [`@knowvah/dot-core`](../core)), or
to a client-side placeholder.

Use this directly only if you're wiring markdown-it yourself; otherwise use one
of the adapter packages.

## Install

```bash
npm i @knowvah/dot-markdown-it @knowvah/dot-engine
```

## Usage

```ts
import MarkdownIt from 'markdown-it';
import { dotMarkdown } from '@knowvah/dot-markdown-it';

const md = new MarkdownIt();
dotMarkdown(md, { useCurrentColor: true });

md.render('```dot\ndigraph { a -> b }\n```'); // -> <div class="dot-diagram"><svg…>
```

- **Build mode** (default): renders inline SVG.
- **Client mode** (` ```dot client `, or `{ mode: 'client' }`): emits a
  placeholder. By default that's the framework-neutral `<dot-diagram>` custom
  element — register it in the browser with
  [`@knowvah/dot-core/element`](../core)'s `defineDotDiagram()`. Adapters can
  supply their own `emitClient` to emit a Vue/React component instead.
- **Non-DOT** and ` ```dot no-render ` blocks delegate to the host's existing
  fence rule (e.g. syntax highlighting).

## API

| Export | |
| --- | --- |
| `dotMarkdown(md, options?)` | Install the fence renderer. `options` is `DotMarkdownOptions` (all of `@knowvah/dot-core`'s `DotPluginOptions` plus `emitClient`). |
| `emitDotDiagramElement(dot, engine, cfg)` | The default `<dot-diagram>` client emitter. |
| `parseFenceInfo` | Re-exported from `@knowvah/dot-core`. |

## Stability

As of **1.0**, this package follows [semantic versioning](https://semver.org/):
the documented public API is stable, and breaking changes will bump the major
version.

## License

MIT © Knowvah
