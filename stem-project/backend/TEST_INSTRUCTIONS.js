/**
 * Instructions for testing with real Supabase database
 * 
 * You can test in two ways:
 */

console.log(`
╔════════════════════════════════════════════════════════════════════════════╗
║                    HOW TO TEST WITH REAL SUPABASE                         ║
╚════════════════════════════════════════════════════════════════════════════╝

📋 METHOD 1: Get DATABASE_URL from Vercel Environment
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

1. Go to Vercel Dashboard → Your Project
2. Settings → Environment Variables
3. Copy the DATABASE_URL value (should start with postgresql://)
4. Run this command in terminal:

   node test-results.js "postgresql://user:password@host:6543/database"

   Or save it to .env.local and run:
   
   node -e "require('dotenv').config({path:'.env.local'}); require('./test-results.js')()"


📋 METHOD 2: Use Supabase Dashboard Directly
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

1. Go to Supabase Dashboard → SQL Editor
2. Run this query to see all results:

   SELECT id, user_id, quiz_id, score, created_at FROM results ORDER BY created_at DESC LIMIT 20;

3. Run this to see results for userId 1:

   SELECT * FROM results WHERE user_id = 1 ORDER BY created_at DESC;

4. Run this to see ALL user_ids in the database:

   SELECT DISTINCT user_id FROM results ORDER BY user_id;


📋 METHOD 3: Quick Python Test (if you have Python installed)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

1. Save DATABASE_URL from Vercel to a file or environment variable
2. Run:

   python3 -c "
import psycopg2
import os

db_url = os.getenv('DATABASE_URL', 'YOUR_DB_URL_HERE')
conn = psycopg2.connect(db_url, sslmode='require')
cur = conn.cursor()

# Get all results
cur.execute('SELECT id, user_id, quiz_id, score FROM results ORDER BY created_at DESC LIMIT 10')
rows = cur.fetchall()
print(f'Found {len(rows)} results:')
for row in rows:
    print(f'  ID={row[0]}, user_id={row[1]}, quiz={row[2]}, score={row[3]}')

cur.close()
conn.close()
"


═══════════════════════════════════════════════════════════════════════════════

🔍 DEBUGGING STEPS:

1. ✅ Query what userIds exist in database:
   SELECT DISTINCT user_id FROM results;

2. ✅ Check if userId 1 has ANY results:
   SELECT COUNT(*) FROM results WHERE user_id = 1;

3. ✅ Check what userId was used when submitting quiz (check Vercel logs):
   Look for: "[Results] POST /api/results received: { bodyUserId: ..., finalUserId: ... }"

4. ✅ Compare the userId formats:
   - Is userId 1 (integer)?
   - Is userId '1' (string)?
   - Is userId something else?

═══════════════════════════════════════════════════════════════════════════════

💡 MOST LIKELY ISSUE:

Your frontend is sending userId='anonymous' or userId from localStorage doesn't match
what's saved in auth token. The logging we added should show this in Vercel logs.

Check backend console logs for:
  "[Results] POST /api/results received: { bodyUserId: X, finalUserId: Y }"

═══════════════════════════════════════════════════════════════════════════════
`);
