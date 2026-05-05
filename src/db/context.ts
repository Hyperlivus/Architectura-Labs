import { AsyncLocalStorage } from 'node:async_hooks';
import type { DB } from './index';

export const transactionAls = new AsyncLocalStorage<DB>();

let rootDb: DB | undefined;

export function configureDb(db: DB): void {
  rootDb = db;
}

export function getDb(): DB {
  const active = transactionAls.getStore();
  if (active) {
    return active;
  }
  if (!rootDb) {
    throw new Error('Database is not configured. Import providers/db before using getDb().');
  }
  return rootDb;
}
