import { defineConfig } from 'tsup';

export default defineConfig({
  entry: {
    index: 'src/index.ts',
    'markdown-it/index': 'src/markdown-it.ts',
  },
  format: ['esm'],
  dts: true,
  clean: true,
  treeshake: true,
  // graphviz-ts is a peer (consumer installs it); vitepress/markdown-it are
  // host-provided. Keep node builtins external.
  external: ['graphviz-ts', 'vitepress', 'markdown-it', 'node:child_process'],
});
