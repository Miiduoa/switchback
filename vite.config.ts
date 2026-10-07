import { defineConfig } from 'vitest/config';

export default defineConfig({
  base: '/switchback/',
  test: { environment: 'jsdom', include: ['src/**/*.test.ts'] },
});
