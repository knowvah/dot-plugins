# @knowvah/dot-core

The framework-agnostic **Graphviz DOT → SVG** render engine that powers the
`@knowvah/*-plugin-dot` adapters (VitePress, Eleventy, Docusaurus). Pure
TypeScript, powered by [graphviz-ts](https://www.npmjs.com/package/graphviz-ts).

You usually consume one of the adapters, not this package directly — but it's
public so you can build your own adapter for any generator.

## Install

```bash
npm i @knowvah/dot-core graphviz-ts
```

`graphviz-ts` is a peer dependency.

## Entry points

| Import | Environment | Exports |
| --- | --- | --- |
| `@knowvah/dot-core` | Node / build | `renderDotHtml`, `resolveConfig`, `parseFenceInfo`, `escapeHtml`, `toInlineSvg`, `currentColorRemap`, types |
| `@knowvah/dot-core/browser` | browser | `renderDiagram` (async DOT → `{ svg }` \| `{ error }`) |
| `@knowvah/dot-core/element` | browser | `<dot-diagram>` custom element + `defineDotDiagram()` |

## Build-time render (Node)

```ts
import { renderDotHtml, resolveConfig } from '@knowvah/dot-core';

const cfg = resolveConfig({ useCurrentColor: true });
const html = renderDotHtml('digraph { a -> b }', 'dot', cfg);
// -> '<div class="dot-diagram"><svg …></svg></div>'  (or an error panel)
```

`renderDotHtml` strips the standalone-SVG prolog for valid inline embedding and,
when `resolveConfig({ timeout })` is set, renders in a child process so a
pathological graph aborts to an error panel instead of hanging the build.

## Client-side render (browser)

```ts
import { renderDiagram } from '@knowvah/dot-core/browser';
const { svg, error } = await renderDiagram('digraph { a -> b }', 'dot', false);
```

Or drop in the framework-neutral custom element:

```js
import { defineDotDiagram } from '@knowvah/dot-core/element';
defineDotDiagram(); // registers <dot-diagram>
```
```html
<dot-diagram graph="digraph%20%7B%20a%20-%3E%20b%20%7D" use-current-color></dot-diagram>
```

## Options (`DotPluginOptions`)

`renderLanguage`, `mode` (`build` | `client`), `defaultEngine`, `wrapperClass`,
`timeout` (ms; build-mode child-process safe-mode), `onError` (`panel` |
`throw`), `useCurrentColor`. `parseFenceInfo` reads per-block overrides from a
fence info-string (`engine=neato`, `no-render`, `client` / `build`).

## License

MIT © Knowvah
