import { describe, it, expect } from 'vitest';
import { handleRenderRequest } from './render-request.js';

const DOT = 'digraph { a -> b }';

describe('handleRenderRequest (render worker core)', () => {
  it('renders valid DOT to inline SVG', () => {
    const result = handleRenderRequest({ dot: DOT, engine: 'dot' });
    expect(result.error).toBeUndefined();
    expect(result.svg).toContain('<svg');
    expect(result.svg).not.toContain('<?xml');
  });

  it('keeps native black unless currentColor is requested', () => {
    const native = handleRenderRequest({ dot: DOT, engine: 'dot' });
    const themed = handleRenderRequest({
      dot: DOT,
      engine: 'dot',
      useCurrentColor: true,
    });
    expect(native.svg).toContain('stroke="black"');
    expect(themed.svg).toContain('currentColor');
    expect(themed.svg).not.toContain('stroke="black"');
  });

  it('returns invalid DOT as an error with its location', () => {
    const result = handleRenderRequest({ dot: 'digraph {\n a ->\n', engine: 'dot' });
    expect(result.svg).toBeUndefined();
    expect(result.error?.friendlyMessage).toBeTruthy();
    expect(result.error?.location).toMatchObject({ line: expect.any(Number) });
  });

  it('returns an unregistered engine as an error instead of throwing', () => {
    // dot-engine 2.x throws a TypeError for this; the worker must answer,
    // not die (the host would only see a generic worker error).
    const result = handleRenderRequest({ dot: DOT, engine: 'foo' });
    expect(result.svg).toBeUndefined();
    expect(result.error?.friendlyMessage).toContain(
      'The argument "engine" is invalid',
    );
  });

  it('returns an unsupported Graphviz feature as an error', () => {
    const result = handleRenderRequest({
      dot: 'graph { mode=hier; a -- b }',
      engine: 'neato',
    });
    expect(result.svg).toBeUndefined();
    expect(result.error?.code).toBe('UNSUPPORTED_FEATURE');
  });

  it('produces a structured-clone-safe result for postMessage', () => {
    const result = handleRenderRequest({ dot: DOT, engine: 'foo' });
    expect(structuredClone(result)).toEqual(result);
  });
});
