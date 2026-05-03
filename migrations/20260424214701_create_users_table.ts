import {DB} from "../src/db";

const migration = {
  async up(db: DB) {
    // Migration: create_users_table
    await db.query(`
      CREATE TABLE users (
        id SERIAL PRIMARY KEY,
        nickname VARCHAR(255) NOT NULL,
        email VARCHAR(255) NOT NULL UNIQUE,
        tag VARCHAR(255) NOT NULL UNIQUE,
        password VARCHAR(255) NOT NULL,
        otp VARCHAR(255) DEFAULT '',
        email_verified BOOLEAN DEFAULT FALSE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Create index on email for faster lookups
    await db.query(`
      CREATE INDEX  idx_users_email ON users(email)
    `);

    // Create index on tag for faster lookups
    await db.query(`
      CREATE INDEX  idx_users_tag ON users(tag)
    `);
  },

  async down(db: DB) {
    // Drop the table and its indexes
    await db.query('DROP INDEX IF EXISTS idx_users_tag');
    await db.query('DROP INDEX IF EXISTS idx_users_email');
    await db.query('DROP TABLE IF EXISTS users');
  }
};

export default migration;