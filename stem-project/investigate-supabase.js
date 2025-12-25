/**
 * Deep Investigation Script
 * Check what's actually in Supabase vs what code expects
 */

const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabase = createClient(
  process.env.SUPABASE_URL || 'https://example.supabase.co',
  process.env.SUPABASE_ANON_KEY || 'key'
);

async function investigateSupabase() {
  console.log('\n🔍 DEEP SUPABASE INVESTIGATION\n');
  console.log('='.repeat(70));

  // 1. Check what tables exist
  console.log('\n1️⃣  CHECKING TABLES IN SUPABASE');
  try {
    // List all tables by checking information schema
    const { data: tables, error } = await supabase
      .from('information_schema.tables')
      .select('table_name')
      .eq('table_schema', 'public');
    
    if (!error && tables) {
      console.log('✅ Tables found:');
      tables.forEach(t => console.log(`   - ${t.table_name}`));
    } else if (error) {
      console.log('⚠️ Could not query schema:', error.message);
      console.log('Attempting to query known tables manually...');
    }
  } catch (e) {
    console.log('⚠️ Schema query failed, checking known tables');
  }

  // 2. Check quiz_results table
  console.log('\n2️⃣  CHECKING QUIZ_RESULTS TABLE');
  try {
    const { data, error, count } = await supabase
      .from('quiz_results')
      .select('*', { count: 'exact' })
      .limit(1);
    
    if (!error && count !== null) {
      console.log(`✅ quiz_results exists: ${count} rows`);
      if (data && data.length > 0) {
        const sample = data[0];
        console.log('✅ Sample row columns:');
        Object.keys(sample).forEach(key => {
          const value = sample[key];
          const type = typeof value;
          console.log(`   - ${key}: ${type} ${value !== null ? `= ${JSON.stringify(value).substring(0, 50)}` : '(null)'}`);
        });
        
        // Check user_id type specifically
        const userId = sample.user_id;
        console.log(`\n⚠️  user_id type: ${typeof userId} (value: ${userId})`);
      }
    } else if (error) {
      console.log(`❌ quiz_results error: ${error.message}`);
    }
  } catch (e) {
    console.log(`❌ quiz_results check failed: ${e.message}`);
  }

  // 3. Check users table
  console.log('\n3️⃣  CHECKING USERS TABLE');
  try {
    const { data, error, count } = await supabase
      .from('users')
      .select('id, email, username', { count: 'exact' })
      .limit(5);
    
    if (!error && count !== null) {
      console.log(`✅ users exists: ${count} rows`);
      if (data && data.length > 0) {
        console.log('✅ Sample users:');
        data.forEach(u => {
          console.log(`   - ID: ${u.id} (type: ${typeof u.id}), Email: ${u.email}`);
        });
      }
    } else if (error) {
      console.log(`❌ users error: ${error.message}`);
    }
  } catch (e) {
    console.log(`❌ users check failed: ${e.message}`);
  }

  // 4. Check user_learning_profiles table
  console.log('\n4️⃣  CHECKING USER_LEARNING_PROFILES TABLE');
  try {
    const { data, error, count } = await supabase
      .from('user_learning_profiles')
      .select('*', { count: 'exact' })
      .limit(1);
    
    if (!error && count !== null) {
      console.log(`✅ user_learning_profiles exists: ${count} rows`);
      if (data && data.length > 0) {
        console.log('✅ Schema (first row):');
        Object.keys(data[0]).forEach(key => {
          console.log(`   - ${key}`);
        });
      }
    } else if (error) {
      console.log(`❌ user_learning_profiles error: ${error.message}`);
    }
  } catch (e) {
    console.log(`❌ user_learning_profiles check failed: ${e.message}`);
  }

  // 5. Check quiz_results for user_id=1 data
  console.log('\n5️⃣  CHECKING DATA FOR USER_ID=1');
  try {
    const { data, error } = await supabase
      .from('quiz_results')
      .select('*')
      .eq('user_id', 1)
      .limit(3);
    
    if (!error && data) {
      console.log(`✅ Found ${data.length} results for user_id=1 (as number)`);
      data.forEach((row, idx) => {
        console.log(`\n  Result ${idx + 1}:`);
        console.log(`    - ID: ${row.id}`);
        console.log(`    - user_id: ${row.user_id} (type: ${typeof row.user_id})`);
        console.log(`    - quiz_id: ${row.quiz_id}`);
        console.log(`    - score: ${row.overall_score}`);
        console.log(`    - created_at: ${row.created_at}`);
      });
    } else if (error) {
      console.log(`❌ Query error: ${error.message}`);
    }
  } catch (e) {
    console.log(`❌ Check failed: ${e.message}`);
  }

  // 6. Check quiz_results for user_id='1' (string)
  console.log('\n6️⃣  CHECKING DATA FOR USER_ID="1" (STRING)');
  try {
    const { data, error } = await supabase
      .from('quiz_results')
      .select('*')
      .eq('user_id', '1')
      .limit(3);
    
    if (!error && data) {
      console.log(`✅ Found ${data.length} results for user_id='1' (as string)`);
    } else if (error) {
      console.log(`⚠️ Query error: ${error.message}`);
    }
  } catch (e) {
    console.log(`⚠️ Check failed: ${e.message}`);
  }

  // 7. Check profile updates
  console.log('\n7️⃣  CHECKING PROFILE UPDATES FOR USER_ID=1');
  try {
    const { data, error } = await supabase
      .from('user_learning_profiles')
      .select('*')
      .eq('user_id', 1)
      .limit(1);
    
    if (!error && data && data.length > 0) {
      console.log('✅ Profile found:');
      console.log(`    - cognitive_levels: ${JSON.stringify(data[0].cognitive_levels).substring(0, 80)}`);
      console.log(`    - weak_areas: ${JSON.stringify(data[0].weak_areas).substring(0, 80)}`);
      console.log(`    - last_updated: ${data[0].last_updated}`);
    } else if (error) {
      console.log(`❌ Error: ${error.message}`);
    } else {
      console.log('❌ No profile found for user_id=1');
    }
  } catch (e) {
    console.log(`❌ Check failed: ${e.message}`);
  }

  console.log('\n' + '='.repeat(70));
  console.log('\n📊 SUMMARY:');
  console.log('- Check if quiz_results data is saving');
  console.log('- Check if user_id is NUMBER (not STRING)');
  console.log('- Check if user_learning_profiles table exists and updates');
  console.log('- Check if profile updates happen after quiz submission');
  
  process.exit(0);
}

investigateSupabase().catch(err => {
  console.error('Investigation failed:', err);
  process.exit(1);
});
