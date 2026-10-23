import { z } from 'zod';

export const reviewWriteSchema = z.object({
  rating: z.number().int().min(1, 'Escolha de 1 a 5 estrelas.').max(5, 'Escolha de 1 a 5 estrelas.'),
  comment: z.string().trim().min(2, 'Escreva um comentário.').max(600, 'O comentário pode ter até 600 caracteres.'),
});
