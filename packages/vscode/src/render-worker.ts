// SPDX-License-Identifier: MIT
/**
 * Worker-thread entry: render one DOT string and post back a `DotSvgResult`.
 * Runs on a separate thread so a non-terminating graph can be killed by the
 * host via `worker.terminate()` (a synchronous loop on the main thread could
 * not be interrupted). Bundled to `dist/render-worker.js` by esbuild.
 */
import { parentPort } from 'node:worker_threads';
import { renderDotSvg, resolveConfig, type ResolvedConfig } from '@knowvah/dot-core';
import type { EngineName } from '@knowvah/dot-engine';

// `useCurrentColor` remaps the diagram's black strokes/text to `currentColor`
// so it can follow the editor theme. It is off by default: Graphviz paints a
// white diagram background, so native black stays legible in every theme (with
// the remap on, a dark theme's near-white foreground would vanish on white).
// The caller (preview-manager) passes the setting per render; cache both
// resolved configs so we build each at most once.
const configCache = new Map<boolean, ResolvedConfig>();
function configFor(useCurrentColor: boolean): ResolvedConfig {
  let config = configCache.get(useCurrentColor);
  if (config === undefined) {
    config = resolveConfig({ useCurrentColor });
    configCache.set(useCurrentColor, config);
  }
  return config;
}

parentPort?.on(
  'message',
  (req: { dot: string; engine: string; useCurrentColor?: boolean }) => {
    const config = configFor(req.useCurrentColor ?? false);
    parentPort?.postMessage(renderDotSvg(req.dot, req.engine as EngineName, config));
  },
);
