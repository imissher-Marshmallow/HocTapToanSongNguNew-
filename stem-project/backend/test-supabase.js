/**
 * test-supabase.js
 * 
 * Connect to Supabase PostgreSQL and display all data
 * 
 * Usage: node test-supabase.js
 */

require('dotenv').config();
const { Pool } = require('pg');

const DATABASE_URL = process.env.DATABASE_URL || 'postgresql://postgres.wjsjuwyefcscvttuidhr:iFdka6zyigfABpIf@aws-1-ap-southeast-1.pooler.supabase.com:6543/postgres';

console.log(`\n🔗 Connecting to Supabase...\n`);

const pool = new Pool({
  connectionString: DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

async function testSupabase() {
  try {
    // Test connection
    const client = await pool.connect();
    console.log('✅ Connected to Supabase!\n');
    client.release();

    // Fetch users
    console.log('📋 USERS:');
    console.log('-'.repeat(80));
    const usersResult = await pool.query('SELECT id, email, username, created_at FROM users ORDER BY created_at DESC');
    if (usersResult.rows.length === 0) {
      console.log('  (no users)');
    } else {
      usersResult.rows.forEach((user, i) => {
        console.log(`  ${i + 1}. ID: ${user.id} | Email: ${user.email} | Username: ${user.username} | Created: ${user.created_at}`);
      });
    }

    // Fetch results
    console.log('\n📈 QUIZ RESULTS:');
    console.log('-'.repeat(80));
    const resultsResult = await pool.query(`
      SELECT r.id, r.user_id, r.quiz_id, r.score, r.total_questions, r.created_at, u.email
      FROM results r
      LEFT JOIN users u ON r.user_id = u.id
      ORDER BY r.created_at DESC
    `);
    if (resultsResult.rows.length === 0) {
      console.log('  (no results)');
    } else {
      resultsResult.rows.forEach((result, i) => {
        console.log(`  ${i + 1}. Result ID: ${result.id} | User: ${result.email || result.user_id} | Score: ${result.score}/${result.total_questions} | Date: ${result.created_at}`);
      });
    }

    // Fetch learning plans
    console.log('\n📅 LEARNING PLANS:');
    console.log('-'.repeat(80));
    const plansResult = await pool.query(`
      SELECT lp.id, lp.user_id, lp.result_id, lp.day, lp.created_at, u.email
      FROM learning_plans lp
      LEFT JOIN users u ON lp.user_id = u.id
      ORDER BY lp.created_at DESC
    `);
    if (plansResult.rows.length === 0) {
      console.log('  (no learning plans)');
    } else {
      plansResult.rows.forEach((plan, i) => {
        console.log(`  ${i + 1}. Plan ID: ${plan.id} | User: ${plan.email || plan.user_id} | Result: ${plan.result_id} | Day ${plan.day} | Created: ${plan.created_at}`);
      });
    }

    // Summary
    console.log('\n📊 SUMMARY:');
    console.log('-'.repeat(80));
    console.log(`  Total Users: ${usersResult.rows.length}`);
    console.log(`  Total Quiz Results: ${resultsResult.rows.length}`);
    console.log(`  Total Learning Plans: ${plansResult.rows.length}`);
    
    if (resultsResult.rows.length > 0) {
      const avgScore = (resultsResult.rows.reduce((sum, r) => sum + r.score, 0) / resultsResult.rows.length).toFixed(1);
      console.log(`  Average Score: ${avgScore}/${resultsResult.rows[0]?.total_questions || '?'}`);
    }

    console.log('\n' + '='.repeat(80) + '\n');

  } catch (error) {
    console.error('❌ Error:', error.message);
    if (error.message.includes('ENOTFOUND') || error.message.includes('getaddrinfo')) {
      console.error('   → Cannot reach Supabase. Check DATABASE_URL and internet connection.');
    }
  } finally {
    await pool.end();
    process.exit(0);
  }
}

testSupabase();
