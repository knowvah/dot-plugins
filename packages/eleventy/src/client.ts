/**
 * Client entry for Eleventy client-mode blocks. Re-exports the `<dot-diagram>`
 * web component registration from `@knowvah/dot-core/element`. Import and call
 * it once in your site's browser JavaScript:
 *
 * ```js
 * import { defineDotDiagram } from '@knowvah/eleventy-plugin-dot/client';
 * defineDotDiagram();
 * ```
 */
export { defineDotDiagram, DotDiagramElement } from '@knowvah/dot-core/element';
