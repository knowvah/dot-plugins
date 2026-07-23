import { describe, it, expect } from 'vitest';
import remarkDot from './index.js';
import DotDiagram from './client.js';
import type { Root, Code } from 'mdast';

interface JsxNode {
  type: string;
  name?: string;
  attributes?: { name: string; value: string | null }[];
}

function codeNode(lang: string, value: string, meta?: string): Code {
  return { type: 'code', lang, meta: meta ?? null, value };
}
function transform(code: Code, options = {}): JsxNode {
  const tree: Root = { type: 'root', children: [code] };
  remarkDot(options)(tree);
  return tree.children[0] as unknown as JsxNode;
}
function attrOf(node: JsxNode, name: string) {
  return node.attributes?.find((a) => a.name === name);
}

describe('remarkDot', () => {
  it('replaces a dot code block with a <DotDiagram> JSX element', () => {
    const node = transform(codeNode('dot', 'digraph { a -> b }'));
    expect(node.type).toBe('mdxJsxFlowElement');
    expect(node.name).toBe('DotDiagram');
    expect(decodeURIComponent(attrOf(node, 'graph')!.value!)).toBe(
      'digraph { a -> b }',
    );
    expect(attrOf(node, 'engine')!.value).toBe('dot');
  });

  it('reads a per-block engine from the code meta', () => {
    const node = transform(codeNode('dot', 'graph{a--b}', 'engine=neato'));
    expect(attrOf(node, 'engine')!.value).toBe('neato');
  });

  it('adds useCurrentColor as a boolean attribute when set', () => {
    const node = transform(codeNode('dot', 'digraph{a->b}'), {
      useCurrentColor: true,
    });
    const uc = attrOf(node, 'useCurrentColor');
    expect(uc).toBeTruthy();
    expect(uc!.value).toBeNull();
  });

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
      }).type,
    ).toBe('mdxJsxFlowElement');
  });
});

describe('DotDiagram component', () => {
  it('is a React component (renders via core/browser renderDiagram)', () => {
    expect(typeof DotDiagram).toBe('function');
  });
});
