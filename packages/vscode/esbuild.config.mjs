// SPDX-License-Identifier: MIT
// Bundle the extension host into a single CJS file. `vscode` is provided by the
// runtime and must stay external; everything else (@knowvah/dot-core,
// graphviz-ts) is inlined so the .vsix ships with no node_modules.
import * as esbuild from 'esbuild';

const watch = process.argv.includes('--watch');

/** @type {import('esbuild').BuildOptions} */
const options = {
  // extension.ts → the host; render-worker.ts → the terminable render thread.
  entryPoints: {
    extension: 'src/extension.ts',
    'render-worker': 'src/render-worker.ts',
  },
  outdir: 'dist',
  bundle: true,
  format: 'cjs',
  platform: 'node',
  target: 'node18',
  external: ['vscode'],
  sourcemap: true,
  minify: !watch,
  logLevel: 'info',
  // dot-core's `import.meta.url` lives only in its child-process timeout helper,
  // which this extension never invokes (no `timeout` is configured). Silence the
  // benign "import.meta in CJS" warning for that dead path.
  logOverride: { 'empty-import-meta': 'silent' },
};

if (watch) {
  const ctx = await esbuild.context(options);
  await ctx.watch();
  console.log('[dot-vscode] watching…');
} else {
  await esbuild.build(options);
}
