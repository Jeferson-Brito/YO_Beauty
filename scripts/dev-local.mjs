import EmbeddedPostgres from 'embedded-postgres';
import { execSync, spawn } from 'node:child_process';
import { existsSync } from 'node:fs';
import path from 'node:path';

const databaseDir = path.resolve('.local/dev-postgres');
const pg = new EmbeddedPostgres({ databaseDir, user: 'yo_local', password: 'yo_local_dev', port: 55440, persistent: true, initdbFlags: ['--encoding=UTF8', '--locale=C'], postgresFlags: ['-h', '127.0.0.1'], onLog: () => {}, onError: console.error });
if (!existsSync(path.join(databaseDir, 'PG_VERSION'))) await pg.initialise();
await pg.start();
const client = pg.getPgClient();
await client.connect();
if (!(await client.query("SELECT 1 FROM pg_database WHERE datname = 'yo_beauty_preview'")).rowCount) await client.query("CREATE DATABASE yo_beauty_preview TEMPLATE template0 ENCODING 'UTF8' LC_COLLATE 'C' LC_CTYPE 'C'");
await client.end();
const env = {
  ...process.env,
  NODE_ENV: 'development',
  DATABASE_URL: 'postgresql://yo_local:yo_local_dev@127.0.0.1:55440/yo_beauty_preview',
  CLIENT_ORIGIN: 'http://localhost:5173', PORT: '3333',
  SESSION_SECRET: 'yo-local-development-session-secret',
  ANALYTICS_HASH_SECRET: 'yo-local-development-analytics-secret',
  SEED_DEMO: 'true',
};
let child;
async function stop() { child?.kill(); await pg.stop(); process.exit(); }
process.on('SIGINT', stop);
process.on('SIGTERM', stop);
try {
  execSync('npx prisma generate', { cwd: path.resolve('server'), env, stdio: 'inherit' });
  execSync('npm run db:setup', { env, stdio: 'inherit' });
  console.log('Prévia local: http://localhost:5173 — banco isolado da produção.');
  child = spawn('npm run dev', { env, stdio: 'inherit', shell: true, windowsHide: true });
  child.on('exit', async code => { await pg.stop(); process.exit(code ?? 0); });
} catch (error) { await pg.stop(); throw error; }
