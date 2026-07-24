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
  // workspace deps + @knowvah/dot-engine peer + markdown-it/eleventy host — all external.
  external: [
    '@knowvah/dot-core',
    '@knowvah/dot-core/element',
    '@knowvah/dot-markdown-it',
    '@knowvah/dot-engine',
    'markdown-it',
    '@11ty/eleventy',
  ],
});
