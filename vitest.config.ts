import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vitest/config';

// Repo root. '.' because this config sits at the root.
const projectRoot = fileURLToPath(new URL('.', import.meta.url));

export default defineConfig({
  test: {
    projects: ['packages/*'],
    coverage: {
      provider: 'v8',
      include: ['packages/*/src/**'],
      exclude: ['**/*.test.*', '**/fixtures/**', '**/dist/**', '**/*.d.ts'],
      reporter: ['text', 'json-summary', ['cobertura', { projectRoot }]],
      // Ratchet (D5): measured coverage floored to integers. Never lower.
      thresholds: {
        lines: 57,
        branches: 62,
        functions: 53,
        statements: 55,
      },
    },
  },
});
