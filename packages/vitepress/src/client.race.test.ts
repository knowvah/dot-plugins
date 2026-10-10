// @vitest-environment jsdom
import { describe, it, expect, vi, afterEach } from 'vitest';
import { createApp, h, nextTick, ref, type App } from 'vue';
import type { DiagramState } from '@knowvah/dot-core/browser';

interface Deferred {
  dot: string;
  resolve: (state: DiagramState) => void;
}

const pending: Deferred[] = vi.hoisted(() => []);

// Each renderDiagram call stays pending until the test resolves it, so the
// test controls the order in which concurrent renders finish.
vi.mock('@knowvah/dot-core/browser', () => ({
  renderDiagram: (dot: string): Promise<DiagramState> =>
    new Promise((resolve) => pending.push({ dot, resolve })),
}));

const { DotDiagram } = await import('./client.js');

const graph = ref(encodeURIComponent('a'));
let app: App | undefined;
let host: HTMLElement | undefined;

function mount(dot: string): HTMLElement {
  graph.value = encodeURIComponent(dot);
  host = document.createElement('div');
  document.body.appendChild(host);
  app = createApp({ render: () => h(DotDiagram, { graph: graph.value }) });
  app.mount(host);
  return host;
}

async function update(dot: string): Promise<void> {
  graph.value = encodeURIComponent(dot);
  await nextTick();
}

async function resolveRender(dot: string, state: DiagramState): Promise<void> {
  const entry = pending.find((p) => p.dot === dot);
  if (entry === undefined) throw new Error(`no pending render for ${dot}`);
  entry.resolve(state);
  await nextTick();
  await nextTick();
}

afterEach(() => {
  app?.unmount();
  host?.remove();
  app = undefined;
  host = undefined;
  pending.length = 0;
});

describe('DotDiagram (Vue) with a slow async render', () => {
  it('shows the SVG once the render resolves', async () => {
    const el = mount('a');
    expect(el.querySelector('svg')).toBeNull();
    await resolveRender('a', { svg: '<svg id="a"></svg>' });
    expect(el.querySelector('svg#a')).not.toBeNull();
  });

  it('shows an error panel when the render resolves with an error', async () => {
    const el = mount('bad');
    await resolveRender('bad', { error: 'syntax problem' });
    const panel = el.querySelector('[role="alert"]');
    expect(panel?.textContent).toBe('syntax problem');
    expect(panel?.className).toBe('dot-diagram-error');
  });

  it('re-renders when the graph prop changes', async () => {
    const el = mount('one');
    await resolveRender('one', { svg: '<svg id="one"></svg>' });
    await update('two');
    await resolveRender('two', { svg: '<svg id="two"></svg>' });
    expect(el.querySelector('svg#two')).not.toBeNull();
    expect(el.querySelector('svg#one')).toBeNull();
  });

  it('keeps the newest render when a stale one finishes last', async () => {
    const el = mount('old');
    await update('new');
    await resolveRender('new', { svg: '<svg id="new"></svg>' });
    await resolveRender('old', { svg: '<svg id="old"></svg>' });
    expect(el.querySelector('svg#new')).not.toBeNull();
    expect(el.querySelector('svg#old')).toBeNull();
  });

  it('ignores a stale error that finishes after a newer success', async () => {
    const el = mount('first');
    await update('second');
    await resolveRender('second', { svg: '<svg id="second"></svg>' });
    await resolveRender('first', { error: 'stale failure' });
    expect(el.querySelector('[role="alert"]')).toBeNull();
    expect(el.querySelector('svg#second')).not.toBeNull();
  });

  it('does not write after unmount', async () => {
    const el = mount('gone');
    app?.unmount();
    app = undefined;
    await resolveRender('gone', { svg: '<svg id="gone"></svg>' });
    expect(el.innerHTML).toBe('');
  });
});
