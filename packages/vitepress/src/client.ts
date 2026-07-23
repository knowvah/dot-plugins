/**
 * Client-side render mode: a Vue component that renders a DOT graph to SVG in
 * the browser on mount, via `@knowvah/dot-core/browser`. Used when a block (or
 * the plugin) is in `mode: 'client'`. Register it once in your VitePress theme:
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
import { renderDiagram, type DiagramState } from '@knowvah/dot-core/browser';

export { renderDiagram } from '@knowvah/dot-core/browser';
export type { DiagramState } from '@knowvah/dot-core/browser';

/**
 * `<DotDiagram>` — renders its `graph` prop (a URI-encoded DOT string) to SVG on
 * mount. Emitted by the markdown-it plugin in client mode.
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
