import { Pool, PoolClient, QueryResult, QueryResultRow } from 'pg';
import { transactionAls } from './context';

export type DBClient = PoolClient;

export type DB<T extends QueryResultRow = QueryResultRow> = {
  connectionString: string;
  connect: () => Promise<DBClient>;
  disconnect: () => Promise<void>;
  query: <U extends T>(text: string, params?: unknown[]) => Promise<QueryResult<U>>;
  any: <U extends T>(text: string, params?: unknown[]) => Promise<U[]>;
  maybeOne: <U extends T>(text: string, params?: unknown[]) => Promise<U | null>;
  one: <U extends T>(text: string, params?: unknown[]) => Promise<U>;
  many: <U extends T>(text: string, params?: unknown[]) => Promise<U[]>;
};

export type DBWithTransaction<T extends QueryResultRow = QueryResultRow> = DB<T> & {
  withTransaction<R>(fn: () => Promise<R>): Promise<R>;
};

export type DBOptions =
  | {
      host?: string;
      port: number;
      name: string;
      username: string;
      password: string;
    }
  | {
      connectionString: string;
    };

export function buildConnectionUrl(options: DBOptions): string {
  if ('connectionString' in options) {
    return options.connectionString;
  }
  const host = options.host || 'localhost';
  return `postgresql://${options.username}:${options.password}@${host}:${options.port}/${options.name}`;
}

function createQueryMethods(
  exec: (text: string, params?: unknown[]) => Promise<QueryResult>,
): Pick<DB, 'query' | 'any' | 'maybeOne' | 'one' | 'many'> {
  async function query<U extends QueryResultRow>(text: string, params: unknown[] = []): Promise<QueryResult<U>> {
    const result = await exec(text, params);
    return result as QueryResult<U>;
  }

  async function any<U extends QueryResultRow>(text: string, params: unknown[] = []): Promise<U[]> {
    const result = await query<U>(text, params);
    return result.rows;
  }

  async function maybeOne<U extends QueryResultRow>(text: string, params: unknown[] = []): Promise<U | null> {
    const rows = await any<U>(text, params);
    return rows[0] ?? null;
  }

  async function one<U extends QueryResultRow>(text: string, params: unknown[] = []): Promise<U> {
    const rows = await any<U>(text, params);
    if (rows.length !== 1) {
      throw new Error(`Expected one row, but got ${rows.length}`);
    }
    return rows[0];
  }

  async function many<U extends QueryResultRow>(text: string, params: unknown[] = []): Promise<U[]> {
    const rows = await any<U>(text, params);
    if (rows.length === 0) {
      throw new Error('Expected many rows, but got zero');
    }
    return rows;
  }

  return { query, any, maybeOne, one, many };
}

export function makeDB<T extends QueryResultRow = QueryResultRow>(options: DBOptions): DBWithTransaction<T> {
  const connectionUrl = buildConnectionUrl(options);

  if (!connectionUrl) {
    throw new Error('connectionString is required to create a DB instance.');
  }

  const pool = new Pool({ connectionString: connectionUrl });

  const poolQueryMethods = createQueryMethods(async (text, params = []) => {
    const client = await pool.connect();
    try {
      return await client.query(text, params);
    } finally {
      client.release();
    }
  });

  async function connect(): Promise<DBClient> {
    return pool.connect();
  }

  async function disconnect(): Promise<void> {
    await pool.end();
  }

  async function withTransaction<R>(fn: () => Promise<R>): Promise<R> {
    if (transactionAls.getStore()) {
      return fn();
    }

    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      const clientQueryMethods = createQueryMethods((text, params = []) => client.query(text, params));

      const txDb: DB<T> = {
        connectionString: connectionUrl,
        connect: async () => client,
        disconnect: async () => {
          /* no-op: managed by outer withTransaction */
        },
        ...clientQueryMethods,
      };

      return await transactionAls.run(txDb, async () => {
        try {
          const result = await fn();
          await client.query('COMMIT');
          return result;
        } catch (err) {
          await client.query('ROLLBACK');
          throw err;
        }
      });
    } finally {
      client.release();
    }
  }

  return {
    connectionString: connectionUrl,
    connect,
    disconnect,
    withTransaction,
    ...poolQueryMethods,
  };
}
