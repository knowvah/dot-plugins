import { defineConfig } from 'tsup';

export default defineConfig({
  entry: {
    index: 'src/index.ts',
    'client/index': 'src/client.tsx',
  },
  format: ['esm'],
  dts: true,
  clean: true,
  treeshake: true,
  // core is a runtime dep; react/graphviz-ts are peers; unist-util-visit is a
  // runtime dep resolved at the consumer. All external, not bundled.
  external: [
    '@knowvah/dot-core',
    '@knowvah/dot-core/browser',
    'graphviz-ts',
    'react',
    'react/jsx-runtime',
    'unist-util-visit',
  ],
});
