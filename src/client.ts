/**
 * Client-side render mode: a Vue component that renders a DOT graph to SVG in
 * the browser on mount, using graphviz-ts. Used when a block (or the plugin) is
 * in `mode: 'client'`. Register it once in your VitePress theme:
 *
 * ```ts
 * // docs/.vitepress/theme/index.ts
 * import DefaultTheme from 'vitepress/theme';
 * import { DotDiagram } from '@knowvah/vitepress-plugin-dot/client';
 *
 * export default {
 *   extends: DefaultTheme,
 *   enhanceApp({ app }) {
 *     app.component('DotDiagram', DotDiagram);
 *   },
 * };
 * ```
 */
import { defineComponent, h, onMounted, ref } from 'vue';
import type { EngineName } from 'graphviz-ts';
import { currentColorRemap, toInlineSvg } from './shared.js';

/** The rendered outcome: `svg` on success, `error` on failure. */
export interface DiagramState {
  svg?: string;
  error?: string;
}

/**
 * Render a DOT string to inline SVG (or an error message) in the browser.
 * graphviz-ts is imported lazily so it is only fetched when a diagram mounts.
 */
export async function renderDiagram(
  dot: string,
  engine: string,
  useCurrentColor: boolean,
): Promise<DiagramState> {
  try {
    const { tryRenderSvg } = await import('graphviz-ts');
    const result = tryRenderSvg(dot, engine as EngineName);
    if (result.svg != null) {
      const inline = toInlineSvg(result.svg);
      return { svg: useCurrentColor ? currentColorRemap(inline) : inline };
    }
    return {
      error: result.errors?.[0]?.friendlyMessage ?? 'Failed to render graph.',
    };
  } catch (e) {
    return { error: e instanceof Error ? e.message : String(e) };
  }
}

/**
 * `<DotDiagram>` — renders its `graph` prop (a URI-encoded DOT string) to
 * SVG on mount. Emitted by the markdown-it plugin in client mode.
 */
export const DotDiagram = defineComponent({
  name: 'DotDiagram',
  props: {
    graph: { type: String, required: true },
    engine: { type: String, default: 'dot' },
    wrapperClass: { type: String, default: 'dot-diagram' },
    useCurrentColor: { type: Boolean, default: false },
  },
  setup(props) {
    const state = ref<DiagramState>({});
    onMounted(async () => {
      state.value = await renderDiagram(
        decodeURIComponent(props.graph),
        props.engine,
        props.useCurrentColor,
      );
    });
    return () => {
      const { error, svg } = state.value;
      if (error != null) {
        return h(
          'div',
          { class: `${props.wrapperClass}-error`, role: 'alert' },
          error,
        );
      }
      return h('div', { class: props.wrapperClass, innerHTML: svg ?? '' });
    };
  },
});

export default DotDiagram;
