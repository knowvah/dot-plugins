# Changelog

## [2.0.0](https://github.com/knowvah/dot-plugins/compare/dot-markdown-it-v1.1.0...dot-markdown-it-v2.0.0) (2026-08-01)


### ⚠ BREAKING CHANGES

* consumers on Node 18 or 20 will now see an engine warning on install, and a failure under engine-strict.

### Miscellaneous Chores

* raise node engines floor to 22, pin pnpm at 10.34.5 ([#21](https://github.com/knowvah/dot-plugins/issues/21)) ([0963ee1](https://github.com/knowvah/dot-plugins/commit/0963ee103ec7624f0ca1d48e9c5f3a5db66acc09))

## [1.1.0](https://github.com/knowvah/dot-plugins/compare/dot-markdown-it-v1.0.0...dot-markdown-it-v1.1.0) (2026-07-25)


### Features

* **markdown-it:** add lazy resolveDefaultEngine/resolveUseCurrentColor ([df022df](https://github.com/knowvah/dot-plugins/commit/df022dfcfa49b565d0e648ffacb52efbdf30487c))


### Bug Fixes

* **vscode:** native-black preview + live-configurable engine/color ([3f3b3d4](https://github.com/knowvah/dot-plugins/commit/3f3b3d4fc10742bcaa4140283c3d5c386d758ae3))

## [1.0.0](https://github.com/knowvah/dot-plugins/compare/dot-markdown-it-v0.1.0...dot-markdown-it-v1.0.0) (2026-07-24)


### Features

* declare stable 1.0 public API ([42e6d4e](https://github.com/knowvah/dot-plugins/commit/42e6d4eea7c0550ea2c3e46350064a8765712996))
* depend on @knowvah/dot-engine 1.x as render engine ([564a6a7](https://github.com/knowvah/dot-plugins/commit/564a6a7f28f150d772fb5fe3c70e39fc603407aa))
