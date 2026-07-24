import { defineConfig } from 'tsup';

export default defineConfig({
  entry: {
    index: 'src/index.ts',
    'browser/index': 'src/browser.ts',
    'element/index': 'src/element.ts',
  },
  format: ['esm'],
  dts: true,
  clean: true,
  treeshake: true,
  // @knowvah/dot-engine is a peer (the consumer installs it); node builtins stay external.
  external: [
    '@knowvah/dot-engine',
    'node:child_process',
    'node:module',
    'node:url',
  ],
});
