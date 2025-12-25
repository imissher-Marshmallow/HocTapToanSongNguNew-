const Database = require('better-sqlite3');
const db = new Database('backend/quiz.db');

try {
  const schema = db.prepare("SELECT sql FROM sqlite_master WHERE type='table' AND name='results'").all();
  console.log('📋 Results table schema:');
  console.log(schema[0].sql);
  
  console.log('\n📊 Actual data in results table:');
  const rows = db.prepare('SELECT id, user_id, quiz_id, score FROM results LIMIT 5').all();
  console.log(JSON.stringify(rows, null, 2));
  
  // Check data types
  if (rows.length > 0) {
    console.log('\n📌 First row user_id type:', typeof rows[0].user_id, 'value:', rows[0].user_id);
  }
} catch(e) {
  console.error('❌ Error:', e.message);
} finally {
  db.close();
}
