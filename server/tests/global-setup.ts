import { execSync } from 'node:child_process';
import { rmSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const here = typeof __dirname !== 'undefined' ? __dirname : path.dirname(fileURLToPath(import.meta.url));
const serverRoot = path.resolve(here, '..');
const databaseFile = path.join(serverRoot, 'prisma', 'test.db');

export default function setup() {
  rmSync(databaseFile, { force: true });
  rmSync(`${databaseFile}-journal`, { force: true });

  const env = {
    ...process.env,
    NODE_ENV: 'test',
    DATABASE_URL: 'file:./test.db',
    CLIENT_ORIGIN: 'http://localhost:5173',
    SESSION_SECRET: 'segredo-de-teste-sessao-yo',
    ANALYTICS_HASH_SECRET: 'segredo-de-teste-analytics-yo',
    STORE_TIMEZONE: 'America/Recife',
    SEED_DEMO: 'true',
  };

  execSync('npx prisma migrate deploy', { cwd: serverRoot, env, stdio: 'inherit' });
  execSync('npx tsx prisma/seed.ts', { cwd: serverRoot, env, stdio: 'inherit' });
}
