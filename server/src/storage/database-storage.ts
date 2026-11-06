import { prisma } from '../config/prisma';
import type { StorageProvider } from './storage-provider';

export function isImageKey(key: string): boolean {
  return /^[a-z0-9-]+\/[a-z0-9-]+\.(jpg|png|webp|gif)$/i.test(key);
}

export const databaseStorage: StorageProvider = {
  async save(input) {
    if (!isImageKey(input.key)) throw new Error('Caminho de imagem inválido.');
    await prisma.storedImage.create({ data: { ...input, data: new Uint8Array(input.data) } });
    return { key: input.key, url: `/uploads/${input.key}` };
  },
  async delete(key) {
    if (!isImageKey(key)) return;
    await prisma.storedImage.deleteMany({ where: { key } });
  },
};
