import { mkdir, unlink, writeFile } from 'node:fs/promises';
import path from 'node:path';
import type { StorageProvider, StoredObject } from './storage-provider';

const uploadRoot = path.resolve(__dirname, '../../uploads');

function resolveInside(key: string): string {
  const target = path.resolve(uploadRoot, key);
  const relative = path.relative(uploadRoot, target);
  if (relative.startsWith('..') || path.isAbsolute(relative)) {
    throw new Error('Caminho de arquivo inválido.');
  }
  return target;
}

export const localDiskStorage: StorageProvider = {
  async save(input): Promise<StoredObject> {
    const target = resolveInside(input.key);
    await mkdir(path.dirname(target), { recursive: true });
    await writeFile(target, input.data);
    return { key: input.key, url: `/uploads/${input.key.replaceAll('\\', '/')}` };
  },

  async delete(key: string): Promise<void> {
    const target = resolveInside(key);
    await unlink(target).catch(() => undefined);
  },
};
