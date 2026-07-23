import { describe, it, expect } from 'vitest';
import MarkdownIt from 'markdown-it';
import dotMarkdown, {
  emitDotDiagramElement,
  type ResolvedConfig,
} from './index.js';

function render(
  info: string,
  body: string,
  options: Parameters<typeof dotMarkdown>[1] = {},
): string {
  const md = new MarkdownIt();
  dotMarkdown(md, options);
  return md.render('```' + info + '\n' + body + '\n```\n');
}

describe('dotMarkdown — build mode', () => {
  it('renders valid DOT to inline SVG', () => {
    const out = render('dot', 'digraph { a -> b }');
    expect(out).toContain('<div class="dot-diagram">');
    expect(out).toContain('<svg');
  });
  it('emits an error panel on invalid DOT', () => {
    expect(render('dot', 'nope {{{')).toContain('dot-diagram-error');
  });
  it('honors a per-block engine', () => {
    expect(render('dot engine=neato', 'graph{a--b--c--a}')).toContain('<svg');
  });
});

describe('dotMarkdown — client mode', () => {
  it('emits <dot-diagram> by default', () => {
    const out = render('dot client', 'digraph { a -> b }');
    expect(out).toContain('<dot-diagram ');
    expect(out).toContain('graph=');
    expect(out).not.toContain('<svg');
  });
  it('passes engine and use-current-color', () => {
    const out = render('dot engine=neato client', 'graph{a--b}', {
      useCurrentColor: true,
    });
    expect(out).toContain('engine="neato"');
    expect(out).toContain('use-current-color');
  });
  it('honors a custom emitClient', () => {
    const out = render('dot client', 'digraph{a->b}', {
      emitClient: (_dot, engine) => `<x-dot engine="${engine}"/>`,
    });
    expect(out).toContain('<x-dot engine="dot"/>');
    expect(out).not.toContain('<dot-diagram');
  });
  it('supports a global client default', () => {
    expect(render('dot', 'digraph{a->b}', { mode: 'client' })).toContain(
      '<dot-diagram',
    );
  });
});

describe('dotMarkdown — delegation', () => {
  it('delegates non-DOT and no-render blocks', () => {
    expect(render('js', 'const x = 1;')).toContain('const x = 1;');
    expect(render('dot no-render', 'digraph{a->b}')).not.toContain('<svg');
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

describe('emitDotDiagramElement', () => {
  it('produces a <dot-diagram> tag with the encoded graph', () => {
    const cfg = {
      wrapperClass: 'dot-diagram',
      useCurrentColor: true,
    } as ResolvedConfig;
    const out = emitDotDiagramElement('digraph{a->b}', 'dot', cfg);
    expect(out).toContain('<dot-diagram ');
    expect(out).toContain('use-current-color');
    expect(decodeURIComponent(out.match(/graph="([^"]*)"/)![1])).toBe(
      'digraph{a->b}',
    );
  });
});
