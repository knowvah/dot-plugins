import { defineConfig } from 'vitepress';
// Consume the built package artifact (proves the shipped dist works end-to-end).
import { withDot } from '../../dist/index.js';
// DOT syntax-highlighting for blocks the plugin doesn't render (e.g. no-render).
import { dotLang } from './dot.tmLanguage';

export default withDot(
  defineConfig({
    title: 'vitepress-plugin-dot',
    description: 'Build-time Graphviz DOT rendering for VitePress',
    markdown: { languages: [dotLang] },
  }),
  { useCurrentColor: true },
);
