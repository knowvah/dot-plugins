// SPDX-License-Identifier: MIT
/**
 * Terminable DOT rendering. Each `render` runs in a fresh worker thread with a
 * timeout; a graph that fails to terminate is killed via `worker.terminate()`
 * and reported as a timeout instead of hanging the extension host. No `vscode`
 * dependency (the worker path is injected), so it is unit-testable with a
 * fixture worker.
 */
import { Worker } from 'node:worker_threads';
import type { PreviewResult } from './preview.js';

export interface RenderRequest {
  dot: string;
  engine: string;
}

// Shape the worker posts back (a dot-core DotSvgResult; error is GvError-like).
interface WorkerResult {
  svg?: string;
  error?: { friendlyMessage?: string; location?: { line: number; column: number } };
}

export class DotRenderService {
  private readonly active = new Set<Worker>();

  constructor(
    private readonly workerPath: string | URL,
    private readonly timeoutMs = 5000,
  ) {}

  /** Render a request, resolving with inline SVG or an error message. Never
   * rejects and never hangs longer than `timeoutMs`. */
  render(req: RenderRequest): Promise<PreviewResult> {
    const worker = new Worker(this.workerPath);
    this.active.add(worker);
    return new Promise<PreviewResult>((resolve) => {
      let settled = false;
      const finish = (result: PreviewResult): void => {
        if (settled) return;
        settled = true;
        clearTimeout(timer);
        this.terminate(worker);
        resolve(result);
      };
      const timer = setTimeout(
        () => finish({ error: `Render timed out after ${this.timeoutMs} ms.` }),
        this.timeoutMs,
      );
      worker.once('message', (r: WorkerResult) => finish(toPreview(r)));
      worker.once('error', (e: Error) => finish({ error: e.message }));
      worker.postMessage(req);
    });
  }

  /** Terminate any in-flight workers (call on extension deactivate). */
  disposeAll(): void {
    for (const worker of this.active) void worker.terminate();
    this.active.clear();
  }

  private terminate(worker: Worker): void {
    this.active.delete(worker);
    void worker.terminate();
  }
}

function toPreview(result: WorkerResult): PreviewResult {
  if (result.svg !== undefined) return { svg: result.svg };
  const loc = result.error?.location;
  const at = loc ? ` (line ${loc.line}, column ${loc.column})` : '';
  return { error: `${result.error?.friendlyMessage ?? 'Failed to render graph.'}${at}` };
}
