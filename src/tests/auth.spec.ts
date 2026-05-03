import { GenericContainer, StartedTestContainer, Wait } from 'testcontainers';
import { makeDB, DB } from '../db';
import { execSync } from 'child_process';
import request from 'supertest';

let container: StartedTestContainer;
let db: DB;
let app: Awaited<ReturnType<typeof buildApp>>;
let url: string;
let otpService: typeof import('../services/otp/service').default;

const APP_PORT = 5000;

async function loadApp() {
    const { buildApp } = await import('../app');
    otpService = (await import('../services/otp/service')).default;
    return buildApp();
}

beforeAll(async () => {
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
    process.env.DB_PORT = mappedPort.toString();
    process.env.DB_USER = 'test';
    process.env.DB_PASSWORD = 'test';
    process.env.DB_NAME = 'chat';

    jest.resetModules();

    db = makeDB({
        host: 'localhost',
        port: mappedPort,
        username: 'test',
        password: 'test',
        name: 'chat',
    });

    await db.query('DROP SCHEMA public CASCADE');
    await db.query('CREATE SCHEMA public');

    const connectionUrl = `postgresql://test:test@localhost:${mappedPort}/chat`;
    execSync(`ts-node scripts/migrate.ts ${connectionUrl}`, { stdio: 'inherit' });

    app = await loadApp();
    await app.listen({ port: APP_PORT, host: '0.0.0.0' });
    url = `http://localhost:${APP_PORT}`;
}, 30_000);

afterAll(async () => {
    await app.close();
    await container.stop({ remove: true, timeout: 5000 });
}, 15_000);

import type { buildApp } from '../app';
import { beforeAll, afterAll, expect, describe, jest, it } from '@jest/globals';

describe('Auth API', () => {
    const mockOtp = '123456';

    beforeAll(() => {
        jest.spyOn(otpService, 'generateOtp').mockReturnValue(mockOtp);
    });

    describe('POST /auth/register', () => {
        const registerPayload = {
            email: 'test@example.com',
            nickname: 'Test User',
            tag: 'testuser',
            password: 'Test123!',
        };

        it('should register a new user and return access token', async () => {
            const response = await request(url)
                .post('/auth/register')
                .send(registerPayload)
                .expect(200);

            expect(response.body).toHaveProperty('token');
        });

        it('should reject duplicate email', async () => {
            const response = await request(url)
                .post('/auth/register')
                .send({
                    ...registerPayload,
                    nickname: 'Another User',
                    tag: 'anotheruser',
                })
                .expect(400);

            expect(response.body.message).toContain('email');
        });

        it('should reject duplicate tag', async () => {
            const response = await request(url)
                .post('/auth/register')
                .send({
                    ...registerPayload,
                    email: 'another@example.com',
                })
                .expect(400);

            expect(response.body.message).toContain('tag');
        });
    });

    describe('POST /auth/login', () => {
        it('should login with valid credentials', async () => {
            const response = await request(url)
                .post('/auth/login')
                .send({
                    emailOrTag: 'testuser',
                    password: 'Test123!',
                })
                .expect(200);

            expect(response.body).toHaveProperty('token');
        });

    });

    describe('GET /auth/me', () => {
        it('should return current user data', async () => {
            const loginResponse = await request(url)
                .post('/auth/login')
                .send({
                    emailOrTag: 'testuser',
                    password: 'Test123!',
                });

            const token = loginResponse.body.token;

            const response = await request(url)
                .get('/auth/me')
                .set('authorization', `Bearer ${token}`)
                .expect(200);

            expect(response.body.user.email).toBe('test@example.com');
        });

        it('should reject request without token', async () => {
            await request(url)
                .get('/auth/me')
                .expect(401);
        });
    });
});
