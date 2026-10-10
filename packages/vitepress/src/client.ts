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
import { defineComponent, h, onBeforeUnmount, onMounted, ref, watch } from 'vue';
import { renderDiagram, type DiagramState } from '@knowvah/dot-core/browser';

export { renderDiagram } from '@knowvah/dot-core/browser';
export type { DiagramState } from '@knowvah/dot-core/browser';

/**
 * `<DotDiagram>` — renders its `graph` prop (a URI-encoded DOT string) to SVG on
 * mount, and again whenever a prop changes. Emitted by the markdown-it plugin
 * in client mode. Rendering is async (web fonts load first), so a slow render
 * that finishes after a newer one started, or after unmount, is discarded.
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
    // Id of the latest render; a render may only write while it still holds it.
    let renderId = 0;
    const render = async (): Promise<void> => {
      const id = ++renderId;
      const next = await renderDiagram(
        decodeURIComponent(props.graph),
        props.engine,
        props.useCurrentColor,
      );
      if (id === renderId) state.value = next;
    };
    onMounted(render);
    watch(
      [() => props.graph, () => props.engine, () => props.useCurrentColor],
      render,
    );
    onBeforeUnmount(() => {
      renderId++; // abandon any render still in flight
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
