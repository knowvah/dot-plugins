# dot-plugins

Render [Graphviz](https://graphviz.org/) **DOT** diagrams in static-site
generators, powered by the pure-TypeScript
[graphviz-ts](https://www.npmjs.com/package/graphviz-ts) engine — at build time
(inline SVG, zero client JS) or client-side.

A pnpm workspace. The framework-agnostic render engine lives in one place;
each generator gets a thin adapter package, and app frameworks get a component.

| Package | Target | Status |
| --- | --- | --- |
| [`@knowvah/dot-core`](packages/core) | — (shared engine + `<dot-diagram>` web component) | ✅ render + parse + browser + element |
| [`@knowvah/vitepress-plugin-dot`](packages/vitepress) | VitePress (markdown-it) | ✅ build-time SSR + client mode |
| [`@knowvah/eleventy-plugin-dot`](packages/eleventy) | Eleventy (markdown-it) | ✅ build mode + client |
| [`@knowvah/docusaurus-plugin-dot`](packages/docusaurus) | Docusaurus (MDX/remark) | ✅ build-time SSR + client mode |
| [`@knowvah/dot-markdown-it`](packages/markdown-it) | any markdown-it host | ✅ build + client |
| [`@knowvah/dot-react`](packages/react) | React apps (`<DotDiagram>`) | ✅ client component |
| [`dot-vscode`](packages/vscode) | VS Code editor | ✅ `.dot`/`.gv` syntax + live preview |

**Angular · Svelte · Solid · plain HTML:** use the framework-neutral
`<dot-diagram>` web component from `@knowvah/dot-core/element` — no dedicated
package needed. See the [core README](packages/core#angular-and-any-framework-with-custom-element-support).

## Develop

```bash
pnpm install
pnpm -r build      # build every package
pnpm -r test       # test every package
pnpm -r typecheck
```

## Releasing

Versioning and publishing use [Changesets](https://github.com/changesets/changesets).

```bash
pnpm changeset          # describe a change (pick packages + bump type)
```

On push to `main`, `.github/workflows/release.yml` opens/updates a
"Version Packages" PR that applies the changesets (bumping versions + changelogs);
merging it publishes the changed packages to npm. Requires a free `knowvah` npm
org and the repo secret `NPM_TOKEN` (an npm automation token). `@knowvah/dot-core`
publishes first; the adapters' `workspace:*` dep on it is rewritten to the real
version at publish time.

The `dot-vscode` extension is `private` (excluded from the npm release). It
publishes separately to the VS Code Marketplace / Open VSX via
`pnpm --filter dot-vscode package` → `vsce publish` / `ovsx publish`.
