/**
 * database-postgres.js
 * 
 * ✅ Cloud Database (Supabase PostgreSQL)
 * 
 * Replaces local SQLite with PostgreSQL:
 * - Data persists across Vercel deployments
 * - Accessible from any backend instance
 * - Syncs when new users register
 * 
 * Uses: pg client library
 * Connection: DATABASE_URL from environment (or .env)
 */

const { Pool } = require('pg');
require('dotenv').config();

// Initialize connection pool with DATABASE_URL from environment
const pool = new Pool({
  connectionString: process.env.DATABASE_URL || process.env.POSTGRES_URL,
  ssl: {
    rejectUnauthorized: false
  }
});

// Test connection on startup
pool.connect((err, client, release) => {
  if (err) {
    console.error('❌ Failed to connect to PostgreSQL:', err.message);
    console.error('   Ensure DATABASE_URL is set in environment');
  } else {
    console.log('✅ Connected to PostgreSQL (Supabase)');
    release();
    initializeDatabase();
  }
});

// Initialize database schema
async function initializeDatabase() {
  try {
    // Users table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS users (
        id SERIAL PRIMARY KEY,
        email TEXT UNIQUE NOT NULL,
        username TEXT UNIQUE NOT NULL,
        password_hash TEXT NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    console.log('✓ Users table ready');

    // Results table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS results (
        id SERIAL PRIMARY KEY,
        user_id INTEGER NOT NULL,
        quiz_id TEXT NOT NULL,
        score INTEGER NOT NULL,
        total_questions INTEGER NOT NULL,
        answers JSONB NOT NULL DEFAULT '[]'::jsonb,
        weak_areas JSONB DEFAULT '[]'::jsonb,
        feedback JSONB DEFAULT '{}'::jsonb,
        recommendations JSONB DEFAULT '[]'::jsonb,
        ai_analysis JSONB DEFAULT '{}'::jsonb,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
      )
    `);
    console.log('✓ Results table ready');

    // Learning plans table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS learning_plans (
        id SERIAL PRIMARY KEY,
        result_id INTEGER NOT NULL,
        user_id INTEGER NOT NULL,
        day INTEGER NOT NULL,
        topics JSONB DEFAULT '[]'::jsonb,
        exercises JSONB DEFAULT '[]'::jsonb,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (result_id) REFERENCES results(id) ON DELETE CASCADE,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
      )
    `);
    console.log('✓ Learning plans table ready');

    // Create indexes for faster queries
    await pool.query('CREATE INDEX IF NOT EXISTS idx_results_user_id ON results(user_id)');
    await pool.query('CREATE INDEX IF NOT EXISTS idx_results_created ON results(created_at DESC)');
    await pool.query('CREATE INDEX IF NOT EXISTS idx_plans_user_id ON learning_plans(user_id)');
    console.log('✓ Indexes created');

  } catch (err) {
    console.error('Error initializing database:', err.message);
  }
}

// Helper functions for database operations
const dbHelpers = {
  // User operations
  getUserById: async (userId) => {
    try {
      const result = await pool.query('SELECT * FROM users WHERE id = $1', [userId]);
      return result.rows[0] || null;
    } catch (err) {
      console.error('getUserById error:', err.message);
      throw err;
    }
  },

  getUserByEmail: async (email) => {
    try {
      const result = await pool.query('SELECT * FROM users WHERE email = $1', [email]);
      return result.rows[0] || null;
    } catch (err) {
      console.error('getUserByEmail error:', err.message);
      throw err;
    }
  },

  createUser: async (email, username, passwordHash) => {
    try {
      const result = await pool.query(
        'INSERT INTO users (email, username, password_hash) VALUES ($1, $2, $3) RETURNING id, email, username',
        [email, username, passwordHash]
      );
      const user = result.rows[0];
      console.log(`[DB] Created user: ${user.email}`);
      return user;
    } catch (err) {
      console.error('createUser error:', err.message);
      throw err;
    }
  },

  // Result operations
  saveResult: async (userId, quizId, score, totalQuestions, answers, weakAreas, feedback, recommendations) => {
    try {
      const result = await pool.query(
        `INSERT INTO results 
         (user_id, quiz_id, score, total_questions, answers, weak_areas, feedback, recommendations)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
         RETURNING id`,
        [
          userId,
          quizId,
          score,
          totalQuestions,
          JSON.stringify(answers || []),
          JSON.stringify(weakAreas || []),
          JSON.stringify(feedback || {}),
          JSON.stringify(recommendations || [])
        ]
      );
      const resultId = result.rows[0]?.id;
      console.log(`[DB] Saved result ${resultId} for user ${userId}`);
      return resultId;
    } catch (err) {
      console.error('saveResult error:', err.message);
      throw err;
    }
  },

  saveAIAnalysis: async (resultId, aiAnalysis) => {
    try {
      await pool.query(
        'UPDATE results SET ai_analysis = $1 WHERE id = $2',
        [JSON.stringify(aiAnalysis || {}), resultId]
      );
      console.log(`[DB] Updated AI analysis for result ${resultId}`);
    } catch (err) {
      console.error('saveAIAnalysis error:', err.message);
      throw err;
    }
  },

  getUserResults: async (userId, limit = 10) => {
    try {
      const result = await pool.query(
        'SELECT * FROM results WHERE user_id = $1 ORDER BY created_at DESC LIMIT $2',
        [userId, limit]
      );
      return result.rows || [];
    } catch (err) {
      console.error('getUserResults error:', err.message);
      throw err;
    }
  },

  getResultById: async (resultId) => {
    try {
      const result = await pool.query(
        'SELECT * FROM results WHERE id = $1',
        [resultId]
      );
      return result.rows[0] || null;
    } catch (err) {
      console.error('getResultById error:', err.message);
      throw err;
    }
  },

  saveLearningPlan: async (resultId, userId, day, topics, exercises) => {
    try {
      const result = await pool.query(
        `INSERT INTO learning_plans (result_id, user_id, day, topics, exercises)
         VALUES ($1, $2, $3, $4, $5)
         RETURNING id`,
        [resultId, userId, day, JSON.stringify(topics || []), JSON.stringify(exercises || [])]
      );
      const planId = result.rows[0]?.id;
      console.log(`[DB] Saved learning plan day ${day} for result ${resultId}`);
      return planId;
    } catch (err) {
      console.error('saveLearningPlan error:', err.message);
      throw err;
    }
  },

  getLearningPlans: async (userId, limit = 10) => {
    try {
      const result = await pool.query(
        'SELECT * FROM learning_plans WHERE user_id = $1 ORDER BY created_at DESC, day ASC LIMIT $2',
        [userId, limit]
      );
      return result.rows || [];
    } catch (err) {
      console.error('getLearningPlans error:', err.message);
      throw err;
    }
  },

  // Administrative: Get all users (for inspection)
  getAllUsers: async () => {
    try {
      const result = await pool.query('SELECT id, email, username, created_at FROM users ORDER BY created_at DESC');
      return result.rows || [];
    } catch (err) {
      console.error('getAllUsers error:', err.message);
      throw err;
    }
  },

  // Administrative: Get all results with user info
  getAllResults: async () => {
    try {
      const result = await pool.query(
        `SELECT r.*, u.email, u.username FROM results r
         LEFT JOIN users u ON r.user_id = u.id
         ORDER BY r.created_at DESC`
      );
      return result.rows || [];
    } catch (err) {
      console.error('getAllResults error:', err.message);
      throw err;
    }
  }
};

module.exports = { pool, dbHelpers };
