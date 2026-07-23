import { describe, it, expect, vi } from 'vitest';
import MarkdownIt from 'markdown-it';
import eleventyPluginDot, { installDotFence } from './index.js';

function render(
  info: string,
  body: string,
  options: Parameters<typeof installDotFence>[1] = {},
): string {
  const md = new MarkdownIt();
  installDotFence(md, options);
  return md.render('```' + info + '\n' + body + '\n```\n');
}

describe('installDotFence (build mode)', () => {
  it('renders a valid DOT block to inline SVG', () => {
    const out = render('dot', 'digraph { a -> b }');
    expect(out).toContain('<div class="dot-diagram">');
    expect(out).toContain('<svg');
    expect(out).not.toContain('<?xml');
  });

  it('renders an error panel on invalid DOT', () => {
    const out = render('dot', 'nope {{{');
    expect(out).toContain('dot-diagram-error');
    expect(out).not.toContain('<svg');
  });

  it('honors a per-block engine', () => {
    const out = render('dot engine=neato', 'graph { a -- b -- c -- a }');
    expect(out).toContain('<svg');
    expect(out).not.toContain('dot-diagram-error');
  });

  it('delegates non-DOT languages to the previous fence rule', () => {
    const out = render('js', 'const x = 1;');
    expect(out).not.toContain('<svg');
    expect(out).toContain('const x = 1;');
  });

  it('delegates no-render and client blocks (11ty is build-only)', () => {
    expect(render('dot no-render', 'digraph{a->b}')).not.toContain('<svg');
    expect(render('dot client', 'digraph{a->b}')).not.toContain('<svg');
  });

  it('respects renderLanguage', () => {
    expect(
      render('dot', 'digraph{a->b}', { renderLanguage: 'graphviz' }),
    ).not.toContain('<svg');
    expect(
      render('graphviz', 'digraph{a->b}', { renderLanguage: 'graphviz' }),
    ).toContain('<svg');
  });
});

describe('eleventyPluginDot', () => {
  it('amends the markdown library with the DOT fence renderer', () => {
    const md = new MarkdownIt();
    const eleventyConfig = {
      amendLibrary: vi.fn((name: string, cb: (m: MarkdownIt) => void) => {
        if (name === 'md') cb(md);
      }),
    };
    eleventyPluginDot(eleventyConfig, {});
    expect(eleventyConfig.amendLibrary).toHaveBeenCalledWith(
      'md',
      expect.any(Function),
    );
    // the callback actually installed the renderer:
    expect(md.render('```dot\ndigraph{a->b}\n```')).toContain('<svg');
  });
});
