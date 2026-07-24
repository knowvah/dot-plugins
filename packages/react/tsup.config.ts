import { defineConfig } from 'tsup';

export default defineConfig({
  entry: {
    index: 'src/index.tsx',
  },
  format: ['esm'],
  dts: true,
  clean: true,
  treeshake: true,
  external: [
    '@knowvah/dot-core',
    '@knowvah/dot-core/browser',
    '@knowvah/dot-engine',
    'react',
    'react/jsx-runtime',
  ],
});
