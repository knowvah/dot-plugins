# dot-plugins

Render [Graphviz](https://graphviz.org/) **DOT** diagrams in static-site
generators, powered by the pure-TypeScript
[graphviz-ts](https://www.npmjs.com/package/graphviz-ts) engine — at build time
(inline SVG, zero client JS) or client-side.

A pnpm workspace. The framework-agnostic render engine lives in one place;
each generator gets a thin adapter package.

| Package | Target | Status |
| --- | --- | --- |
| [`@knowvah/dot-core`](packages/core) | — (shared engine) | ✅ render + parse + browser |
| [`@knowvah/vitepress-plugin-dot`](packages/vitepress) | VitePress (markdown-it) | ✅ build-time SSR + client mode |
| [`@knowvah/eleventy-plugin-dot`](packages/eleventy) | Eleventy (markdown-it) | ✅ build mode |
| [`@knowvah/docusaurus-plugin-dot`](packages/docusaurus) | Docusaurus (MDX/remark) | ✅ client mode |

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
