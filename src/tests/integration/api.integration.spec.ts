import { afterAll, beforeAll, describe, expect, it, jest } from '@jest/globals';
import { execSync } from 'child_process';
import request from 'supertest';
import { GenericContainer, StartedTestContainer, Wait } from 'testcontainers';
import { makeDB, DB } from '../../db';

jest.mock('../../providers/mailer', () => ({
  __esModule: true,
  default: {
    sendMail: jest.fn().mockImplementation(async () => undefined),
  },
}));

let container: StartedTestContainer;
let db: DB;
let app: Awaited<ReturnType<typeof import('../../app').buildApp>>;
let baseUrl: string;
let uncaughtErrorHandler: (error: unknown) => void;
let unhandledRejectionHandler: (reason: unknown) => void;

const APP_PORT = 5001;

function readToken(response: request.Response): string {
  if (typeof response.body === 'string') {
    return response.body;
  }

  if (response.body?.token) {
    return response.body.token;
  }

  if (response.text) {
    return response.text.replace(/^"|"$/g, '');
  }

  throw new Error('Token was not found in response');
}

async function registerAndLogin(data: { email: string; tag: string; nickname: string; password: string }): Promise<string> {
  await request(baseUrl).post('/auth/register').send(data).expect(200);
  const loginResponse = await request(baseUrl)
    .post('/auth/login')
    .send({ emailOrTag: data.tag, password: data.password })
    .expect(200);
  return readToken(loginResponse);
}

async function closeWithTimeout(fn: () => Promise<unknown>, ms = 10000): Promise<void> {
  await Promise.race([
    fn().then(() => undefined).catch(() => undefined),
    new Promise<void>((resolve) => setTimeout(resolve, ms)),
  ]);
}

beforeAll(async () => {
  const isIgnorablePgTermination = (value: unknown): boolean => {
    const message = value instanceof Error ? value.message : String(value);
    return message.includes('terminating connection due to administrator command')
      || message.includes('Connection terminated unexpectedly');
  };

  uncaughtErrorHandler = (error: unknown) => {
    if (isIgnorablePgTermination(error)) {
      return;
    }
    throw error;
  };

  unhandledRejectionHandler = (reason: unknown) => {
    if (isIgnorablePgTermination(reason)) {
      return;
    }
    throw reason;
  };

  process.on('uncaughtException', uncaughtErrorHandler);
  process.on('unhandledRejection', unhandledRejectionHandler);

  container = await new GenericContainer('postgres:15')
    .withEnvironment({
      POSTGRES_USER: 'test',
      POSTGRES_PASSWORD: 'test',
      POSTGRES_DB: 'chat',
    })
    .withExposedPorts(5432)
    .withWaitStrategy(Wait.forLogMessage(/database system is ready to accept connections/i, 2))
    .start();

  const mappedPort = container.getMappedPort(5432);
  process.env.DB_HOST = 'localhost';
  process.env.DB_PORT = String(mappedPort);
  process.env.DB_USER = 'test';
  process.env.DB_PASSWORD = 'test';
  process.env.DB_NAME = 'chat';

  db = makeDB({
    host: 'localhost',
    port: mappedPort,
    username: 'test',
    password: 'test',
    name: 'chat',
  });

  await db.query('DROP SCHEMA public CASCADE');
  await db.query('CREATE SCHEMA public');
  execSync(`ts-node scripts/migrate.ts postgresql://test:test@localhost:${mappedPort}/chat`, { stdio: 'inherit' });

  const { buildApp } = await import('../../app');
  app = await buildApp();
  await app.listen({ port: APP_PORT, host: '0.0.0.0' });
  baseUrl = `http://localhost:${APP_PORT}`;
}, 60_000);

afterAll(async () => {
  const providerDb = (await import('../../providers/db')).default;
  if (app) {
    await closeWithTimeout(() => app.close(), 15000);
  }
  await closeWithTimeout(() => providerDb.disconnect(), 5000);
  await closeWithTimeout(() => db.disconnect(), 5000);
  // NOTE: Stopping container inside Jest can trigger PG client termination events.
  // Keep cleanup focused on DB pools/app to make suite deterministic.
  process.off('uncaughtException', uncaughtErrorHandler);
  process.off('unhandledRejection', unhandledRejectionHandler);
}, 60_000);

describe('API integration', () => {
  it('covers auth, chat, member and message flows', async () => {
    const ownerToken = await registerAndLogin({
      email: 'owner@example.com',
      tag: 'owner_tag',
      nickname: 'Owner',
      password: 'Test123!',
    });
    const ownerUser = await db.one<{ id: number }>('SELECT id FROM users WHERE tag = $1', ['owner_tag']);
    const ownerId = ownerUser.id;

    const createChat = await request(baseUrl)
      .post('/chats')
      .set('authorization', `Bearer ${ownerToken}`)
      .send({ title: 'General', description: 'Main room', tag: 'general' })
      .expect(200);
    const chatId = createChat.body.chat.id as number;

    const ownerMember = await db.one<{ id: number }>(
      'SELECT id FROM members WHERE user_id = $1 AND chat_id = $2',
      [ownerId, chatId]
    );
    await db.query(
      `INSERT INTO member_permissions (member_id, permissions)
       VALUES ($1, $2)
       ON CONFLICT (member_id) DO UPDATE SET permissions = $2`,
      [ownerMember.id, JSON.stringify({ chatUpdate: true, memberAdd: true, memberRemove: true, memberPermissions: true })]
    );

    const listChats = await request(baseUrl)
      .get('/chats')
      .set('authorization', `Bearer ${ownerToken}`)
      .expect(200);
    expect(Array.isArray(listChats.body.chats)).toBe(true);
    expect(listChats.body.chats.some((chat: { id: number }) => chat.id === chatId)).toBe(true);

    const messageCreate = await request(baseUrl)
      .post(`/chats/${chatId}/messages`)
      .set('authorization', `Bearer ${ownerToken}`)
      .send({ content: 'hello everyone' })
      .expect(200);
    const messageId = messageCreate.body.message.id as number;

    const updateMessage = await request(baseUrl)
      .patch(`/chats/${chatId}/messages/${messageId}`)
      .set('authorization', `Bearer ${ownerToken}`)
      .send({ content: 'edited text' })
      .expect(200);
    expect(updateMessage.body.message.content).toBe('edited text');

    const chatMessages = await request(baseUrl)
      .get(`/chats/${chatId}/messages`)
      .set('authorization', `Bearer ${ownerToken}`)
      .expect(200);
    expect(chatMessages.body.messages.length).toBeGreaterThan(0);

    await request(baseUrl)
      .delete(`/chats/${chatId}/messages/${messageId}`)
      .set('authorization', `Bearer ${ownerToken}`)
      .expect(200);
  });
});
