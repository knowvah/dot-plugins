# dot-plugins

Render [Graphviz](https://graphviz.org/) **DOT** diagrams in static-site
generators, powered by the pure-TypeScript
[graphviz-ts](https://www.npmjs.com/package/graphviz-ts) engine — at build time
(inline SVG, zero client JS) or client-side.

A pnpm workspace. The framework-agnostic render engine lives in one place;
each generator gets a thin adapter package.

| Package | Target | Status |
| --- | --- | --- |
| [`@knowvah/vitepress-plugin-dot`](packages/vitepress) | VitePress (markdown-it) | ✅ build-time SSR + client mode |
| `@knowvah/dot-core` | — (shared engine) | planned |
| `@knowvah/eleventy-plugin-dot` | Eleventy (markdown-it) | planned |
| `@knowvah/docusaurus-plugin-dot` | Docusaurus (MDX/remark) | planned |

## Develop

```bash
pnpm install
pnpm -r build      # build every package
pnpm -r test       # test every package
pnpm -r typecheck
```
