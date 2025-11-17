#!/usr/bin/env node

/**
 * Migration Runner for ML Analytics Tables
 * 
 * Usage:
 *   node scripts/run-migrations.js
 *   npm run migrate
 * 
 * Reads SQL files from migrations/ directory and runs them in order
 */

const fs = require('fs');
const path = require('path');
const { pool } = require('../database');

const migrationsDir = path.join(__dirname, '../migrations');

async function runMigrations() {
  console.log('🚀 Starting ML Analytics Migrations...\n');
  
  try {
    // Get all SQL files in migrations directory
    const files = fs.readdirSync(migrationsDir)
      .filter(file => file.endsWith('.sql'))
      .sort();
    
    if (files.length === 0) {
      console.log('❌ No migration files found in migrations/');
      process.exit(1);
    }
    
    console.log(`📁 Found ${files.length} migration file(s):\n`);
    
    // Run each migration
    for (const file of files) {
      const filePath = path.join(migrationsDir, file);
      console.log(`▶️  Running: ${file}`);
      
      try {
        const sql = fs.readFileSync(filePath, 'utf8');
        
        // Split by semicolon and filter empty statements
        const statements = sql
          .split(';')
          .map(s => s.trim())
          .filter(s => s.length > 0);
        
        // Run each statement
        for (const statement of statements) {
          await pool.query(statement);
        }
        
        console.log(`✅ Successfully executed: ${file}\n`);
      } catch (error) {
        console.error(`❌ Error running ${file}:`);
        console.error(error.message);
        console.error('\n');
        throw error;
      }
    }
    
    console.log('========================================');
    console.log('✅ All migrations completed successfully!');
    console.log('========================================\n');
    
    // Verify tables were created
    const result = await pool.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public'
      AND table_name LIKE 'ml_%'
      ORDER BY table_name;
    `);
    
    if (result.rows.length > 0) {
      console.log('📊 Created ML Analytics Tables:');
      result.rows.forEach(row => {
        console.log(`   • ${row.table_name}`);
      });
    }
    
    await pool.end();
    process.exit(0);
    
  } catch (error) {
    console.error('\n❌ Migration failed:', error.message);
    await pool.end();
    process.exit(1);
  }
}

// Run migrations
runMigrations();
