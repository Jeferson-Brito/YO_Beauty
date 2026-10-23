import { AppError } from '../lib/errors';
import { hashPassword } from '../lib/password';
import { userRepository } from '../repositories/user.repository';

export async function createInitialAdmin(input: {
  name: string;
  email: string;
  password: string;
  resetPassword?: boolean;
}) {
  const existing = await userRepository.findByEmail(input.email);
  if (existing && existing.role !== 'ADMIN') {
    throw new AppError(
      409,
      'Este e-mail pertence a um cliente e não pode ser promovido a administrador por este procedimento.',
      'ADMIN_PROMOTION_BLOCKED',
    );
  }

  if (existing?.role === 'ADMIN' && !input.resetPassword) {
    throw new AppError(
      409,
      'O administrador já existe. Para trocar a senha, repita o comando com ADMIN_RESET_PASSWORD=true.',
      'ADMIN_EXISTS',
    );
  }

  const passwordHash = await hashPassword(input.password);
  if (existing) {
    return userRepository.updatePassword(existing.id, passwordHash);
  }

  return userRepository.create({
    name: input.name,
    email: input.email,
    passwordHash,
    role: 'ADMIN',
  });
}
