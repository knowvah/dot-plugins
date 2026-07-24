# dot-plugins

Render [Graphviz](https://graphviz.org/) **DOT** diagrams in static-site
generators, powered by the pure-TypeScript
[@knowvah/dot-engine](https://www.npmjs.com/package/@knowvah/dot-engine) — at build time
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

Versioning and publishing are driven by
[release-please](https://github.com/googleapis/release-please) (manifest mode)
from [Conventional Commits](https://www.conventionalcommits.org/). Commit and PR
titles determine each package's next version — see [CONTRIBUTING.md](CONTRIBUTING.md).

On push to `main`, `.github/workflows/release.yml` opens/updates a combined
**release PR** that bumps each changed package's version and CHANGELOG. Merging
that release PR creates per-package git tags + GitHub Releases, then publishes
the released packages to npm via **OIDC trusted publishing** — no `NPM_TOKEN`,
and provenance attestations are attached automatically. At publish time each
package is packed with `pnpm pack`, so the adapters' `workspace:*` dep on
`@knowvah/dot-core` is rewritten to the real version in the published tarball.

The `dot-vscode` extension is `private` (excluded from the npm release). It
publishes separately to the VS Code Marketplace / Open VSX via
`pnpm --filter dot-vscode package` → `vsce publish` / `ovsx publish`.
