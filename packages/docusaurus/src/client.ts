/**
 * The React component the remark plugin emits for client-mode blocks — a thin
 * re-export of `@knowvah/dot-react`'s `<DotDiagram>`, so Docusaurus shares the
 * exact component the standalone React package ships. The remark plugin emits
 * `<DotDiagram dot={"…"} …>`, matching its raw-`dot` prop.
 *
 * Register it by swizzling `src/theme/MDXComponents`:
 *
 * ```tsx
 * import MDXComponents from '@theme-original/MDXComponents';
 * import { DotDiagram } from '@knowvah/docusaurus-plugin-dot/client';
 * export default { ...MDXComponents, DotDiagram };
 * ```
 */
export {
  DotDiagram as default,
  DotDiagram,
  type DotDiagramProps,
} from '@knowvah/dot-react';
