/**
 * `@knowvah/dot-core` — the framework-agnostic Graphviz DOT render engine that
 * powers the VitePress / Eleventy / Docusaurus adapter plugins.
 *
 * - `.` (this module) — the build-time/Node API: fence-info parsing, config
 *   resolution, and `renderDotHtml` (DOT → inline-SVG HTML), plus the shared
 *   pure helpers and option types.
 * - `./browser` — {@link renderDiagram}, the browser render helper (no Node
 *   built-ins), for client-mode components.
 */
export {
  parseFenceInfo,
  escapeHtml,
  toInlineSvg,
  currentColorRemap,
  type DotPluginOptions,
  type RenderMode,
  type ParsedFence,
} from './shared.js';

export {
  renderDotHtml,
  renderDotSvg,
  resolveConfig,
  type ResolvedConfig,
  type DotSvgResult,
} from './render.js';
