import {DB} from "../src/db";

const migration = {
  async up(db: DB) {
    await db.query(`
      CREATE TABLE  chats (
        id SERIAL PRIMARY KEY,
        title VARCHAR(255) NOT NULL,
        description TEXT NOT NULL,
        tag VARCHAR(255) NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    await db.query(`
      CREATE TABLE  members (
        id SERIAL PRIMARY KEY,
        user_id INTEGER NOT NULL REFERENCES users(id),
        chat_id INTEGER NOT NULL REFERENCES chats(id),
        banned BOOLEAN DEFAULT FALSE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(user_id, chat_id)
      )
    `);

    await db.query(`
      CREATE TABLE  member_permissions (
        member_id INTEGER PRIMARY KEY REFERENCES members(id) ON DELETE CASCADE,
        permissions JSONB NOT NULL DEFAULT '{}'
      )
    `);

    await db.query(`
      CREATE INDEX  idx_chats_tag ON chats(tag)`);
    await db.query(`
      CREATE INDEX  idx_members_user_chat ON members(user_id, chat_id)
    `);
  },

  async down(db: DB) {
    await db.query('DROP TABLE IF EXISTS member_permissions');
    await db.query('DROP TABLE IF EXISTS members');
    await db.query('DROP TABLE IF EXISTS chats');
  }
};

export default migration;
