# @knowvah/dot-react

A React **`<DotDiagram>`** component that renders Graphviz **DOT** to SVG in the
browser, powered by the pure-TypeScript
[@knowvah/dot-engine](https://www.npmjs.com/package/@knowvah/dot-engine) (via the shared
[`@knowvah/dot-core`](../core)). Use it in any React app — Next.js, Vite,
Docusaurus, etc.

## Install

```bash
npm i @knowvah/dot-react @knowvah/dot-engine
```

`react` and `@knowvah/dot-engine` are peer dependencies.

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

@knowvah/dot-engine is loaded lazily on first render. The component renders an empty
wrapper on the server and fills in the SVG on mount (client-side).

## Props (`DotDiagramProps`)

| Prop | Type | Default | |
| --- | --- | --- | --- |
| `dot` | `string` | — | Raw DOT source (required). |
| `engine` | `string` | `"dot"` | `dot` · `neato` · `fdp` · `sfdp` · `circo` · `twopi` · `osage` · `patchwork`. |
| `wrapperClass` | `string` | `"dot-diagram"` | Wrapper class (error panel: `<class>-error`). |
| `useCurrentColor` | `boolean` | `false` | Remap black → `currentColor` for theme-aware diagrams. |

## Stability

As of **1.0**, this package follows [semantic versioning](https://semver.org/):
the documented public API is stable, and breaking changes will bump the major
version.

## License

MIT © Knowvah
