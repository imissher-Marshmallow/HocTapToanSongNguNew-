/**
 * check-auth-issue.js
 * 
 * Diagnostic script to understand the auth/history mismatch:
 * 1. Check all users in the database and their IDs
 * 2. Check all results and their user_id references
 * 3. Identify which users have results and which don't
 */

require('dotenv').config();
const { dbHelpers } = require('./database');

async function main() {
  console.log('========================================');
  console.log('AUTH & HISTORY MISMATCH DIAGNOSTIC');
  console.log('========================================\n');

  try {
    // Get all users
    console.log('[STEP 1] Fetching all users from database...');
    const users = await dbHelpers.getAllUsers();
    console.log(`✅ Found ${users.length} user(s):`);
    users.forEach(u => {
      console.log(`   - ID: ${u.id} (type: ${typeof u.id}), Email: ${u.email}, Username: ${u.username}, Created: ${u.created_at}`);
    });

    // Get all results
    console.log('\n[STEP 2] Fetching all results from database...');
    const results = await dbHelpers.getAllResults();
    console.log(`✅ Found ${results.length} result(s):`);
    results.forEach(r => {
      console.log(`   - Result ID: ${r.id}, User ID: ${r.user_id} (type: ${typeof r.user_id}), Quiz: ${r.quiz_id}, Score: ${r.score}, Created: ${r.created_at}`);
    });

    // Check if user_ids from results reference valid users
    console.log('\n[STEP 3] Checking if result user_ids reference valid users...');
    const uniqueUserIds = [...new Set(results.map(r => r.user_id))];
    for (const userId of uniqueUserIds) {
      const user = users.find(u => u.id === userId || u.id === String(userId));
      if (user) {
        console.log(`   ✅ User ID ${userId} EXISTS: ${user.email} (${user.username})`);
      } else {
        console.log(`   ❌ User ID ${userId} NOT FOUND - ORPHANED RESULTS!`);
      }
    }

    // For each user, show their results
    console.log('\n[STEP 4] Results per user:');
    for (const user of users) {
      const userResults = results.filter(r => r.user_id === user.id);
      console.log(`   User "${user.username}" (ID: ${user.id}): ${userResults.length} result(s)`);
    }

    // Check for type mismatches (string vs number)
    console.log('\n[STEP 5] Checking for type mismatches...');
    let typeIssue = false;
    results.forEach(r => {
      if (typeof r.user_id !== 'number') {
        console.log(`   ⚠️  Result ID ${r.id} has user_id="${r.user_id}" as ${typeof r.user_id} (should be number)`);
        typeIssue = true;
      }
    });
    if (!typeIssue) {
      console.log('   ✅ All user_id types are correct (number)');
    }

    console.log('\n========================================');
    console.log('SUMMARY:');
    console.log(`Total Users: ${users.length}`);
    console.log(`Total Results: ${results.length}`);
    console.log(`Users with results: ${uniqueUserIds.length}`);
    console.log('========================================\n');

  } catch (err) {
    console.error('❌ Error:', err.message);
  }

  process.exit(0);
}

main();
