/**
 * test-results.js
 * 
 * Test script to:
 * 1. Insert a test quiz result for userId 1
 * 2. Query all results to verify it was saved
 * 3. Display database state
 * 
 * Usage: node test-results.js <DATABASE_URL>
 * Example: node test-results.js "postgresql://user:pass@host:6543/db"
 */

const { Pool } = require('pg');

async function testResults() {
  console.log('🧪 Starting test script...\n');
  
  // Get DATABASE_URL from command line argument or environment
  const databaseUrl = process.argv[2] || process.env.DATABASE_URL || process.env.POSTGRES_URL;
  
  if (!databaseUrl) {
    console.error('❌ Error: DATABASE_URL not provided');
    console.error('\nUsage: node test-results.js <DATABASE_URL>');
    console.error('Example: node test-results.js "postgresql://user:pass@host:6543/db"\n');
    process.exit(1);
  }

  console.log('📡 Database URL (first 50 chars):', databaseUrl.substring(0, 50) + '...\n');
  
  const pool = new Pool({
    connectionString: databaseUrl,
    ssl: { rejectUnauthorized: false }
  });

  try {
    console.log('📡 Connecting to PostgreSQL...');
    const client = await pool.connect();
    console.log('✅ Connected successfully!\n');
    
    // Create tables if they don't exist
    console.log('📋 Creating tables (if needed)...');
    await client.query(`
      CREATE TABLE IF NOT EXISTS users (
        id SERIAL PRIMARY KEY,
        email TEXT UNIQUE NOT NULL,
        username TEXT UNIQUE NOT NULL,
        password_hash TEXT NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    
    await client.query(`
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
    console.log('✅ Tables ready\n');

    // Test 1: Insert a test result
    console.log('📝 Test 1: Inserting test quiz result for userId 1...');
    const testResult = {
      userId: 1,
      quizId: 'test-quiz-1',
      score: 8,
      totalQuestions: 20,
      answers: [
        { questionId: 1, selectedOption: 'A', timeTakenSec: 30 },
        { questionId: 2, selectedOption: 'B', timeTakenSec: 25 }
      ],
      weakAreas: ['Quadratic Equations', 'Trigonometry'],
      feedback: { overall: 'Good performance!' },
      recommendations: ['Practice more on weak areas']
    };

    const insertResult = await client.query(
      `INSERT INTO results 
       (user_id, quiz_id, score, total_questions, answers, weak_areas, feedback, recommendations, ai_analysis)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
       RETURNING id`,
      [
        testResult.userId,
        testResult.quizId,
        testResult.score,
        testResult.totalQuestions,
        JSON.stringify(testResult.answers),
        JSON.stringify(testResult.weakAreas),
        JSON.stringify(testResult.feedback),
        JSON.stringify(testResult.recommendations),
        JSON.stringify({ strengths: ['Algebra'], timeTaken: 900 })
      ]
    );
    
    const resultId = insertResult.rows[0].id;
    console.log(`✅ Inserted result with id: ${resultId}\n`);

    // Test 2: Query results for userId 1
    console.log('🔍 Test 2: Querying results for userId 1...');
    const queryResult = await client.query(
      'SELECT * FROM results WHERE user_id = $1 ORDER BY created_at DESC LIMIT 10',
      [1]
    );
    
    console.log(`✅ Found ${queryResult.rows.length} results for userId 1:`);
    queryResult.rows.forEach((row, idx) => {
      console.log(`\n  Result ${idx + 1}:`);
      console.log(`    - ID: ${row.id}`);
      console.log(`    - user_id: ${row.user_id}`);
      console.log(`    - quiz_id: ${row.quiz_id}`);
      console.log(`    - score: ${row.score}`);
      console.log(`    - total_questions: ${row.total_questions}`);
      console.log(`    - created_at: ${row.created_at}`);
    });

    // Test 3: Show all results in database
    console.log('\n\n📊 Test 3: All results in database:');
    const allResults = await client.query(
      'SELECT id, user_id, quiz_id, score, created_at FROM results ORDER BY created_at DESC LIMIT 20'
    );
    
    console.log(`✅ Total results: ${allResults.rows.length}`);
    allResults.rows.forEach((row, idx) => {
      console.log(`  ${idx + 1}. ID=${row.id}, user_id=${row.user_id}, quiz=${row.quiz_id}, score=${row.score}`);
    });

    // Test 4: Check userId types
    console.log('\n\n🔬 Test 4: Checking userId data types...');
    const typeCheckResult = await client.query(
      `SELECT 
        id, 
        user_id,
        pg_typeof(user_id) as user_id_type,
        quiz_id,
        score
       FROM results 
       LIMIT 5`
    );
    
    console.log('Results with type information:');
    typeCheckResult.rows.forEach((row, idx) => {
      console.log(`  ${idx + 1}. user_id=${row.user_id} (type: ${row.user_id_type}), quiz=${row.quiz_id}, score=${row.score}`);
    });

    client.release();
    
    console.log('\n✅ All tests completed successfully!');
    console.log('\n💡 Summary:');
    console.log(`   - Test result inserted with userId: 1`);
    console.log(`   - Query found: ${queryResult.rows.length} results for userId 1`);
    console.log(`   - Total results in database: ${allResults.rows.length}`);

  } catch (err) {
    console.error('❌ Error during test:', err.message);
    console.error(err);
  } finally {
    await pool.end();
    console.log('\n🔌 Database connection closed');
  }
}

testResults();
