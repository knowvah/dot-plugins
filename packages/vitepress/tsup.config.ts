import { defineConfig } from 'tsup';

export default defineConfig({
  entry: {
    index: 'src/index.ts',
    'markdown-it/index': 'src/markdown-it.ts',
    'client/index': 'src/client.ts',
  },
  format: ['esm'],
  dts: true,
  clean: true,
  treeshake: true,
  // The core engine is a runtime dependency; graphviz-ts is a peer; vitepress/
  // markdown-it/vue are host-provided. All resolved at the consumer, not bundled.
  external: [
    '@knowvah/dot-core',
    '@knowvah/dot-core/browser',
    '@knowvah/dot-markdown-it',
    'graphviz-ts',
    'vitepress',
    'markdown-it',
    'vue',
  ],
});
