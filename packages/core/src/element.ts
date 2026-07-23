/**
 * `<dot-diagram>` — a framework-neutral custom element that renders a DOT graph
 * to SVG in the browser on connect, via {@link renderDiagram}. Works in plain
 * HTML (Eleventy, static sites) and inside Vue/React. This is the
 * `@knowvah/dot-core/element` entry point.
 *
 * Attributes:
 * - `graph` — URI-encoded DOT source (required)
 * - `engine` — layout engine (default `dot`)
 * - `wrapper-class` — CSS class (default `dot-diagram`)
 * - `use-current-color` — boolean attribute; remap black → `currentColor`
 *
 * Register it once (typically in a small client script):
 * ```js
 * import { defineDotDiagram } from '@knowvah/dot-core/element';
 * defineDotDiagram();
 * ```
 */
import { renderDiagram } from './browser.js';

export class DotDiagramElement extends HTMLElement {
  async connectedCallback(): Promise<void> {
    const graph = this.getAttribute('graph') ?? '';
    const engine = this.getAttribute('engine') ?? 'dot';
    const wrapperClass = this.getAttribute('wrapper-class') ?? 'dot-diagram';
    const useCurrentColor = this.hasAttribute('use-current-color');

    const state = await renderDiagram(
      decodeURIComponent(graph),
      engine,
      useCurrentColor,
    );

    if (state.error != null) {
      this.className = `${wrapperClass}-error`;
      this.setAttribute('role', 'alert');
      this.textContent = state.error;
    } else {
      this.className = wrapperClass;
      this.innerHTML = state.svg ?? '';
    }
  }
}

/** Register `<dot-diagram>` (or a custom tag). No-op if unavailable or already
 * defined, so it is safe to call more than once. */
export function defineDotDiagram(tag = 'dot-diagram'): void {
  if (typeof customElements !== 'undefined' && !customElements.get(tag)) {
    customElements.define(tag, DotDiagramElement);
  }
}
