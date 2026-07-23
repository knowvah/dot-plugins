import { describe, it, expect } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { DotDiagram } from './index.js';

describe('DotDiagram (React)', () => {
  it('is a component', () => {
    expect(typeof DotDiagram).toBe('function');
  });

  it('renders a wrapper div on the server (SVG fills in on mount)', () => {
    const html = renderToStaticMarkup(<DotDiagram dot="digraph { a -> b }" />);
    expect(html).toContain('class="dot-diagram"');
  });

  it('honors a custom wrapperClass', () => {
    const html = renderToStaticMarkup(
      <DotDiagram dot="digraph{a->b}" wrapperClass="diagram" />,
    );
    expect(html).toContain('class="diagram"');
  });
});
