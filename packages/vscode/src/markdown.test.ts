import { describe, it, expect } from 'vitest';
import MarkdownIt from 'markdown-it';
import { extendMarkdownIt } from './markdown.js';

function render(
  src: string,
  useCurrentColor = false,
  defaultEngine = 'dot',
): string {
  return extendMarkdownIt(
    new MarkdownIt({ html: true }),
    () => defaultEngine,
    () => useCurrentColor,
  ).render(src);
}

describe('extendMarkdownIt — VS Code Markdown preview', () => {
  it('renders a ```dot block to inline SVG in a wrapper', () => {
    const html = render('```dot\ndigraph { a -> b }\n```\n');
    expect(html).toContain('<svg');
    expect(html).toContain('class="dot-diagram"');
  });

  it('leaves a ```dot no-render block as a plain code block', () => {
    const html = render('```dot no-render\ndigraph { a -> b }\n```\n');
    expect(html).not.toContain('<svg');
    expect(html).toContain('<code');
  });

  it('renders a ```dot client block inline too (preview runs no scripts)', () => {
    const html = render('```dot client\ndigraph { a -> b }\n```\n');
    expect(html).toContain('<svg');
    expect(html).not.toContain('<dot-diagram');
  });

  it('renders an error panel for invalid DOT without throwing', () => {
    const html = render('```dot\nnope {{{\n```\n');
    expect(html).toContain('dot-diagram-error');
    expect(html).not.toContain('<svg');
  });

  it('honors a per-block engine override', () => {
    // neato lays out `graph { a -- b }`; just assert it renders to SVG.
    const html = render('```dot engine=neato\ngraph { a -- b }\n```\n');
    expect(html).toContain('<svg');
  });

  it('renders native black by default (no currentColor remap)', () => {
    const html = render('```dot\ndigraph { a -> b }\n```\n');
    expect(html).toContain('<svg');
    expect(html).not.toContain('currentColor');
  });

  it('remaps black to currentColor when useCurrentColor is enabled', () => {
    const html = render('```dot\ndigraph { a -> b }\n```\n', true);
    expect(html).toContain('currentColor');
  });

  it('reads the engine + color resolvers per render (live settings)', () => {
    let engine = 'dot';
    let useCurrentColor = false;
    const md = extendMarkdownIt(
      new MarkdownIt({ html: true }),
      () => engine,
      () => useCurrentColor,
    );
    const first = md.render('```dot\ndigraph { a -> b }\n```\n');
    expect(first).not.toContain('currentColor');
    // Change the "settings" without rebuilding the cached markdown-it instance.
    engine = 'neato';
    useCurrentColor = true;
    const second = md.render('```dot\ndigraph { a -> b }\n```\n');
    expect(second).toContain('currentColor'); // picked up on the next render
  });
});
