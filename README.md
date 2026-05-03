# Fastify + TypeScript + PostgreSQL REST API

## Setup

1. Copy `.env.example` to `.env` and update `DATABASE_URL`.
2. Install dependencies:

```bash
npm install
```

3. Run database migrations:

```bash
npm run migrate
```

4. Start development server:

```bash
npm run dev
```

5. Build for production:

```bash
npm run build
npm start
```

## Database Migrations

Create a new migration:
```bash
npm run create-migration -- <migration_name>
```

Run pending migrations:
```bash
npm run migrate
```

Rollback last migration:
```bash
npm run migrate:rollback
```

Rollback multiple migrations:
```bash
npm run migrate:rollback 3
```

Migrations are TypeScript files that export an object with `up()` and `down()` methods.

## API Endpoints

- `GET /users` - list users
- `GET /users/:id` - get a user by id
- `POST /users` - create a user
- `PUT /users/:id` - update a user
- `DELETE /users/:id` - delete a user
