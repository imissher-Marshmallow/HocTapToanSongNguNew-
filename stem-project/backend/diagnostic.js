/**
 * diagnostic.js
 * 
 * Check what userIds are actually saved in the database
 * from real quiz submissions
 */

require('dotenv').config();
const { Pool } = require('pg');

async function runDiagnostics() {
  console.log('🔍 DIAGNOSTIC: Checking Actual Quiz Submissions\n');
  
  const databaseUrl = process.env.DATABASE_URL || process.env.POSTGRES_URL;
  
  if (!databaseUrl) {
    console.error('❌ DATABASE_URL not found in .env');
    process.exit(1);
  }

  const pool = new Pool({
    connectionString: databaseUrl,
    ssl: { rejectUnauthorized: false }
  });

  try {
    const client = await pool.connect();
    
    // Test 1: Get distinct user_ids
    console.log('📊 Test 1: All distinct user_ids in database:');
    const userIds = await client.query(
      'SELECT DISTINCT user_id FROM results ORDER BY user_id'
    );
    
    if (userIds.rows.length === 0) {
      console.log('  ⚠️  No results found in database!');
    } else {
      console.log(`  Found ${userIds.rows.length} unique user_id(s):`);
      userIds.rows.forEach((row, idx) => {
        console.log(`    ${idx + 1}. user_id = ${row.user_id} (type: ${typeof row.user_id})`);
      });
    }

    // Test 2: Count results per user_id
    console.log('\n📊 Test 2: Count of results per user_id:');
    const counts = await client.query(
      'SELECT user_id, COUNT(*) as count FROM results GROUP BY user_id ORDER BY count DESC'
    );
    
    if (counts.rows.length === 0) {
      console.log('  ⚠️  No results found!');
    } else {
      counts.rows.forEach((row, idx) => {
        console.log(`    ${idx + 1}. user_id=${row.user_id}: ${row.count} results`);
      });
    }

    // Test 3: Get ALL results with details
    console.log('\n📊 Test 3: All results in database (with details):');
    const allResults = await client.query(
      `SELECT 
        id, 
        user_id, 
        quiz_id, 
        score, 
        total_questions,
        created_at 
       FROM results 
       ORDER BY created_at DESC`
    );
    
    if (allResults.rows.length === 0) {
      console.log('  No results found!');
    } else {
      console.log(`  Total results: ${allResults.rows.length}\n`);
      allResults.rows.forEach((row, idx) => {
        console.log(`  ${idx + 1}. ID=${row.id}`);
        console.log(`     user_id: ${row.user_id} (type: ${typeof row.user_id})`);
        console.log(`     quiz_id: ${row.quiz_id}`);
        console.log(`     score: ${row.score}/${row.total_questions}`);
        console.log(`     created_at: ${row.created_at}`);
      });
    }

    // Test 4: Check if userId 1 has results
    console.log('\n📊 Test 4: Results for userId = 1 (integer):');
    const userId1Int = await client.query(
      'SELECT COUNT(*) as count FROM results WHERE user_id = 1'
    );
    console.log(`  Found: ${userId1Int.rows[0].count} results`);

    // Test 5: Check if userId '1' (string) has results
    console.log('\n📊 Test 5: Results for userId = \'1\' (string):');
    const userId1Str = await client.query(
      "SELECT COUNT(*) as count FROM results WHERE user_id::TEXT = '1'"
    );
    console.log(`  Found: ${userId1Str.rows[0].count} results`);

    // Test 6: Check for 'anonymous' user
    console.log('\n📊 Test 6: Results for userId = \'anonymous\':');
    const userAnon = await client.query(
      "SELECT COUNT(*) as count FROM results WHERE user_id::TEXT = 'anonymous' OR user_id = 0"
    );
    console.log(`  Found: ${userAnon.rows[0].count} results`);

    client.release();
    
    console.log('\n═══════════════════════════════════════════════════════════════');
    console.log('🔍 DIAGNOSIS COMPLETE');
    console.log('═══════════════════════════════════════════════════════════════');
    
    if (allResults.rows.length === 0) {
      console.log('❌ PROBLEM: Database has NO quiz results!');
      console.log('   Your quiz submissions are not being saved to Supabase.');
      console.log('   This could be because:');
      console.log('     1. Quiz submission endpoint is failing silently');
      console.log('     2. Backend is not saving results to database');
      console.log('     3. Frontend userId is "anonymous" and requests are failing');
    } else {
      const userIdList = userIds.rows.map(r => r.user_id).join(', ');
      console.log(`✅ Database has ${allResults.rows.length} results for user(s): ${userIdList}`);
      if (userId1Int.rows[0].count > 0) {
        console.log('✅ userId 1 HAS results - query should work!');
      } else {
        console.log('⚠️  userId 1 has NO results');
        console.log(`   Results are being saved with different userIds: ${userIdList}`);
      }
    }

  } catch (err) {
    console.error('❌ Error:', err.message);
  } finally {
    await pool.end();
  }
}

runDiagnostics();
