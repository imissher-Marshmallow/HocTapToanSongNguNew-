/**
 * init-supabase.js
 * 
 * Initialize Supabase PostgreSQL schema
 * 
 * Usage: node init-supabase.js
 */

require('dotenv').config();
const { Pool } = require('pg');

const DATABASE_URL = process.env.DATABASE_URL || 'postgresql://postgres.wjsjuwyefcscvttuidhr:iFdka6zyigfABpIf@aws-1-ap-southeast-1.pooler.supabase.com:6543/postgres';

console.log(`\n🔗 Connecting to Supabase...\n`);

const pool = new Pool({
  connectionString: DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

async function initializeDatabase() {
  const client = await pool.connect();
  try {
    console.log('📝 Creating tables...\n');

    // Users table
    await client.query(
      "CREATE TABLE IF NOT EXISTS users (" +
      "id SERIAL PRIMARY KEY," +
      "email TEXT UNIQUE NOT NULL," +
      "username TEXT UNIQUE NOT NULL," +
      "password_hash TEXT NOT NULL," +
      "created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP" +
      ")"
    );
    console.log('✅ Users table created');

    // Results table
    await client.query(
      "CREATE TABLE IF NOT EXISTS results (" +
      "id SERIAL PRIMARY KEY," +
      "user_id INTEGER NOT NULL," +
      "quiz_id TEXT NOT NULL," +
      "score INTEGER NOT NULL," +
      "total_questions INTEGER NOT NULL," +
      "answers JSONB NOT NULL DEFAULT '[]'::jsonb," +
      "weak_areas JSONB DEFAULT '[]'::jsonb," +
      "feedback JSONB DEFAULT '{}'::jsonb," +
      "recommendations JSONB DEFAULT '[]'::jsonb," +
      "ai_analysis JSONB DEFAULT '{}'::jsonb," +
      "created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP," +
      "FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE" +
      ")"
    );
    console.log('✅ Results table created');

    // Learning plans table
    await client.query(
      "CREATE TABLE IF NOT EXISTS learning_plans (" +
      "id SERIAL PRIMARY KEY," +
      "result_id INTEGER NOT NULL," +
      "user_id INTEGER NOT NULL," +
      "day INTEGER NOT NULL," +
      "topics JSONB DEFAULT '[]'::jsonb," +
      "exercises JSONB DEFAULT '[]'::jsonb," +
      "created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP," +
      "FOREIGN KEY (result_id) REFERENCES results(id) ON DELETE CASCADE," +
      "FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE" +
      ")"
    );
    console.log('✅ Learning plans table created');

    // Create indexes
    await client.query('CREATE INDEX IF NOT EXISTS idx_results_user_id ON results(user_id)');
    await client.query('CREATE INDEX IF NOT EXISTS idx_results_created ON results(created_at DESC)');
    await client.query('CREATE INDEX IF NOT EXISTS idx_plans_user_id ON learning_plans(user_id)');
    console.log('✅ Indexes created');

    console.log('\n✨ Database initialized successfully!\n');

  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    client.release();
    await pool.end();
    process.exit(0);
  }
}

initializeDatabase();
