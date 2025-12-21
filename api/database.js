/**
 * database.js
 * 
 * ✅ Cloud-Ready Database Layer
 * 
 * Automatically selects the best database:
 * - Production (Vercel/Cloud): PostgreSQL via Supabase (DATABASE_URL)
 * - Local Development: SQLite (fallback)
 * 
 * This allows the same code to work everywhere!
 */

require('dotenv').config();

// Determine which database to use
let USE_POSTGRES = !!(process.env.DATABASE_URL || process.env.POSTGRES_URL);

let dbHelpers, db;

if (USE_POSTGRES) {
  console.log('[DB] Using PostgreSQL (cloud database)');
  try {
    // Try importing pg module
    const { Pool } = require('pg');
    
    const pool = new Pool({
      connectionString: process.env.DATABASE_URL || process.env.POSTGRES_URL,
      max: parseInt(process.env.PG_MAX_CLIENTS || '6', 10),
      idleTimeoutMillis: parseInt(process.env.PG_IDLE_TIMEOUT_MS || '30000', 10),
      connectionTimeoutMillis: parseInt(process.env.PG_CONN_TIMEOUT_MS || '5000', 10),
      ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
    });

    pool.on('error', (err) => {
      console.error('[DB] Unexpected Postgres client error (pool):', err && err.message ? err.message : err);
    });

    // Extra lifecycle logging (helps debug serverless connection churn)
    pool.on('connect', (client) => {
      console.log('[DB] Postgres client connected (pool).');
    });
    pool.on('remove', (client) => {
      console.log('[DB] Postgres client removed (pool).');
    });

    // Wrap pool.query to add a single retry for transient network/timeout terminations
    const originalQuery = pool.query.bind(pool);
    pool.query = async (text, params) => {
      try {
        return await originalQuery(text, params);
      } catch (err) {
        const msg = (err && err.message) ? err.message.toLowerCase() : '';
        const transient = msg.includes('terminat') || msg.includes('timeout') || msg.includes('econnreset') || msg.includes('connection reset');
        if (transient) {
          console.warn('[DB] Transient error detected, retrying query once:', err && err.message ? err.message : err);
          // small delay
          await new Promise(r => setTimeout(r, 200));
          return originalQuery(text, params);
        }
        throw err;
      }
    };

    // Test connection
    pool.connect((err, client, release) => {
      if (err) {
        console.warn('[DB] PostgreSQL connection test failed:', err.message);
        // Will fall back to SQLite below
      } else {
        console.log('[DB] ✅ PostgreSQL connected');
        release();
      }
    });

    // Initialize PostgreSQL schema
    initializePostgreSQL(pool);

    // Create helpers for PostgreSQL
    dbHelpers = {
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
          return result.rows[0];
        } catch (err) {
          console.error('createUser error:', err.message);
          throw err;
        }
      },

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
          return result.rows[0]?.id;
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
        } catch (err) {
          console.error('saveAIAnalysis error:', err.message);
          throw err;
        }
      },

      // Update result fields (score, weak_areas, feedback, recommendations)
      updateResult: async (resultId, { score, weakAreas, feedback, recommendations }) => {
        try {
          await pool.query(
            'UPDATE results SET score = $1, weak_areas = $2, feedback = $3, recommendations = $4 WHERE id = $5',
            [
              score,
              JSON.stringify(weakAreas || []),
              JSON.stringify(feedback || {}),
              JSON.stringify(recommendations || []),
              resultId
            ]
          );
        } catch (err) {
          console.error('updateResult error:', err.message);
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
          return result.rows[0]?.id;
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

      getAllUsers: async () => {
        try {
          const result = await pool.query('SELECT id, email, username, created_at FROM users ORDER BY created_at DESC');
          return result.rows || [];
        } catch (err) {
          console.error('getAllUsers error:', err.message);
          throw err;
        }
      },

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

    db = pool;

  } catch (err) {
    console.warn('[DB] PostgreSQL not available, falling back to SQLite:', err.message);
    // Fall through to SQLite setup below
    USE_POSTGRES = false;
  }
}

