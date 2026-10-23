import { z } from 'zod';
import '../config/env';
import { prisma } from '../config/prisma';
import { adminAccountSchema } from '../schemas/auth.schema';
import { createInitialAdmin } from '../services/admin-account.service';
import { AppError } from '../lib/errors';

const flags = z.object({
  ADMIN_RESET_PASSWORD: z.enum(['true', 'false']).optional(),
});

async function main() {
  const account = adminAccountSchema.parse({
    name: process.env.ADMIN_NAME,
    email: process.env.ADMIN_EMAIL,
    password: process.env.ADMIN_PASSWORD,
  });
  const reset = flags.parse({ ADMIN_RESET_PASSWORD: process.env.ADMIN_RESET_PASSWORD });
  const user = await createInitialAdmin({
    ...account,
    resetPassword: reset.ADMIN_RESET_PASSWORD === 'true',
  });
  console.log(`Administrador disponível: ${user.email} (${user.role}).`);
}

main()
  .catch((error: unknown) => {
  if (error instanceof AppError) {
    console.error(error.message);
    process.exitCode = 1;
    return;
  }
  if (error instanceof z.ZodError) {
    console.error('Não foi possível criar o administrador. Confira ADMIN_NAME, ADMIN_EMAIL e ADMIN_PASSWORD em server/.env.');
    for (const issue of error.issues) {
      console.error(`- ${issue.path.join('.')}: ${issue.message}`);
    }
    process.exitCode = 1;
    return;
  }
  console.error('Falha ao criar o administrador.');
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
