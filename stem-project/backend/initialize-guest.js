/**
 * Initialize Guest User for Quiz System
 * 
 * Creates a default guest user (id=1) that unauthenticated users can use
 * to save quiz results. This unblocks the entire data persistence flow.
 */

const db = require('./database');

async function initializeGuestUser() {
  console.log('[Init] Setting up guest user for quiz system...');
  
  try {
    // Check if guest user already exists
    const { dbHelpers } = require('./database');
    const existingGuest = await dbHelpers.getUserById(1);
    
    if (existingGuest) {
      console.log('✅ Guest user already exists:', existingGuest);
      return;
    }
    
    // Create guest user
    const guestUser = await dbHelpers.createUser(
      'guest@quizsystem.local',
      'guest_user',
      'hashed_guest_password'
    );
    
    console.log('✅ Guest user created successfully:', guestUser);
  } catch (err) {
    console.error('❌ Error setting up guest user:', err.message);
  }
}

/**
 * Sync all existing users from SQLite to Supabase learning_profiles table
 * This ensures every registered user has a learning profile for AI analysis
 */
async function syncUsersToSupabase() {
  console.log('[Sync] Syncing users to Supabase learning profiles...');
  
  try {
    const { createClient } = require('@supabase/supabase-js');
    const supabaseUrl = process.env.SUPABASE_URL;
    const supabaseKey = process.env.SUPABASE_ANON_KEY;
    
    if (!supabaseUrl || !supabaseKey) {
      console.warn('[Sync] ⚠️  Supabase not configured, skipping user sync');
      return;
    }
    
    const supabase = createClient(supabaseUrl, supabaseKey);
    const { dbHelpers } = require('./database');
    
    // Get all users from SQLite
    const allUsers = await dbHelpers.getAllUsers?.() || [];
    
    if (!allUsers || allUsers.length === 0) {
      console.log('[Sync] No users found to sync');
      return;
    }
    
    console.log(`[Sync] Found ${allUsers.length} users to sync to Supabase`);
    
    let synced = 0;
    let skipped = 0;
    
    // Sync each user
    for (const user of allUsers) {
      try {
        const userId = parseInt(user.id, 10);
        
        // Check if profile already exists
        const { data: existing } = await supabase
          .from('user_learning_profiles')
          .select('id')
          .eq('user_id', userId)
          .single();
        
        if (existing) {
          skipped++;
          continue;
        }
        
        // Create new profile for this user
        const { error } = await supabase
          .from('user_learning_profiles')
          .insert({
            user_id: userId,
            cognitive_levels: { level1: 0, level2: 0, level3: 0, level4: 0 },
            proficiency_status: { 
              level1: 'NOT_STARTED', 
              level2: 'NOT_STARTED', 
              level3: 'NOT_STARTED', 
              level4: 'NOT_STARTED' 
            },
            weak_areas: [],
            strong_areas: [],
            recommendations: ['Take your first quiz to get personalized recommendations'],
            quizzes_taken: 0,
            created_at: new Date().toISOString(),
            last_updated: new Date().toISOString()
          });
        
        if (error) {
          console.warn(`[Sync] Failed to create profile for user ${userId}:`, error.message);
        } else {
          synced++;
          console.log(`[Sync] ✅ Created profile for user ${userId}`);
        }
      } catch (err) {
        console.warn(`[Sync] Error syncing user:`, err.message);
      }
    }
    
    console.log(`[Sync] ✅ Complete: ${synced} synced, ${skipped} already existing`);
  } catch (err) {
    console.error('[Sync] ❌ Error syncing users:', err.message);
  }
}

// Run if called directly
if (require.main === module) {
  (async () => {
    await initializeGuestUser();
    await syncUsersToSupabase();
    console.log('[Init] Complete');
    process.exit(0);
  })().catch(err => {
    console.error('[Init] Failed:', err);
    process.exit(1);
  });
}

module.exports = { initializeGuestUser, syncUsersToSupabase };
