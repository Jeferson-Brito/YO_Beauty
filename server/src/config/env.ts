import dotenv from 'dotenv';
import { z } from 'zod';

dotenv.config();

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PORT: z.coerce.number().int().positive().default(3333),
  DATABASE_URL: z.string().min(1),
  CLIENT_ORIGIN: z.string().url().default('http://localhost:5173'),
  SESSION_SECRET: z.string().min(16),
  ANALYTICS_HASH_SECRET: z.string().min(16),
  STORE_TIMEZONE: z.string().min(1).default('America/Recife'),
  SESSION_DAYS: z.coerce.number().int().positive().max(60).default(7),
  GOOGLE_CLIENT_ID: z.string().trim().optional().default(''),
});

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
  const issues = parsed.error.issues.map((issue) => issue.path.join('.') || 'ambiente').join(', ');
  throw new Error(`Variáveis de ambiente inválidas: ${issues}. Confira server/.env a partir de .env.example.`);
}

export const env = parsed.data;

if (env.NODE_ENV === 'production') {
  const usesPlaceholder =
    env.SESSION_SECRET.includes('troque') || env.ANALYTICS_HASH_SECRET.includes('troque');
  if (usesPlaceholder) {
    throw new Error('Os segredos de exemplo não podem ser usados em produção.');
  }
}
