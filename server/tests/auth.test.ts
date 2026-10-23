import request from 'supertest';
import { describe, expect, it } from 'vitest';
import { app } from '../src/app';
import { prisma } from '../src/config/prisma';
import { userRepository } from '../src/repositories/user.repository';
import { createInitialAdmin } from '../src/services/admin-account.service';

describe('acesso e administrador inicial', () => {
  it('cadastra somente cliente, mesmo se o corpo pedir outro papel', async () => {
    const response = await request(app).post('/api/auth/register').send({
      name: 'Cliente Teste',
      email: 'cliente.teste@yobeauty.local',
      password: 'Cliente123',
      role: 'ADMIN',
    });

    expect(response.status).toBe(201);
    expect(response.body.data.role).toBe('CLIENT');

    const saved = await prisma.user.findUnique({ where: { email: 'cliente.teste@yobeauty.local' } });
    expect(saved?.role).toBe('CLIENT');
    expect(await userRepository.countCustomers()).toBe(1);
  });

  it('nega o painel sem sessão e para cliente autenticado', async () => {
    const anonymous = await request(app).get('/api/admin/ping');
    expect(anonymous.status).toBe(401);

    const agent = request.agent(app);
    const login = await agent.post('/api/auth/login').send({
      email: 'cliente.teste@yobeauty.local',
      password: 'Cliente123',
    });
    expect(login.status).toBe(200);

    const forbidden = await agent.get('/api/admin/ping');
    expect(forbidden.status).toBe(403);

    const me = await agent.get('/api/auth/me');
    expect(me.body.data.email).toBe('cliente.teste@yobeauty.local');

    await agent.post('/api/auth/logout');
    const afterLogout = await agent.get('/api/auth/me');
    expect(afterLogout.status).toBe(401);
  });

  it('cria o administrador pelo procedimento local e não promove cliente', async () => {
    await expect(
      createInitialAdmin({
        name: 'Cliente Promovido',
        email: 'cliente.teste@yobeauty.local',
        password: 'AdminYo1234',
      }),
    ).rejects.toMatchObject({ code: 'ADMIN_PROMOTION_BLOCKED' });

    const admin = await createInitialAdmin({
      name: 'Proprietaria',
      email: 'admin.teste@yobeauty.local',
      password: 'AdminYo1234',
    });
    expect(admin.role).toBe('ADMIN');

    await expect(
      createInitialAdmin({
        name: 'Proprietaria',
        email: 'admin.teste@yobeauty.local',
        password: 'OutraSenha123',
      }),
    ).rejects.toMatchObject({ code: 'ADMIN_EXISTS' });

    const agent = request.agent(app);
    await agent.post('/api/auth/login').send({
      email: 'admin.teste@yobeauty.local',
      password: 'AdminYo1234',
    });
    const ping = await agent.get('/api/admin/ping');
    expect(ping.status).toBe(200);
    expect(await userRepository.countCustomers()).toBe(1);
  });

  it('responde credencial inválida sem revelar se o e-mail existe', async () => {
    const response = await request(app).post('/api/auth/login').send({
      email: 'nao-existe@yobeauty.local',
      password: 'Cliente123',
    });
    expect(response.status).toBe(401);
    expect(response.body.error).toBe('E-mail ou senha inválidos.');
  });

  it('não confirma uma conta Google enquanto o identificador não estiver configurado', async () => {
    const response = await request(app).post('/api/auth/google').send({ credential: 'token-falso-do-google-para-teste' });
    expect(response.status).toBe(503);
    expect(response.body.code).toBe('GOOGLE_NOT_CONFIGURED');
  });

  it('não oferece o atalho de teste fora do desenvolvimento', async () => {
    const response = await request(app).post('/api/auth/dev-login').send({ profile: 'admin' });
    expect(response.status).toBe(404);
  });
});
