import { describe, it, expect } from 'vitest';
import MarkdownIt from 'markdown-it';
import { graphvizMarkdown, parseFenceInfo } from './markdown-it.js';

/** Build a markdown-it with the plugin applied and render a fenced block. */
function renderFence(
  info: string,
  body: string,
  options: Parameters<typeof graphvizMarkdown>[1] = {},
): string {
  const md = new MarkdownIt();
  graphvizMarkdown(md, options);
  return md.render('```' + info + '\n' + body + '\n```\n');
}

describe('parseFenceInfo', () => {
  it('extracts the language', () => {
    expect(parseFenceInfo('dot')).toEqual({ lang: 'dot', noRender: false });
  });
  it('reads an engine from a brace block', () => {
    expect(parseFenceInfo('dot {engine=neato}')).toMatchObject({
      lang: 'dot',
      engine: 'neato',
    });
  });
  it('reads an engine from a bare key=value', () => {
    expect(parseFenceInfo('dot engine="circo"')).toMatchObject({
      lang: 'dot',
      engine: 'circo',
    });
  });
  it('detects the no-render flag', () => {
    expect(parseFenceInfo('dot no-render')).toMatchObject({
      lang: 'dot',
      noRender: true,
    });
  });
});

describe('graphvizMarkdown — rendering', () => {
  it('renders a valid DOT block to inline SVG in a wrapper', () => {
    const out = renderFence('dot', 'digraph { a -> b }');
    expect(out).toContain('<div class="graphviz">');
    expect(out).toContain('<svg');
    expect(out).toMatch(/>a<\/text>/);
    expect(out).toMatch(/>b<\/text>/);
  });

  it('strips the XML prolog and DOCTYPE for valid inline embedding', () => {
    const out = renderFence('dot', 'digraph { a -> b }');
    expect(out).not.toContain('<?xml');
    expect(out).not.toContain('<!DOCTYPE');
  });

  it('honors a per-block engine override', () => {
    const out = renderFence('dot {engine=neato}', 'graph { a -- b -- c -- a }');
    expect(out).toContain('<svg');
    expect(out).not.toContain('graphviz-error');
  });

  it('respects a custom wrapperClass', () => {
    const out = renderFence('dot', 'digraph { a -> b }', {
      wrapperClass: 'diagram',
    });
    expect(out).toContain('<div class="diagram">');
  });

  it('remaps default black to currentColor when useCurrentColor is set', () => {
    const out = renderFence('dot', 'digraph { a -> b }', {
      useCurrentColor: true,
    });
    expect(out).toContain('currentColor');
    expect(out).not.toContain('stroke="black"');
    expect(out).not.toContain('fill="black"');
  });
});

describe('graphvizMarkdown — errors', () => {
  it('emits a readable error panel on invalid DOT (no throw by default)', () => {
    let out = '';
    expect(() => {
      out = renderFence('dot', 'this is not valid dot {{{');
    }).not.toThrow();
    expect(out).toContain('graphviz-error');
    expect(out).not.toContain('<svg');
    expect(out.toLowerCase()).toContain('error');
  });

  it('throws when onError is "throw"', () => {
    expect(() =>
      renderFence('dot', 'this is not valid dot {{{', { onError: 'throw' }),
    ).toThrow(/vitepress-plugin-graphviz/);
  });
});

describe('graphvizMarkdown — delegation (does not clobber other fences)', () => {
  it('leaves non-DOT languages to the previous fence rule', () => {
    const out = renderFence('js', 'const x = 1;');
    expect(out).not.toContain('<svg');
    expect(out).toContain('const x = 1;');
    expect(out).toContain('<code');
  });

  it('skips a block flagged no-render (keeps it as source)', () => {
    const out = renderFence('dot no-render', 'digraph { a -> b }');
    expect(out).not.toContain('<svg');
    expect(out).toContain('digraph');
    expect(out).toContain('<code');
  });

  it('only renders the configured renderLanguage', () => {
    // renderLanguage 'graphviz' => ```dot stays source, ```graphviz renders
    const dotOut = renderFence('dot', 'digraph { a -> b }', {
      renderLanguage: 'graphviz',
    });
    expect(dotOut).not.toContain('<svg');
    const gvOut = renderFence('graphviz', 'digraph { a -> b }', {
      renderLanguage: 'graphviz',
    });
    expect(gvOut).toContain('<svg');
  });

  it('preserves a pre-existing custom fence rule', () => {
    const md = new MarkdownIt();
    md.renderer.rules.fence = () => 'SENTINEL';
    graphvizMarkdown(md);
    // a non-dot fence should reach the sentinel; a dot fence should render
    expect(md.render('```js\nx\n```')).toContain('SENTINEL');
    expect(md.render('```dot\ndigraph{a->b}\n```')).toContain('<svg');
  });
});

describe('graphvizMarkdown — timeout safe-mode (child process)', () => {
  it('renders a normal graph through the child process', () => {
    const out = renderFence('dot', 'digraph { a -> b }', { timeout: 15000 });
    expect(out).toContain('<svg');
    expect(out).not.toContain('graphviz-error');
  });

  it('fails to an error panel when the timeout is exceeded', () => {
    // 1ms cannot outrun Node startup, so the child is always killed —
    // deterministically exercises the timeout/SIGKILL path without a real hang.
    const out = renderFence('dot', 'digraph { a -> b }', { timeout: 1 });
    expect(out).toContain('graphviz-error');
    expect(out.toLowerCase()).toMatch(/timeout|aborted/);
  });
});
