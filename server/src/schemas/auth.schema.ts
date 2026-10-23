import { z } from 'zod';

const passwordRules = {
  letter: /[A-Za-z]/,
  number: /[0-9]/,
} as const;

export const registerSchema = z.object({
  name: z.string().trim().min(2, 'Informe o nome.').max(80),
  email: z.string().trim().email('Informe um e-mail válido.').transform((value) => value.toLowerCase()),
  password: z
    .string()
    .min(8, 'A senha deve ter pelo menos 8 caracteres.')
    .max(72, 'A senha deve ter no máximo 72 caracteres.')
    .regex(passwordRules.letter, 'A senha deve conter ao menos uma letra.')
    .regex(passwordRules.number, 'A senha deve conter ao menos um número.'),
});

export const loginSchema = z.object({
  email: z.string().trim().email('Informe um e-mail válido.').transform((value) => value.toLowerCase()),
  password: z.string().min(1, 'Informe a senha.').max(72),
});

export const googleLoginSchema = z.object({
  credential: z.string().trim().min(20).max(8000),
});

export const adminAccountSchema = z.object({
  name: z.string().trim().min(2, 'Informe o nome do administrador.').max(80),
  email: z.string().trim().email('Informe um e-mail válido.').transform((value) => value.toLowerCase()),
  password: z
    .string()
    .min(10, 'A senha do administrador deve ter pelo menos 10 caracteres.')
    .max(72)
    .regex(passwordRules.letter, 'A senha deve conter ao menos uma letra.')
    .regex(passwordRules.number, 'A senha deve conter ao menos um número.'),
});
