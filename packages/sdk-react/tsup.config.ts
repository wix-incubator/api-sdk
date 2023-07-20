import { defineConfig } from 'tsup';

export default defineConfig([
  {
    name: 'node.js',
    entry: ['src/index.tsx'],
    target: 'node16.20',
    format: ['esm', 'cjs'],
    outDir: 'build',
    dts: {
      resolve: true,
      compilerOptions: {
        composite: false,
      },
    },
  },
  {
    name: 'browser',
    entry: ['src/index.tsx'],
    platform: 'browser',
    target: [
      'chrome60',
      'firefox55',
      'safari12',
      'edge79',
      'ios12',
      // 'last 3 years'
    ],
    format: 'esm',
    outDir: 'build/browser',
  },
]);
