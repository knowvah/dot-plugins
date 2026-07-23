// SPDX-License-Identifier: MIT
// Test fixture worker for DotRenderService — no graphviz. Echoes a canned
// result, emits a worker error result, or loops forever, to exercise the
// service's success / error / timeout+terminate paths deterministically.
import { parentPort } from 'node:worker_threads';

parentPort.on('message', (req) => {
  if (req.dot === 'HANG') {
    // Non-terminating: the service must terminate this thread on timeout.
    for (;;) {
      /* spin */
    }
  }
  if (req.dot === 'ERR') {
    parentPort.postMessage({
      error: { friendlyMessage: 'bad graph', location: { line: 2, column: 3 } },
    });
    return;
  }
  parentPort.postMessage({ svg: `<svg data-engine="${req.engine}"></svg>` });
});
