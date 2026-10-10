// SPDX-License-Identifier: MIT
/**
 * Worker-thread entry: render one DOT string and post back a `DotSvgResult`.
 * Runs on a separate thread so a non-terminating graph can be killed by the
 * host via `worker.terminate()` (a synchronous loop on the main thread could
 * not be interrupted). Bundled to `dist/render-worker.js` by esbuild.
 */
import { parentPort } from 'node:worker_threads';
import { handleRenderRequest, type RenderRequest } from './render-request.js';

parentPort?.on('message', (req: RenderRequest) => {
  parentPort?.postMessage(handleRenderRequest(req));
});
