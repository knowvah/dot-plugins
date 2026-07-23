import { defineConfig } from 'tsup';

export default defineConfig({
  entry: {
    index: 'src/index.ts',
    'client/index': 'src/client.ts',
  },
  format: ['esm'],
  dts: true,
  clean: true,
  treeshake: true,
  // workspace deps + graphviz-ts peer + markdown-it/eleventy host — all external.
  external: [
    '@knowvah/dot-core',
    '@knowvah/dot-core/element',
    '@knowvah/dot-markdown-it',
    'graphviz-ts',
    'markdown-it',
    '@11ty/eleventy',
  ],
});
