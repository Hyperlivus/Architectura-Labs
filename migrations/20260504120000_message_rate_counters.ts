import { DB } from '../src/db';

const migration = {
  async up(db: DB): Promise<void> {
    await db.query(`
      CREATE TABLE IF NOT EXISTS message_rate_counters (
        user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        bucket_start TIMESTAMPTZ NOT NULL,
        message_count INTEGER NOT NULL DEFAULT 0,
        PRIMARY KEY (user_id, bucket_start)
      )
    `);
    await db.query(`
      CREATE INDEX IF NOT EXISTS idx_message_rate_counters_bucket
      ON message_rate_counters (bucket_start)
    `);
  },

  async down(db: DB): Promise<void> {
    await db.query('DROP TABLE IF EXISTS message_rate_counters');
  },
};

export default migration;
