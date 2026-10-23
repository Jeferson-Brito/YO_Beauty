import { z } from 'zod';

const itemSchema = z.object({
  productId: z.string().trim().min(1).max(80),
  quantity: z.number().int().min(1),
});

export const quoteSchema = z.object({
  items: z.array(itemSchema).min(1).max(30),
});

const states = new Set([
  'AC', 'AL', 'AP', 'AM', 'BA', 'CE', 'DF', 'ES', 'GO', 'MA', 'MT', 'MS', 'MG',
  'PA', 'PB', 'PR', 'PE', 'PI', 'RJ', 'RN', 'RS', 'RO', 'RR', 'SC', 'SP', 'SE', 'TO',
]);

export const checkoutSchema = quoteSchema.extend({
  phone: z.string().trim().min(8, 'Informe um telefone para a entrega.').max(20),
  paymentMethod: z.enum(['cash', 'pix', 'credit', 'debit'], {
    errorMap: () => ({ message: 'Escolha a forma de pagamento.' }),
  }),
  address: z.object({
    recipientName: z.string().trim().min(2).max(80),
    postalCode: z.string().trim().regex(/^\d{5}-?\d{3}$/, 'Informe o CEP com 8 números.'),
    street: z.string().trim().min(2).max(120),
    number: z.string().trim().min(1).max(20),
    complement: z.string().trim().max(80).optional().default(''),
    neighborhood: z.string().trim().min(2).max(80),
    city: z.string().trim().min(2).max(80),
    state: z
      .string()
      .trim()
      .length(2)
      .transform((value) => value.toUpperCase())
      .refine((value) => states.has(value), 'Informe a UF.'),
  }),
});

export const orderListSchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(50).default(20),
  q: z
    .string()
    .trim()
    .max(80)
    .optional()
    .transform((value) => (value ? value : undefined)),
});
