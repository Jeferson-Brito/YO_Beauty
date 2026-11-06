import { execSync } from 'node:child_process';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import EmbeddedPostgres from 'embedded-postgres';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const here = typeof __dirname !== 'undefined' ? __dirname : path.dirname(fileURLToPath(import.meta.url));
const serverRoot = path.resolve(here, '..');
export default async function setup() {
  const databaseDir = mkdtempSync(path.join(tmpdir(), 'yo-beauty-test-'));
  const pg = new EmbeddedPostgres({
    databaseDir, user: 'yo_test', password: 'yo_test_only', port: 55439,
    persistent: false, initdbFlags: ['--encoding=UTF8', '--locale=C'], postgresFlags: ['-h', '127.0.0.1'],
    onLog: () => {}, onError: () => {},
  });
  const cleanup = async () => { await pg.stop(); rmSync(databaseDir, { recursive: true, force: true }); };
  const env = {
    ...process.env,
    NODE_ENV: 'test',
    DATABASE_URL: 'postgresql://yo_test:yo_test_only@127.0.0.1:55439/yo_beauty_test',
    CLIENT_ORIGIN: 'http://localhost:5173',
    SESSION_SECRET: 'segredo-de-teste-sessao-yo',
    ANALYTICS_HASH_SECRET: 'segredo-de-teste-analytics-yo',
    STORE_TIMEZONE: 'America/Recife',
    SEED_DEMO: 'true',
  };

  try {
    await pg.initialise();
    await pg.start();
    await pg.createDatabase('yo_beauty_test');
    execSync('npx prisma migrate deploy', { cwd: serverRoot, env, stdio: 'inherit' });
    execSync('npx tsx prisma/seed.ts', { cwd: serverRoot, env, stdio: 'inherit' });
    return cleanup;
  } catch (error) { await cleanup(); throw error; }
}
