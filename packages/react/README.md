# @knowvah/dot-react

A React **`<DotDiagram>`** component that renders Graphviz **DOT** to SVG in the
browser, powered by the pure-TypeScript
[graphviz-ts](https://www.npmjs.com/package/graphviz-ts) engine (via the shared
[`@knowvah/dot-core`](../core)). Use it in any React app — Next.js, Vite,
Docusaurus, etc.

## Install

```bash
npm i @knowvah/dot-react graphviz-ts
```

`react` and `graphviz-ts` are peer dependencies.

## Usage

```tsx
import { DotDiagram } from '@knowvah/dot-react';
import '@knowvah/dot-react/style.css';

export function Example() {
  return (
    <DotDiagram
      dot={`
        digraph {
          rankdir=LR;
          parse -> layout -> render;
        }
      `}
      engine="dot"
      useCurrentColor
    />
  );
}
```

graphviz-ts is loaded lazily on first render. The component renders an empty
wrapper on the server and fills in the SVG on mount (client-side).

## Props (`DotDiagramProps`)

| Prop | Type | Default | |
| --- | --- | --- | --- |
| `dot` | `string` | — | Raw DOT source (required). |
| `engine` | `string` | `"dot"` | `dot` · `neato` · `fdp` · `sfdp` · `circo` · `twopi` · `osage` · `patchwork`. |
| `wrapperClass` | `string` | `"dot-diagram"` | Wrapper class (error panel: `<class>-error`). |
| `useCurrentColor` | `boolean` | `false` | Remap black → `currentColor` for theme-aware diagrams. |

## License

MIT © Knowvah
