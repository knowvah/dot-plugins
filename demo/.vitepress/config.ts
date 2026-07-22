import { defineConfig } from 'vitepress';
// Consume the built package artifact (proves the shipped dist works end-to-end).
import { withDot } from '../../dist/index.js';

export default withDot(
  defineConfig({
    title: 'vitepress-plugin-dot',
    description: 'Build-time Graphviz DOT rendering for VitePress',
  }),
  { useCurrentColor: true },
);
