/**
 * migrate-add-password-hash.js
 *
 * Run this once (locally or from a CI step) to ensure the `users` table
 * in the Supabase/Postgres database has the `password_hash` column.
 *
 * Usage:
 *   DATABASE_URL="postgresql://..." node migrate-add-password-hash.js
 */

require('dotenv').config();
const { Pool } = require('pg');

const DATABASE_URL = process.env.DATABASE_URL;
if (!DATABASE_URL) {
  console.error('ERROR: DATABASE_URL is not set. Set it and re-run.');
  process.exit(1);
}

const pool = new Pool({ connectionString: DATABASE_URL, ssl: { rejectUnauthorized: false } });

async function runMigration() {
  const client = await pool.connect();
  try {
    console.log('Running migration: ensure users.password_hash exists...');

    // Add column if it doesn't exist (nullable to avoid breaking existing rows)
    await client.query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS password_hash TEXT`);
    console.log('✅ Ensured users.password_hash column exists');

    // Optionally, you could make the column NOT NULL after populating values.
    // But keep it nullable here to be safe.

    console.log('Migration completed successfully');
  } catch (err) {
    console.error('Migration failed:', err && err.message);
    process.exitCode = 1;
  } finally {
    client.release();
    await pool.end();
  }
}

runMigration();
