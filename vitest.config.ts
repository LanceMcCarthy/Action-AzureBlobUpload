import {defineConfig} from 'vitest/config';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    include: ['**/*.test.ts'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html', 'lcov', 'clover'],
      include: ['src/**/*.ts'],
      exclude: ['node_modules/', '__tests__/**', '__mocks__/**', 'dist/**', 'lib/**', 'TestFiles/**']
    },
    alias: {
      '@actions/core': new URL('./__mocks__/actions-core.ts', import.meta.url).pathname
    }
  }
});
