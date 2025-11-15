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
const USE_POSTGRES = !!(process.env.DATABASE_URL || process.env.POSTGRES_URL);

let dbHelpers, db;

if (USE_POSTGRES) {
  console.log('[DB] Using PostgreSQL (cloud database)');
  try {
    const pgModule = require('./database-postgres');
    dbHelpers = pgModule.dbHelpers;
    db = pgModule.pool;
  } catch (err) {
    console.warn('[DB] PostgreSQL not available, falling back to SQLite:', err.message);
    // Fallback to SQLite below
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
            if (err) reject(err);
            else resolve(this.lastID);
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
