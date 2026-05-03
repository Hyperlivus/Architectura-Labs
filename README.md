# Chat API (Fastify + TypeScript + PostgreSQL)

REST API для чату з авторизацією, чатами, учасниками та повідомленнями.

## Вимоги

- Node.js 20+
- npm 10+
- PostgreSQL 15+ (локально або в Docker)

## Швидкий старт

1. Скопіюйте приклад змінних оточення:

```bash
cp .env.example .env
```

2. Встановіть залежності:

```bash
npm install
```

3. Налаштуйте доступ до БД.

Проєкт читає такі змінні:

- `DB_HOST`
- `DB_PORT`
- `DB_USER`
- `DB_PASSWORD`
- `DB_NAME`
- `PORT`

> Примітка: у `.env.example` зараз наведено `DATABASE_URL`, але в коді використовується набір `DB_*`.

4. Запустіть міграції:

```bash
npm run migrate
```

5. Запустіть застосунок у dev-режимі:

```bash
npm run dev
```

API буде доступний за адресою `http://localhost:<PORT>`.

## Запуск у production

```bash
npm run build
npm start
```

## Тести

### Unit + Integration

```bash
npx jest src/tests/unit src/tests/integration --runInBand
```

### Тільки unit

```bash
npx jest src/tests/unit --runInBand
```

### Тільки integration

```bash
npx jest src/tests/integration --runInBand
```

## Міграції

Створити нову міграцію:

```bash
npm run create-migration -- <migration_name>
```

Застосувати міграції:

```bash
npm run migrate
```

Відкотити останню міграцію:

```bash
npm run migrate:rollback
```

## Основні endpoint-и

### Авторизація

- `POST /auth/register`
- `POST /auth/login`
- `GET /auth/me`
- `POST /auth/request-otp`
- `POST /auth/verify-otp`

### Чати

- `GET /chats`
- `POST /chats`
- `PATCH /chats/:chatId`

### Учасники чату

- `POST /chats/:chatId/members`
- `GET /chats/:chatId/members`
- `DELETE /chats/:chatId/members/:memberId`
- `PATCH /chats/:chatId/members/:memberId/permissions`

### Повідомлення

- `POST /chats/:chatId/messages`
- `GET /chats/:chatId/messages`
- `PATCH /chats/:chatId/messages/:messageId`
- `DELETE /chats/:chatId/messages/:messageId`

## Архітектура

У модулях реалізовано підхід CQRS:

- `queries` — операції читання
- `commands` — операції запису

Це дозволяє чітко розділити бізнес-логіку, спростити тестування та подальшу еволюцію API.
