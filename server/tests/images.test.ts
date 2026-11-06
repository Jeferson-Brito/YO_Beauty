import request from 'supertest';
import { PrismaClient } from '@prisma/client';
import { describe, expect, it } from 'vitest';
import { app } from '../src/app';
import { prisma } from '../src/config/prisma';
import { databaseStorage } from '../src/storage/database-storage';

const png = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==', 'base64');

describe('imagens persistentes', () => {
  it('entrega a imagem sem arquivo em disco e continua acessível por outra conexão', async () => {
    const key = 'products/test-persistent-image.png';
    const saved = await databaseStorage.save({ key, contentType: 'image/png', data: png });
    const otherProcess = new PrismaClient();
    try {
      const stored = await otherProcess.storedImage.findUniqueOrThrow({ where: { key } });
      expect(Buffer.from(stored.data)).toEqual(png);
      const response = await request(app).get(saved.url);
      expect(response.status).toBe(200);
      expect(response.headers['content-type']).toMatch(/^image\/png/);
      expect(response.headers['cache-control']).toContain('immutable');
      expect(response.body).toEqual(png);
      await databaseStorage.delete(key);
      expect((await request(app).get(saved.url)).status).toBe(404);
    } finally { await otherProcess.$disconnect(); await databaseStorage.delete(key); }
  });

  it('rejeita caminho inválido e permite consulta de CEP na política de conexões', async () => {
    await expect(databaseStorage.save({ key: '../unsafe.png', contentType: 'image/png', data: png })).rejects.toThrow();
    const response = await request(app).get('/api/health');
    expect(response.headers['content-security-policy']).toMatch(/connect-src[^;]*https:\/\/viacep.com.br/);
  });
});
