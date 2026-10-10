// @vitest-environment jsdom
import { describe, it, expect, vi } from 'vitest';
import type { DiagramState } from './browser.js';

interface Deferred {
  dot: string;
  resolve: (state: DiagramState) => void;
}

const pending: Deferred[] = vi.hoisted(() => []);

// Each renderDiagram call stays pending until the test resolves it, so the
// test controls the order in which concurrent renders finish.
vi.mock('./browser.js', () => ({
  renderDiagram: (dot: string): Promise<DiagramState> =>
    new Promise((resolve) => pending.push({ dot, resolve })),
}));

const { defineDotDiagram } = await import('./element.js');

function mount(dot: string): HTMLElement {
  defineDotDiagram();
  const el = document.createElement('dot-diagram');
  el.setAttribute('graph', encodeURIComponent(dot));
  document.body.appendChild(el);
  return el;
}

function resolveRender(dot: string, state: DiagramState): void {
  const entry = pending.find((p) => p.dot === dot);
  if (entry === undefined) throw new Error(`no pending render for ${dot}`);
  entry.resolve(state);
}

const tick = (): Promise<void> => new Promise((r) => setTimeout(r, 0));

describe('<dot-diagram> with a slow async render', () => {
  it('ignores a render that finishes after the element was disconnected', async () => {
    const el = mount('digraph { slow }');
    el.remove();
    resolveRender('digraph { slow }', { svg: '<svg id="late"></svg>' });
    await tick();
    expect(el.innerHTML).toBe('');
    expect(el.className).toBe('');
  });

  it('keeps the newest render when a stale one finishes last', async () => {
    const el = mount('digraph { old }');
    el.remove(); // disconnect, change the source, reconnect
    el.setAttribute('graph', encodeURIComponent('digraph { new }'));
    document.body.appendChild(el);

    resolveRender('digraph { new }', { svg: '<svg id="new"></svg>' });
    await vi.waitFor(() => expect(el.innerHTML).toContain('id="new"'));
    resolveRender('digraph { old }', { svg: '<svg id="old"></svg>' });
    await tick();

    expect(el.innerHTML).toContain('id="new"');
    expect(el.innerHTML).not.toContain('id="old"');
  });

  it('ignores a stale error that finishes after a newer success', async () => {
    const el = mount('digraph { first }');
    el.remove();
    el.setAttribute('graph', encodeURIComponent('digraph { second }'));
    document.body.appendChild(el);

    resolveRender('digraph { second }', { svg: '<svg id="second"></svg>' });
    await vi.waitFor(() => expect(el.innerHTML).toContain('id="second"'));
    resolveRender('digraph { first }', { error: 'stale failure' });
    await tick();

    expect(el.className).toBe('dot-diagram');
    expect(el.getAttribute('role')).toBeNull();
    expect(el.textContent).not.toContain('stale failure');
  });
});
