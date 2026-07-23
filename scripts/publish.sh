#!/usr/bin/env bash
#
# Manually publish all public @knowvah/* npm packages from a dev machine.
#
# This is a FALLBACK for the initial publish or an out-of-band manual release.
# The canonical path is changesets + npm OIDC in .github/workflows/release.yml:
# push to main -> merge the "Version Packages" PR -> CI publishes with
# provenance. Prefer that flow; use this script only when you must publish
# locally (e.g. the very first publish before CI is wired to npm).
#
# Behaviour:
#   - Runs typecheck + tests, then builds every package (pnpm -r).
#   - Publishes with `pnpm -r publish`, which automatically SKIPS packages
#     marked "private": true (the vscode extension) and any version already
#     present on the registry — so re-running is safe/idempotent.
#   - No --provenance: attestations require CI OIDC and are added there.
#
# Usage:
#   scripts/publish.sh              # real publish
#   scripts/publish.sh --dry-run    # print what would publish, change nothing
#
set -euo pipefail

DRY_RUN=0
for arg in "$@"; do
  case "$arg" in
    --dry-run) DRY_RUN=1 ;;
    -h|--help) sed -n '2,20p' "$0"; exit 0 ;;
    *) echo "Unknown argument: $arg" >&2; exit 2 ;;
  esac
done

# Run from the repo root regardless of where the script is invoked.
ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT"

# Fail fast if not authenticated to npm.
if ! npm whoami >/dev/null 2>&1; then
  echo "Not logged in to npm. Run 'npm login' first." >&2
  exit 1
fi
echo "Publishing as npm user: $(npm whoami)"

echo "==> Installing dependencies (frozen lockfile)"
pnpm install --frozen-lockfile

# Build first: adapter packages resolve @knowvah/dot-core's types via its
# exports -> dist/*.d.ts. Typecheck before build fails on a clean checkout with
# "Cannot find module '@knowvah/dot-core'".
echo "==> Build"
pnpm -r build

echo "==> Typecheck + test"
GV_FONT_QUIET=1 GV_TEXT_MEASURER=estimate pnpm -r typecheck
GV_FONT_QUIET=1 GV_TEXT_MEASURER=estimate pnpm -r test

if [[ "$DRY_RUN" -eq 1 ]]; then
  echo "==> Dry run — no packages will be published:"
  # --dry-run asks the registry what would happen without uploading.
  pnpm -r publish --access public --no-git-checks --dry-run
  exit 0
fi

echo "==> Publishing public packages"
# pnpm skips private packages and versions already on the registry.
pnpm -r publish --access public --no-git-checks

echo "==> Done."
