import {DB} from "../src/db";


const migration = {
  async up(db: DB) {
    await db.query(`
      CREATE TABLE  messages (
        id SERIAL PRIMARY KEY,
        chat_id INTEGER NOT NULL REFERENCES chats(id) ON DELETE CASCADE,
        user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        content TEXT NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
  },

  async down(db: DB) {
    await db.query('DROP TABLE messages');
  },
};


export default migration;