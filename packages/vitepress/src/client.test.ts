import { describe, it, expect } from 'vitest';
import { DotDiagram } from './client.js';

// renderDiagram is exercised in @knowvah/dot-core (packages/core); here we only
// verify the VitePress component wrapper is wired correctly.
describe('DotDiagram component', () => {
  it('is a Vue component named DotDiagram', () => {
    expect(DotDiagram.name).toBe('DotDiagram');
  });

  it('declares the expected props', () => {
    const props = DotDiagram.props as Record<string, unknown>;
    expect(Object.keys(props).sort()).toEqual(
      ['engine', 'graph', 'useCurrentColor', 'wrapperClass'].sort(),
    );
  });
});
