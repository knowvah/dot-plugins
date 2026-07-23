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
| `@knowvah/dot-core` | Node / build | `renderDotHtml`, `resolveConfig`, `parseFenceInfo`, `normalizeEngine`, `escapeHtml`, `toInlineSvg`, `currentColorRemap`, types |
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

The `graph` attribute is **URI-encoded** DOT source, `engine` picks the layout
engine, `wrapper-class` overrides the CSS class, and the boolean
`use-current-color` remaps black → `currentColor`.

### Angular (and any framework with custom-element support)

`<dot-diagram>` works anywhere custom elements do — Angular, Svelte, Solid,
plain HTML. In Angular, register it once and allow the tag with
`CUSTOM_ELEMENTS_SCHEMA`:

```ts
import { Component, CUSTOM_ELEMENTS_SCHEMA } from '@angular/core';
import { defineDotDiagram } from '@knowvah/dot-core/element';

defineDotDiagram(); // registers <dot-diagram> once

@Component({
  standalone: true,
  schemas: [CUSTOM_ELEMENTS_SCHEMA],
  template: `<dot-diagram [attr.graph]="encodedDot" engine="dot"></dot-diagram>`,
})
export class DiagramComponent {
  // Encode so any DOT source (spaces, %, quotes) survives the attribute.
  readonly encodedDot = encodeURIComponent('digraph { a -> b }');
}
```

Import `@knowvah/dot-core`'s `.dot-diagram` styles (or your own) for
overflow/centering.

**One-shot render:** the element renders once when it connects to the DOM and
does not observe later attribute changes. For a graph that changes at runtime,
have Angular destroy and recreate the element when the source changes — e.g.
gate it behind `@if` (or `*ngIf`) and toggle, or key it in an `@for`/`*ngFor`
whose `trackBy` returns the DOT string — rather than mutating `graph` in place.

## Options (`DotPluginOptions`)

`renderLanguage`, `mode` (`build` | `client`), `defaultEngine`, `wrapperClass`,
`timeout` (ms; build-mode child-process safe-mode), `onError` (`panel` |
`throw`), `useCurrentColor`. `parseFenceInfo` reads per-block overrides from a
fence info-string (`engine=neato`, `no-render`, `client` / `build`).

**Engine names are case-insensitive.** They are normalized (trimmed +
lowercased) at every entry point — `parseFenceInfo`, `resolveConfig`, and both
render functions — so `engine=Neato`, `NEATO`, and `neato` are equivalent
wherever an engine is accepted. `normalizeEngine(name)` is exported for reuse.

## License

MIT © Knowvah