// Initialize PostgreSQL schema
function initializePostgreSQL(pool) {
  try {
    pool.query(
      "CREATE TABLE IF NOT EXISTS users (" +
      "id SERIAL PRIMARY KEY," +
      "email TEXT UNIQUE NOT NULL," +
      "username TEXT UNIQUE NOT NULL," +
      "password_hash TEXT NOT NULL," +
      "created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP" +
      ")"
    ).catch(err => console.warn('[DB] Users table:', err.message));

    pool.query(
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
    ).catch(err => console.warn('[DB] Results table:', err.message));

    pool.query(
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
    ).catch(err => console.warn('[DB] Learning plans table:', err.message));

    pool.query('CREATE INDEX IF NOT EXISTS idx_results_user_id ON results(user_id)').catch(() => {});
    pool.query('CREATE INDEX IF NOT EXISTS idx_results_created ON results(created_at DESC)').catch(() => {});
    pool.query('CREATE INDEX IF NOT EXISTS idx_plans_user_id ON learning_plans(user_id)').catch(() => {});
  } catch (e) {
    console.warn('[DB] Schema initialization skipped:', e.message);
  }
}

if (!USE_POSTGRES || !dbHelpers) {
  console.log('[DB] Using SQLite (local database)');
  const sqlite3 = require('sqlite3').verbose();
  const path = require('path');
  const fs = require('fs');

  // Ensure data directory exists
  const dbDir = path.join(__dirname, '../data');
  if (!fs.existsSync(dbDir)) {
    fs.mkdirSync(dbDir, { recursive: true });
  }

  const dbPath = path.join(dbDir, 'quiz.db');

  db = new sqlite3.Database(dbPath, (err) => {
    if (err) {
      console.error('Error opening database:', err);
    } else {
      console.log('Connected to SQLite database at', dbPath);
      initializeDatabase();
    }
  });

  // Initialize database schema
  function initializeDatabase() {
    db.serialize(() => {
      // Users table (for auth)
      db.run(`
        CREATE TABLE IF NOT EXISTS users (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          email TEXT UNIQUE NOT NULL,
          username TEXT UNIQUE NOT NULL,
          password_hash TEXT NOT NULL,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )
      `, (err) => {
        if (err) console.error('Error creating users table:', err);
        else console.log('Users table initialized');
      });

      // Results table (for exam results)
      db.run(`
        CREATE TABLE IF NOT EXISTS results (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          user_id INTEGER NOT NULL,
          quiz_id TEXT NOT NULL,
          score INTEGER NOT NULL,
          total_questions INTEGER NOT NULL,
          answers TEXT NOT NULL,
          weak_areas TEXT,
          feedback TEXT,
          recommendations TEXT,
          ai_analysis TEXT,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (user_id) REFERENCES users(id)
        )
      `, (err) => {
        if (err) console.error('Error creating results table:', err);
        else console.log('Results table initialized');
      });

      // Learning plan table (for 3-day study plans)
      db.run(`
        CREATE TABLE IF NOT EXISTS learning_plans (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          result_id INTEGER NOT NULL,
          user_id INTEGER NOT NULL,
          day INTEGER NOT NULL,
          topics TEXT NOT NULL,
          exercises TEXT NOT NULL,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (result_id) REFERENCES results(id),
          FOREIGN KEY (user_id) REFERENCES users(id)
        )
      `, (err) => {
        if (err) console.error('Error creating learning_plans table:', err);
        else console.log('Learning plans table initialized');
      });
    });
  }

  // Helper functions for database operations (SQLite)
  dbHelpers = {
    // User operations
    getUserById: (userId) => {
      return new Promise((resolve, reject) => {
        db.get('SELECT * FROM users WHERE id = ?', [userId], (err, row) => {
          if (err) reject(err);
          else resolve(row);
        });
      });
    },

    getUserByEmail: (email) => {
      return new Promise((resolve, reject) => {
        db.get('SELECT * FROM users WHERE email = ?', [email], (err, row) => {
          // If read-only error, assume user doesn't exist (demo mode)
          if (err && err.code === 'SQLITE_READONLY') {
            console.warn('Database is read-only; user queries will return empty');
            resolve(null);
          } else if (err) {
            reject(err);
          } else {
            resolve(row);
          }
        });
      });
    },

    createUser: (email, username, passwordHash) => {
      return new Promise((resolve, reject) => {
        db.run(
          'INSERT INTO users (email, username, password_hash) VALUES (?, ?, ?)',
          [email, username, passwordHash],
          function(err) {
            if (err) reject(err);
            else resolve({ id: this.lastID, email, username });
          }
        );
      });
    },

    // Result operations
    saveResult: (userId, quizId, score, totalQuestions, answers, weakAreas, feedback, recommendations) => {
      return new Promise((resolve, reject) => {
        db.run(
          `INSERT INTO results 
           (user_id, quiz_id, score, total_questions, answers, weak_areas, feedback, recommendations)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
          [
            userId,
            quizId,
            score,
            totalQuestions,
            JSON.stringify(answers),
            JSON.stringify(weakAreas),
            JSON.stringify(feedback),
            JSON.stringify(recommendations)
          ],
          function(err) {
              if (err) {
                reject(err);
              } else {
                console.log('[DB] saveResult inserted id=', this.lastID, 'userId=', userId, 'score=', score, 'totalQuestions=', totalQuestions);
                resolve(this.lastID);
              }
          }
        );
      });
    },

    saveAIAnalysis: (resultId, aiAnalysis) => {
      return new Promise((resolve, reject) => {
        db.run(
          'UPDATE results SET ai_analysis = ? WHERE id = ?',
          [JSON.stringify(aiAnalysis), resultId],
          (err) => {
            if (err) reject(err);
            else resolve();
          }
        );
      });
    },

    // Update result fields (score, weak_areas, feedback, recommendations)
    updateResult: (resultId, { score, weakAreas, feedback, recommendations }) => {
      return new Promise((resolve, reject) => {
        db.run(
          'UPDATE results SET score = ?, weak_areas = ?, feedback = ?, recommendations = ? WHERE id = ?',
          [
            score,
            JSON.stringify(weakAreas || []),
            JSON.stringify(feedback || {}),
            JSON.stringify(recommendations || []),
            resultId
          ],
          (err) => {
            if (err) reject(err);
            else resolve();
          }
        );
      });
    },

    getUserResults: (userId, limit = 10) => {
      return new Promise((resolve, reject) => {
        db.all(
          'SELECT * FROM results WHERE user_id = ? ORDER BY created_at DESC LIMIT ?',
          [userId, limit],
          (err, rows) => {
            if (err) reject(err);
            else resolve(rows || []);
          }
        );
      });
    },

    getResultById: (resultId) => {
      return new Promise((resolve, reject) => {
        db.get('SELECT * FROM results WHERE id = ?', [resultId], (err, row) => {
          if (err) reject(err);
          else resolve(row);
        });
      });
    },

    saveLearningPlan: (resultId, userId, day, topics, exercises) => {
      return new Promise((resolve, reject) => {
        db.run(
          `INSERT INTO learning_plans (result_id, user_id, day, topics, exercises)
           VALUES (?, ?, ?, ?, ?)`,
          [resultId, userId, day, JSON.stringify(topics), JSON.stringify(exercises)],
          function(err) {
            if (err) reject(err);
            else resolve(this.lastID);
          }
        );
      });
    },

    getLearningPlans: (userId, limit = 10) => {
      return new Promise((resolve, reject) => {
        db.all(
          'SELECT * FROM learning_plans WHERE user_id = ? ORDER BY created_at DESC, day ASC LIMIT ?',
          [userId, limit],
          (err, rows) => {
            if (err) reject(err);
            else resolve(rows || []);
          }
        );
      });
    },

    // Administrative: Get all users (for inspection)
    getAllUsers: () => {
      return new Promise((resolve, reject) => {
        db.all('SELECT id, email, username, created_at FROM users ORDER BY created_at DESC', (err, rows) => {
          if (err) reject(err);
          else resolve(rows || []);
        });
      });
    },

    // Administrative: Get all results (for inspection)
    getAllResults: () => {
      return new Promise((resolve, reject) => {
        db.all('SELECT * FROM results ORDER BY created_at DESC', (err, rows) => {
          if (err) reject(err);
          else resolve(rows || []);
        });
      });
    }
  };
}

module.exports = { db, dbHelpers };
