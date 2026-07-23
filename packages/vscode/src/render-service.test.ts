import { describe, it, expect, afterEach } from 'vitest';
import { DotRenderService } from './render-service.js';

const WORKER = new URL('./fixtures/echo-worker.mjs', import.meta.url);

let svc: DotRenderService | undefined;
afterEach(() => svc?.disposeAll());

describe('DotRenderService', () => {
  it('resolves with the worker SVG for a normal render', async () => {
    svc = new DotRenderService(WORKER, 2000);
    const result = await svc.render({ dot: 'digraph{}', engine: 'neato' });
    expect(result.svg).toContain('data-engine="neato"');
    expect(result.error).toBeUndefined();
  });

  it('maps a worker error result to a message with the location', async () => {
    svc = new DotRenderService(WORKER, 2000);
    const result = await svc.render({ dot: 'ERR', engine: 'dot' });
    expect(result.svg).toBeUndefined();
    expect(result.error).toContain('bad graph');
    expect(result.error).toContain('line 2, column 3');
  });

  it('terminates a non-terminating render and reports a timeout', async () => {
    svc = new DotRenderService(WORKER, 100);
    const result = await svc.render({ dot: 'HANG', engine: 'dot' });
    expect(result.svg).toBeUndefined();
    expect(result.error).toMatch(/timed out/i);
  });

  it('reads a getter timeout per render (live-configurable)', async () => {
    let ms = 5000;
    svc = new DotRenderService(WORKER, () => ms);
    ms = 100; // change before rendering — the getter must pick this up
    const result = await svc.render({ dot: 'HANG', engine: 'dot' });
    expect(result.error).toContain('100 ms');
  });
});
