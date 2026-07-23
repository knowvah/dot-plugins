import { describe, it, expect } from 'vitest';
import { compile } from '@mdx-js/mdx';
import remarkDot from './index.js';
import DotDiagram from './client.js';
import type { Root, Code } from 'mdast';

interface Attr {
  name: string;
  value: unknown;
}
interface JsxNode {
  type: string;
  name?: string;
  attributes?: Attr[];
  children?: { value?: string }[];
}

function codeNode(lang: string, value: string, meta?: string): Code {
  return { type: 'code', lang, meta: meta ?? null, value };
}
function transform(code: Code, options = {}): JsxNode {
  const tree: Root = { type: 'root', children: [code] };
  remarkDot(options)(tree);
  return tree.children[0] as unknown as JsxNode;
}
function attrOf(node: JsxNode, name: string): Attr | undefined {
  return node.attributes?.find((a) => a.name === name);
}

describe('remarkDot — build mode (default)', () => {
  it('renders a dot block to a static <div> with dangerouslySetInnerHTML', () => {
    const node = transform(codeNode('dot', 'digraph { a -> b }'));
    expect(node.type).toBe('mdxJsxFlowElement');
    expect(node.name).toBe('div');
    expect(attrOf(node, 'className')!.value).toBe('dot-diagram');
    const dih = attrOf(node, 'dangerouslySetInnerHTML')!
      .value as { value: string };
    expect(dih.value).toContain('<svg');
  });

  it('renders an error <div> for invalid DOT', () => {
    const node = transform(codeNode('dot', 'nope {{{'));
    expect(node.name).toBe('div');
    expect(attrOf(node, 'className')!.value).toBe('dot-diagram-error');
    expect(node.children?.[0]?.value).toBeTruthy();
  });

  it('compiles cleanly through the real MDX pipeline', async () => {
    const out = String(
      await compile('```dot\ndigraph { a -> b }\n```\n', {
        remarkPlugins: [remarkDot],
      }),
    );
    expect(out).toContain('dangerouslySetInnerHTML');
    expect(out).toContain('<svg');
  });
});

describe('remarkDot — client mode', () => {
  it('emits <DotDiagram> for a client block', () => {
    const node = transform(codeNode('dot', 'digraph{a->b}', 'client'));
    expect(node.type).toBe('mdxJsxFlowElement');
    expect(node.name).toBe('DotDiagram');
    expect(decodeURIComponent(attrOf(node, 'graph')!.value as string)).toBe(
      'digraph{a->b}',
    );
  });

  it('honors a global client mode + per-block engine', () => {
    const node = transform(codeNode('dot', 'graph{a--b}', 'engine=neato'), {
      mode: 'client',
    });
    expect(node.name).toBe('DotDiagram');
    expect(attrOf(node, 'engine')!.value).toBe('neato');
  });
});

describe('remarkDot — delegation', () => {
  it('leaves no-render and non-dot blocks as code', () => {
    expect(transform(codeNode('dot', 'digraph{a->b}', 'no-render')).type).toBe(
      'code',
    );
    expect(transform(codeNode('js', 'const x = 1')).type).toBe('code');
  });

  it('respects renderLanguage', () => {
    expect(
      transform(codeNode('dot', 'digraph{a->b}'), {
        renderLanguage: 'graphviz',
      }).type,
    ).toBe('code');
    expect(
      transform(codeNode('graphviz', 'digraph{a->b}'), {
        renderLanguage: 'graphviz',
      }).name,
    ).toBe('div');
  });
});

describe('DotDiagram component', () => {
  it('is a React component', () => {
    expect(typeof DotDiagram).toBe('function');
  });
});
