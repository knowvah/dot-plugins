import DefaultTheme from 'vitepress/theme';
import type { EnhanceAppContext } from 'vitepress';
import { GraphvizDiagram } from '../../../dist/client/index.js';
import '../../../dist/style.css';

export default {
  extends: DefaultTheme,
  enhanceApp({ app }: EnhanceAppContext) {
    // Required only for client-mode blocks (```dot {client}).
    app.component('GraphvizDiagram', GraphvizDiagram);
  },
};
