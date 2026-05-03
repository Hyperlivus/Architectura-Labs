import { Pool, PoolClient, QueryResult, QueryResultRow } from 'pg';

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

export type DBOptions = {
    host?: string;
    port: number;
    name: string;
    username: string;
    password: string;
} | {
    connectionString: string;
};

export function buildConnectionUrl(options: DBOptions): string {
    if ('connectionString' in options) {
        return options.connectionString;
    }
    const host = options.host || 'localhost';
    return `postgresql://${options.username}:${options.password}@${host}:${options.port}/${options.name}`;
}


export function makeDB<T extends QueryResultRow = QueryResultRow>(options: DBOptions): DB<T> {
  const connectionUrl = buildConnectionUrl(options);

  if (!connectionUrl) {
    throw new Error('connectionString is required to create a DB instance.');
  }

  const pool = new Pool({ connectionString: connectionUrl });

  async function connect(): Promise<DBClient> {
    return pool.connect();
  }

  async function disconnect(): Promise<void> {
    await pool.end();
  }

  async function query<T extends QueryResultRow>(text: string, params: unknown[] = []): Promise<QueryResult<T>> {
    const client = await connect();
    try {
      return await client.query<T>(text, params);
    } finally {
      client.release();
    }
  }

  async function any<T extends QueryResultRow>(text: string, params: unknown[] = []): Promise<T[]> {
    const result = await query<T>(text, params);
    return result.rows;
  }

  async function maybeOne<T extends QueryResultRow>(text: string, params: unknown[] = []): Promise<T | null> {
    const rows = await any<T>(text, params);
    return rows[0] ?? null;
  }

  async function one<T extends QueryResultRow>(text: string, params: unknown[] = []): Promise<T> {
    const rows = await any<T>(text, params);
    if (rows.length !== 1) {
      throw new Error(`Expected one row, but got ${rows.length}`);
    }
    return rows[0];
  }

  async function many<T extends QueryResultRow>(text: string, params: unknown[] = []): Promise<T[]> {
    const rows = await any<T>(text, params);
    if (rows.length === 0) {
      throw new Error('Expected many rows, but got zero');
    }
    return rows;
  }

  return {
    connectionString: connectionUrl,
    connect,
    disconnect,
    query,
    any,
    maybeOne,
    one,
    many,
  };
}
