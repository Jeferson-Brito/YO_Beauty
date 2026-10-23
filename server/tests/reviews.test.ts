import request from 'supertest';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { app } from '../src/app';
import { prisma } from '../src/config/prisma';

const email = 'avaliacao.teste@yobeauty.local';

describe('avaliações de produto', () => {
  beforeAll(async () => {
    await prisma.user.deleteMany({ where: { email } });
  });

  afterAll(async () => {
    await prisma.user.deleteMany({ where: { email } });
  });

  it('lista vazio, publica e atualiza a avaliação do cliente', async () => {
    const empty = await request(app).get('/api/products/gloss-labial-brilho-intenso/reviews');
    expect(empty.status).toBe(200);
    expect(empty.body.data.summary).toEqual({ average: null, count: 0 });
    expect(empty.body.data.reviews).toEqual([]);

    const anonymous = await request(app).post('/api/products/gloss-labial-brilho-intenso/reviews').send({
      rating: 5,
      comment: 'Amei o brilho.',
    });
    expect(anonymous.status).toBe(401);

    const agent = request.agent(app);
    const registered = await agent.post('/api/auth/register').send({
      name: 'Ana Avaliacao',
      email,
      password: 'Cliente123',
    });
    expect(registered.status).toBe(201);

    const created = await agent.post('/api/products/gloss-labial-brilho-intenso/reviews').send({
      rating: 5,
      comment: 'Amei o brilho.',
    });
    expect(created.status).toBe(200);
    expect(created.body.data.rating).toBe(5);

    const listed = await agent.get('/api/products/gloss-labial-brilho-intenso/reviews');
    expect(listed.body.data.summary).toEqual({ average: 5, count: 1 });
    expect(listed.body.data.mine.comment).toBe('Amei o brilho.');
    expect(listed.body.data.reviews[0].authorName).toBe('Ana Avaliacao');
    expect(listed.body.data.reviews[0].mine).toBe(true);

    const updated = await agent.post('/api/products/gloss-labial-brilho-intenso/reviews').send({
      rating: 4,
      comment: 'Ficou lindo no dia a dia.',
    });
    expect(updated.status).toBe(200);
    const again = await agent.get('/api/products/gloss-labial-brilho-intenso/reviews');
    expect(again.body.data.summary).toEqual({ average: 4, count: 1 });
    expect(again.body.data.reviews).toHaveLength(1);

    const invalid = await agent.post('/api/products/gloss-labial-brilho-intenso/reviews').send({
      rating: 6,
      comment: 'Nota inválida',
    });
    expect(invalid.status).toBe(422);

    const reviewId = again.body.data.reviews[0].id as string;
    const removed = await agent.delete(`/api/products/gloss-labial-brilho-intenso/reviews/${reviewId}`);
    expect(removed.status).toBe(204);
    const after = await request(app).get('/api/products/gloss-labial-brilho-intenso/reviews');
    expect(after.body.data.summary.count).toBe(0);
  });
});
