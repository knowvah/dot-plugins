// @vitest-environment jsdom
import { describe, it, expect, beforeAll, vi } from 'vitest';
import { DotDiagramElement, defineDotDiagram } from './element.js';

beforeAll(() => {
  // Force the headless estimate measurer even though jsdom defines `document`.
  process.env.GV_TEXT_MEASURER = 'estimate';
  process.env.GV_FONT_QUIET = '1';
});

describe('defineDotDiagram / <dot-diagram>', () => {
  it('registers <dot-diagram> and is idempotent', () => {
    defineDotDiagram();
    expect(customElements.get('dot-diagram')).toBe(DotDiagramElement);
    // the !get(tag) guard makes a repeat call a no-op (a constructor can only
    // be registered under one tag, so re-defining would otherwise throw)
    expect(() => defineDotDiagram()).not.toThrow();
  });

  it('renders a graph to inline SVG on connect', async () => {
    defineDotDiagram();
    const el = document.createElement('dot-diagram');
    el.setAttribute('graph', encodeURIComponent('digraph { a -> b }'));
    document.body.appendChild(el);
    await vi.waitFor(() => expect(el.innerHTML).toContain('<svg'));
    expect(el.className).toBe('dot-diagram');
    expect(el.innerHTML).not.toContain('<?xml');
  });

  it('shows an error message on invalid DOT', async () => {
    defineDotDiagram();
    const el = document.createElement('dot-diagram');
    el.setAttribute('graph', encodeURIComponent('nope {{{'));
    document.body.appendChild(el);
    await vi.waitFor(() => expect(el.className).toBe('dot-diagram-error'));
    expect(el.textContent).toBeTruthy();
    expect(el.getAttribute('role')).toBe('alert');
  });
});
