import { defineConfig } from 'vitepress';
// Consume the built package artifact (proves the shipped dist works end-to-end).
import { withGraphviz } from '../../dist/index.js';

export default withGraphviz(
  defineConfig({
    title: 'vitepress-plugin-graphviz',
    description: 'Build-time Graphviz DOT rendering for VitePress',
  }),
  { useCurrentColor: true },
);
