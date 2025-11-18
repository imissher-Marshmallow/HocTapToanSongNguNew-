#!/usr/bin/env node

/**
 * Database Schema Inspector
 * Shows all tables and columns in your Supabase/PostgreSQL database
 */

require('dotenv').config();
const { Pool } = require('pg');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL || process.env.POSTGRES_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
});

async function inspectSchema() {
  console.log('\n🔍 Database Schema Inspector\n');
  console.log('=' .repeat(80));

  try {
    // Get all tables
    const tablesResult = await pool.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      ORDER BY table_name;
    `);

    const tables = tablesResult.rows.map(row => row.table_name);
    console.log(`\n📊 Found ${tables.length} tables in database:\n`);

    // For each table, get its columns and info
    for (const table of tables) {
      try {
        // Get column information
        const columnsResult = await pool.query(`
          SELECT 
            column_name,
            data_type,
            is_nullable,
            column_default
          FROM information_schema.columns
          WHERE table_name = $1
          ORDER BY ordinal_position;
        `, [table]);

        // Get row count
        const countResult = await pool.query(`SELECT COUNT(*) as count FROM "${table}"`);
        const rowCount = countResult.rows[0].count;

        console.log(`\n📋 TABLE: ${table.toUpperCase()} (${rowCount} rows)`);
        console.log('-'.repeat(80));
        console.log(
          columnsResult.rows.map(col => 
            `  • ${col.column_name.padEnd(25)} ${col.data_type.padEnd(20)} ${col.is_nullable === 'NO' ? '[NOT NULL]' : '[NULLABLE]'} ${col.column_default ? `DEFAULT: ${col.column_default}` : ''}`
          ).join('\n')
        );

      } catch (err) {
        console.log(`\n❌ Error reading table ${table}: ${err.message}`);
      }
    }

    console.log('\n' + '='.repeat(80) + '\n');

  } catch (error) {
    console.error('❌ Database connection error:', error.message);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

inspectSchema();
