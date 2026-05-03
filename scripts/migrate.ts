import fs from 'fs';
import path from 'path';
import { makeDB, DB } from "../src/db";
import defaultDb from '../src/providers/db';

interface Migration {
  up(db: DB): Promise<void>;
  down(db: DB): Promise<void>;
}

async function ensureMigrationsTable(db: DB) {
  await db.query(`
    CREATE TABLE IF NOT EXISTS migrations (
      id SERIAL PRIMARY KEY,
      name VARCHAR(255) NOT NULL UNIQUE,
      applied_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
  `);
}

async function getAppliedMigrations(db: DB): Promise<string[]> {
  const result = await db.any<{ name: string }>('SELECT name FROM migrations ORDER BY id');
  return result.map(row => row.name);
}

async function runMigrations(db: DB) {
  await ensureMigrationsTable(db);

  const migrationsPath = path.join(process.cwd(), 'migrations');
  const files = fs.readdirSync(migrationsPath)
    .filter((file) => file.endsWith('.ts') && file !== 'index.ts')
    .sort();

  if (files.length === 0) {
    console.log('No migration files found.');
    return;
  }

  const appliedMigrations = await getAppliedMigrations(db);
  const pendingMigrations = files.filter(file => !appliedMigrations.includes(file));

  if (pendingMigrations.length === 0) {
    console.log('All migrations are already applied.');
    return;
  }

  console.log(`Found ${pendingMigrations.length} pending migration(s).`);

  for (const file of pendingMigrations) {
    const filePath = path.join(migrationsPath, file);

    console.log(`Applying migration: ${file}`);

    try {
      // Dynamically import the migration module
      const migrationModule = await import(filePath);
      const migration: Migration = migrationModule.default;

      if (!migration || typeof migration.up !== 'function') {
        throw new Error(`Migration ${file} does not export a default object with an 'up' function`);
      }

      // Run migration in a transaction
      await db.query('BEGIN');
      try {
        await migration.up(db);
        await db.query('INSERT INTO migrations (name) VALUES ($1)', [file]);
        await db.query('COMMIT');
        console.log(`✅ Migration ${file} applied successfully.`);
      } catch (error) {
        await db.query('ROLLBACK');
        console.error(`❌ Failed to apply migration ${file}:`, error);
        throw error;
      }
    } catch (importError) {
      console.error(`❌ Failed to load migration ${file}:`, importError);
      throw importError;
    }
  }

  console.log('All migrations applied successfully!');
}

async function rollbackMigrations(db: DB, count: number = 1) {
  await ensureMigrationsTable(db);

  const appliedMigrations = await getAppliedMigrations(db);

  if (appliedMigrations.length === 0) {
    console.log('No migrations to rollback.');
    return;
  }

  const migrationsToRollback = appliedMigrations.slice(-count);

  console.log(`Rolling back ${migrationsToRollback.length} migration(s).`);

  for (const migrationFile of migrationsToRollback.reverse()) {
    const filePath = path.join(process.cwd(), 'migrations', migrationFile);

    console.log(`Rolling back migration: ${migrationFile}`);

    try {
      // Dynamically import the migration module
      const migrationModule = await import(filePath);
      const migration: Migration = migrationModule.default;

      if (!migration || typeof migration.down !== 'function') {
        throw new Error(`Migration ${migrationFile} does not export a default object with a 'down' function`);
      }

      // Run rollback in a transaction
      await db.query('BEGIN');
      try {
        await migration.down(db);
        await migration.down(db);
        await db.query('DELETE FROM migrations WHERE name = $1', [migrationFile]);
        await db.query('COMMIT');
        console.log(`✅ Migration ${migrationFile} rolled back successfully.`);
      } catch (error) {
        await db.query('ROLLBACK');
        console.error(`❌ Failed to rollback migration ${migrationFile}:`, error);
        throw error;
      }
    } catch (importError) {
      console.error(`❌ Failed to load migration ${migrationFile}:`, importError);
      throw importError;
    }
  }

  console.log('Rollback completed successfully!');
}

// Check command line arguments
const command = process.argv[2];

if (command === 'rollback') {
    const connectionString = process.argv[3];
    const db = connectionString !== undefined ? defaultDb : makeDB({ connectionString });
    rollbackMigrations(db, 1).catch((error) => {
    console.error('Rollback failed:', error);
    process.exit(1);
  });
} else {
    const connectionString = process.argv[2];

    const db = connectionString === undefined ? defaultDb : makeDB({ connectionString });

    runMigrations(db).catch((error) => {
    console.error('Migration failed:', error);
    process.exit(1);
  });
}
