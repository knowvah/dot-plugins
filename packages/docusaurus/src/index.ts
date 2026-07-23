/**
 * Docusaurus (MDX) support: a **remark plugin** that renders ` ```dot ` fenced
 * code blocks either at **build time** (default — a static `<div>` whose SVG is
 * injected via `dangerouslySetInnerHTML`, so it ends up in the SSR'd HTML with
 * no client JS) or **client-side** (` ```dot client ` / `mode: 'client'` — a
 * `<DotDiagram>` React component). Non-DOT and `no-render` blocks are left alone.
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
 * Client mode also needs the component registered in `src/theme/MDXComponents`;
 * import `@knowvah/docusaurus-plugin-dot/style.css` either way.
 */
import { visit } from 'unist-util-visit';
import {
  parseFenceInfo,
  renderDotSvg,
  resolveConfig,
  type DotPluginOptions,
  type ResolvedConfig,
} from '@knowvah/dot-core';
import type { EngineName } from 'graphviz-ts';
import type { Root, Code } from 'mdast';

export type { DotPluginOptions } from '@knowvah/dot-core';

// Minimal shapes of MDX JSX nodes (from mdast-util-mdx-jsx), typed locally to
// avoid a types-only dependency.
interface MdxJsxAttributeValueExpression {
  type: 'mdxJsxAttributeValueExpression';
  value: string;
  data: { estree: unknown };
}
interface MdxJsxAttribute {
  type: 'mdxJsxAttribute';
  name: string;
  value: string | null | MdxJsxAttributeValueExpression;
}
interface MdxJsxFlowElement {
  type: 'mdxJsxFlowElement';
  name: string;
  attributes: MdxJsxAttribute[];
  children: unknown[];
}

function attr(name: string, value: string | null): MdxJsxAttribute {
  return { type: 'mdxJsxAttribute', name, value };
}

/** estree Program for the object expression `{ __html: <html> }`. */
function htmlObjectEstree(html: string): unknown {
  const property = {
    type: 'Property',
    method: false,
    shorthand: false,
    computed: false,
    kind: 'init',
    key: { type: 'Identifier', name: '__html' },
    value: { type: 'Literal', value: html },
  };
  const expression = { type: 'ObjectExpression', properties: [property] };
  return {
    type: 'Program',
    sourceType: 'module',
    comments: [],
    body: [{ type: 'ExpressionStatement', expression }],
  };
}

/** Build the `dangerouslySetInnerHTML={{ __html: "…" }}` JSX attribute, incl.
 * the estree the MDX compiler needs. */
function innerHtmlAttr(html: string): MdxJsxAttribute {
  return {
    type: 'mdxJsxAttribute',
    name: 'dangerouslySetInnerHTML',
    value: {
      type: 'mdxJsxAttributeValueExpression',
      value: `{ __html: ${JSON.stringify(html)} }`,
      data: { estree: htmlObjectEstree(html) },
    },
  };
}

/** Build mode: render the SVG now and inject it into a static `<div>`. */
function buildElement(
  dot: string,
  engine: EngineName,
  cfg: ResolvedConfig,
): MdxJsxFlowElement {
  const { svg, error } = renderDotSvg(dot, engine, cfg);
  if (svg != null) {
    return {
      type: 'mdxJsxFlowElement',
      name: 'div',
      attributes: [attr('className', cfg.wrapperClass), innerHtmlAttr(svg)],
      children: [],
    };
  }
  return {
    type: 'mdxJsxFlowElement',
    name: 'div',
    attributes: [
      attr('className', `${cfg.wrapperClass}-error`),
      attr('role', 'alert'),
    ],
    children: [
      { type: 'text', value: error?.friendlyMessage ?? 'Failed to render graph.' },
    ],
  };
}

/** Client mode: emit a `<DotDiagram>` that renders in the browser. */
function clientElement(
  dot: string,
  engine: EngineName,
  cfg: ResolvedConfig,
): MdxJsxFlowElement {
  const attributes: MdxJsxAttribute[] = [
    attr('graph', encodeURIComponent(dot)),
    attr('engine', engine),
    attr('wrapperClass', cfg.wrapperClass),
  ];
  if (cfg.useCurrentColor) attributes.push(attr('useCurrentColor', null));
  return { type: 'mdxJsxFlowElement', name: 'DotDiagram', attributes, children: [] };
}

/**
 * Remark plugin. Replaces DOT code blocks with build-time SVG (default) or a
 * `<DotDiagram>` client component; `no-render` and non-DOT blocks are untouched.
 */
export default function remarkDot(options: DotPluginOptions = {}) {
  const cfg = resolveConfig(options);
  return (tree: Root): void => {
    visit(tree, 'code', (node: Code, index, parent) => {
      if (parent == null || index == null) return;
      const meta = node.meta ? ` ${node.meta}` : '';
      const info = parseFenceInfo(`${node.lang ?? ''}${meta}`);
      if (info.lang !== cfg.renderLanguage || info.noRender) return;

      const engine = (info.engine ?? cfg.defaultEngine) as EngineName;
      const mode = info.mode ?? cfg.mode;
      const el =
        mode === 'client'
          ? clientElement(node.value, engine, cfg)
          : buildElement(node.value, engine, cfg);
      (parent.children as unknown[])[index] = el;
    });
  };
}
