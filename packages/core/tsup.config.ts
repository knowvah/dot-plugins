import { defineConfig } from 'tsup';

export default defineConfig({
  entry: {
    index: 'src/index.ts',
    'browser/index': 'src/browser.ts',
  },
  format: ['esm'],
  dts: true,
  clean: true,
  treeshake: true,
  // graphviz-ts is a peer (the consumer installs it); node builtins stay external.
  external: [
    'graphviz-ts',
    'node:child_process',
    'node:module',
    'node:url',
  ],
});
