/**
 * Docusaurus (MDX) support: a **remark plugin** that rewrites ` ```dot ` fenced
 * code blocks into a `<DotDiagram>` JSX element, rendered in the browser by the
 * companion React component ({@link @knowvah/docusaurus-plugin-dot/client}).
 *
 * Docusaurus renders through MDX, which parses raw HTML as JSX — and Graphviz
 * SVG carries non-JSX attributes — so v1 renders client-side rather than
 * injecting static SVG at build.
 *
 * ```ts
 * // docusaurus.config.ts
 * import remarkDot from '@knowvah/docusaurus-plugin-dot';
 * export default {
 *   presets: [['classic', {
 *     docs: { remarkPlugins: [[remarkDot, { useCurrentColor: true }]] },
 *   }]],
 * };
 * ```
 * Then register the component in `src/theme/MDXComponents` and import
 * `@knowvah/docusaurus-plugin-dot/style.css`.
 */
import { visit } from 'unist-util-visit';
import {
  parseFenceInfo,
  resolveConfig,
  type DotPluginOptions,
} from '@knowvah/dot-core';
import type { Root, Code } from 'mdast';

export type { DotPluginOptions } from '@knowvah/dot-core';

// Minimal shape of an MDX JSX flow element (from mdast-util-mdx-jsx), typed
// locally to avoid a types-only dependency. Only string / boolean attributes
// are used, so no estree expression AST is needed.
interface MdxJsxAttribute {
  type: 'mdxJsxAttribute';
  name: string;
  value: string | null;
}
interface MdxJsxFlowElement {
  type: 'mdxJsxFlowElement';
  name: string;
  attributes: MdxJsxAttribute[];
  children: [];
}

function attr(name: string, value: string | null): MdxJsxAttribute {
  return { type: 'mdxJsxAttribute', name, value };
}

/**
 * Remark plugin. Replaces DOT code blocks with a `<DotDiagram>` JSX element;
 * `no-render` and non-DOT blocks are left as normal code blocks.
 */
export default function remarkDot(options: DotPluginOptions = {}) {
  const cfg = resolveConfig(options);
  return (tree: Root): void => {
    visit(tree, 'code', (node: Code, index, parent) => {
      if (parent == null || index == null) return;
      const meta = node.meta ? ` ${node.meta}` : '';
      const info = parseFenceInfo(`${node.lang ?? ''}${meta}`);
      if (info.lang !== cfg.renderLanguage || info.noRender) return;

      const engine = info.engine ?? cfg.defaultEngine;
      const attributes: MdxJsxAttribute[] = [
        attr('graph', encodeURIComponent(node.value)),
        attr('engine', engine),
        attr('wrapperClass', cfg.wrapperClass),
      ];
      if (cfg.useCurrentColor) attributes.push(attr('useCurrentColor', null));

      const el: MdxJsxFlowElement = {
        type: 'mdxJsxFlowElement',
        name: 'DotDiagram',
        attributes,
        children: [],
      };
      (parent.children as unknown[])[index] = el;
    });
  };
}
