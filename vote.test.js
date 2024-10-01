import request from 'supertest';
import app from './server';  // Caminho correto para o arquivo do servidor
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

beforeAll(async () => {
  // Opcional: Limpe as tabelas antes de rodar os testes
  await prisma.votes.deleteMany({});
  await prisma.voters.deleteMany({});
});

afterAll(async () => {
  // Fecha a conexão com o Prisma após todos os testes
  await prisma.$disconnect();
});

describe('Testes para rotas de votação', () => {
  it('Deve registrar um novo eleitor', async () => {
    const response = await request(app)
      .post('/')
      .send({
        name: 'João Silva',
        cpf: '12345678900',
      });

    expect(response.statusCode).toBe(201);
    expect(response.body).toHaveProperty('message', 'Eleitor registrado com sucesso.');
    expect(response.body).toHaveProperty('numTitle');
  });

  it('Deve retornar erro ao tentar registrar eleitor com CPF duplicado', async () => {
    await request(app)
      .post('/')
      .send({
        name: 'João Silva',
        cpf: '12345678900',
      });

    const response = await request(app)
      .post('/')
      .send({
        name: 'João Silva',
        cpf: '12345678900',
      });

    expect(response.statusCode).toBe(400);
    expect(response.body).toHaveProperty('error', 'Eleitor já cadastrado.');
  });

  it('Deve computar um voto com sucesso', async () => {
    // Primeiro, registre um eleitor
    const voterResponse = await request(app)
      .post('/')
      .send({
        name: 'Maria Souza',
        cpf: '98765432100',
      });

    const numTitle = voterResponse.body.numTitle;

    // Agora, registre um voto para esse eleitor
    const voteResponse = await request(app)
      .post('/vote')
      .send({
        candidate_id: 1,
        numTitle,
      });

    expect(voteResponse.statusCode).toBe(201);
    expect(voteResponse.body).toHaveProperty('message', 'Voto computado com sucesso.');
  });

  it('Deve retornar erro ao tentar votar com título inválido', async () => {
    const response = await request(app)
      .post('/vote')
      .send({
        candidate_id: 1,
        numTitle: '000000',
      });

    expect(response.statusCode).toBe(401);
    expect(response.body).toHaveProperty('error', 'Eleitor não encontrado ou título de eleitor incorreto.');
  });

  it('Deve retornar erro ao tentar votar mais de uma vez', async () => {
    // Primeiro, registre um eleitor
    const voterResponse = await request(app)
      .post('/')
      .send({
        name: 'Carlos Pereira',
        cpf: '11122233344',
      });

    const numTitle = voterResponse.body.numTitle;

    // Registra o primeiro voto
    await request(app)
      .post('/vote')
      .send({
        candidate_id: 1,
        numTitle,
      });

    // Tenta votar novamente
    const response = await request(app)
      .post('/vote')
      .send({
        candidate_id: 1,
        numTitle,
      });

    expect(response.statusCode).toBe(401);
    expect(response.body).toHaveProperty('error', 'Voto já computado.');
  });

  it('Deve retornar os resultados da votação', async () => {
    const response = await request(app).get('/results');

    expect(response.statusCode).toBe(200);
    expect(response.body.results).toBeInstanceOf(Array);
  });
});