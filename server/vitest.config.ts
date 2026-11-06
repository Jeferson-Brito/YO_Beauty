import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'node',
    fileParallelism: false,
    globalSetup: './tests/global-setup.ts',
    setupFiles: ['./tests/setup.ts'],
    testTimeout: 20000,
    hookTimeout: 30000,
    env: {
      NODE_ENV: 'test',
      DATABASE_URL: 'postgresql://yo_test:yo_test_only@127.0.0.1:55439/yo_beauty_test',
      CLIENT_ORIGIN: 'http://localhost:5173',
      SESSION_SECRET: 'segredo-de-teste-sessao-yo',
      ANALYTICS_HASH_SECRET: 'segredo-de-teste-analytics-yo',
      STORE_TIMEZONE: 'America/Recife',
      SESSION_DAYS: '7',
    },
  },
});
