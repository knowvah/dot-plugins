# Contributing

Thanks for helping improve **dot-plugins**. This is a pnpm workspace; the
framework-agnostic render engine lives in `@knowvah/dot-core` and each generator
gets a thin adapter package.

## Local development

```bash
pnpm install
pnpm -r build      # build every package (do this first — see below)
pnpm -r test       # test every package
pnpm -r typecheck
```

Build before typecheck/test: the adapter packages resolve `@knowvah/dot-core`'s
types through its `exports` → `dist/*.d.ts`, which do not exist on a clean
checkout. Typechecking first fails with `Cannot find module '@knowvah/dot-core'`.

## Conventional Commits are required

Versions are computed from commit history, so every commit (and every squash-PR
title) **must** follow [Conventional Commits](https://www.conventionalcommits.org/):

```
<type>(<optional scope>): <description>
```

Allowed types: `feat`, `fix`, `chore`, `docs`, `refactor`, `test`, `ci`,
`perf`, `style`.

How the type maps to a version bump (per package, once past 1.0):

| Commit | Bump |
| --- | --- |
| `fix: …` | patch (`1.0.0` → `1.0.1`) |
| `feat: …` | minor (`1.0.0` → `1.1.0`) |
| `feat!: …` or a `BREAKING CHANGE:` footer | major (`1.0.0` → `2.0.0`) |
| `chore` / `docs` / `ci` / `refactor` / `test` / `style` / `perf` | no release |

release-please attributes a commit to a package by the file paths it touches, so
scope your changes to the package(s) they affect.

## How a release happens

Releases are automated — you never bump a version or publish by hand:

1. Land Conventional-Commit PRs on `main`.
2. [release-please](https://github.com/googleapis/release-please) maintains a
   single open **release PR** that bumps each changed package's version and
   CHANGELOG.
3. A maintainer merges the release PR. That cuts per-package git tags + GitHub
   Releases and publishes to npm via OIDC trusted publishing (no `NPM_TOKEN`;
   provenance is automatic). `workspace:*` deps are rewritten to real versions
   at publish time.

`dot-vscode` is `private` and excluded from the npm release; it ships to the VS
Code Marketplace / Open VSX separately.

## Post-1.0 maintenance note

The six `"release-as": "1.0.0"` lines in `release-please-config.json` are a
one-time bootstrap that pins the first release to 1.0.0. **After the 1.0.0
release publishes, remove them in a follow-up PR** so subsequent versions are
computed from commit history again.
