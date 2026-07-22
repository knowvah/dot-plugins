import { describe, it, expect } from 'vitest';
import { GraphvizDiagram, renderDiagram } from './client.js';

describe('renderDiagram (client-side render pipeline)', () => {
  it('renders valid DOT to an inline SVG fragment', async () => {
    const state = await renderDiagram('digraph { a -> b }', 'dot', false);
    expect(state.error).toBeUndefined();
    expect(state.svg).toContain('<svg');
    expect(state.svg).not.toContain('<?xml');
    expect(state.svg).not.toContain('<!DOCTYPE');
  });

  it('returns a friendly error message for invalid DOT', async () => {
    const state = await renderDiagram('not valid dot {{{', 'dot', false);
    expect(state.svg).toBeUndefined();
    expect(state.error).toBeTruthy();
    expect(typeof state.error).toBe('string');
  });

  it('applies the currentColor remap when requested', async () => {
    const state = await renderDiagram('digraph { a -> b }', 'dot', true);
    expect(state.svg).toContain('currentColor');
    expect(state.svg).not.toContain('stroke="black"');
  });

  it('honors the engine argument', async () => {
    const state = await renderDiagram('graph { a -- b -- c -- a }', 'neato', false);
    expect(state.error).toBeUndefined();
    expect(state.svg).toContain('<svg');
  });
});

describe('GraphvizDiagram component', () => {
  it('is a Vue component named GraphvizDiagram', () => {
    expect(GraphvizDiagram.name).toBe('GraphvizDiagram');
  });

  it('declares the expected props', () => {
    const props = GraphvizDiagram.props as Record<string, unknown>;
    expect(Object.keys(props).sort()).toEqual(
      ['engine', 'graph', 'useCurrentColor', 'wrapperClass'].sort(),
    );
  });
});
