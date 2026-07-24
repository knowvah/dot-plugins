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
  // core + dot-react are runtime deps; react/@knowvah/dot-engine are peers;
  // unist-util-visit resolves at the consumer. All external, not bundled.
  external: [
    '@knowvah/dot-core',
    '@knowvah/dot-core/browser',
    '@knowvah/dot-react',
    '@knowvah/dot-engine',
    'react',
    'react/jsx-runtime',
    'unist-util-visit',
  ],
});
