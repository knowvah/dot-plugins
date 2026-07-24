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

// `useCurrentColor` → diagrams inherit the editor foreground in any theme.
const CONFIG: ResolvedConfig = resolveConfig({ useCurrentColor: true });

parentPort?.on('message', (req: { dot: string; engine: string }) => {
  parentPort?.postMessage(renderDotSvg(req.dot, req.engine as EngineName, CONFIG));
});
