import { defineConfig } from 'tsup';

export default defineConfig({
  entry: {
    index: 'src/index.ts',
  },
  format: ['esm'],
  dts: true,
  clean: true,
  treeshake: true,
  // core is a runtime dependency; graphviz-ts is a peer; markdown-it/eleventy are
  // host-provided. All resolved at the consumer, not bundled.
  external: ['@knowvah/dot-core', 'graphviz-ts', 'markdown-it', '@11ty/eleventy'],
});
