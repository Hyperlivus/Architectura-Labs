import db from '../src/providers/db';
import { DB } from "../src/db";


const migration = {
  async up(db: DB) {
    // Write your migration logic here
    // Example:
    // await db.query(`
    //   CREATE TABLE example (
    //     id SERIAL PRIMARY KEY,
    //     name TEXT NOT NULL
    //   )
    // `);
  },

  async down(db: DB) {
    // Write your rollback logic here
    // Example:
    // await db.query('DROP TABLE example');
  }
};

export default migration;