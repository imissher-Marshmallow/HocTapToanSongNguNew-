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

// Run if called directly
if (require.main === module) {
  initializeGuestUser().then(() => {
    console.log('[Init] Complete');
    process.exit(0);
  }).catch(err => {
    console.error('[Init] Failed:', err);
    process.exit(1);
  });
}

module.exports = { initializeGuestUser };
