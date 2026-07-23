import { defineConfig } from 'tsup';

export default defineConfig({
  entry: {
    index: 'src/index.ts',
  },
  format: ['esm'],
  dts: true,
  clean: true,
  treeshake: true,
  external: ['@knowvah/dot-core', 'graphviz-ts', 'markdown-it'],
});
