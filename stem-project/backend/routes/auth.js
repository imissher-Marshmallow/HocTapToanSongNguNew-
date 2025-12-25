const express = require('express');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcrypt');
const { dbHelpers } = require('../database');
const router = express.Router();

const JWT_SECRET = process.env.JWT_SECRET || 'b1634a3c6a68375399142567f365adbfb80d6de37113b75b624e36852b1b279a';

// Helper: Generate JWT token
function generateToken(userId, email) {
  return jwt.sign(
    { userId, email },
    JWT_SECRET,
    { expiresIn: '7d' }
  );
}

// POST /auth/signup - Register new user
router.post('/signup', async (req, res) => {
  try {
    const { email, username, password, confirmPassword } = req.body;

    // Validation
    if (!email || !username || !password) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    if (password !== confirmPassword) {
      return res.status(400).json({ error: 'Passwords do not match' });
    }

    if (password.length < 6) {
      return res.status(400).json({ error: 'Password must be at least 6 characters' });
    }

    // Check if user exists
    const existingUser = await dbHelpers.getUserByEmail(email);
    if (existingUser) {
      return res.status(409).json({ error: 'Email already registered' });
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Create user in database
    const user = await dbHelpers.createUser(email, username, hashedPassword);

    // Auto-create learning profile in Supabase for AI analysis
    try {
      const { createClient } = require('@supabase/supabase-js');
      const supabaseUrl = process.env.SUPABASE_URL;
      const supabaseKey = process.env.SUPABASE_ANON_KEY;
      
      if (supabaseUrl && supabaseKey) {
        const supabase = createClient(supabaseUrl, supabaseKey);
        
        // Insert new user profile with default values
        const { data, error } = await supabase
          .from('user_learning_profiles')
          .insert([{
            user_id: user.id,
            cognitive_levels: { level1: 0, level2: 0, level3: 0, level4: 0 },
            proficiency_status: { 
              level1: 'NOT_STARTED', 
              level2: 'NOT_STARTED', 
              level3: 'NOT_STARTED', 
              level4: 'NOT_STARTED' 
            },
            weak_areas: [],
            strong_areas: [],
            recommendations: [],
            quizzes_taken: 0
          }])
          .select();
        
        if (error) {
          console.warn('⚠️ Warning: Could not create learning profile:', error.message);
          // Don't fail signup if profile creation fails
        } else {
          console.log('✅ Learning profile created for user:', user.id);
        }
      } else {
        console.warn('⚠️ Supabase credentials not configured for profile auto-creation');
      }
    } catch (profileError) {
      console.warn('⚠️ Error creating learning profile:', profileError.message);
      // Don't fail signup if profile creation fails
    }

    // Generate token
    const token = generateToken(user.id, email);

    res.status(201).json({
      token,
      user: {
        id: user.id,
        email: user.email,
        username: user.username
      },
      message: 'Account created successfully'
    });
  } catch (err) {
    console.error('Signup error:', err);
    
    // If database is read-only (Vercel serverless), generate a token anyway but warn user
    if (err && err.code === 'SQLITE_READONLY') {
      console.warn('Database is read-only; generating token without persistence (development/demo mode)');
      const email = req.body.email;
      const username = req.body.username;
      // Use email hash as temporary user ID for demo
      const demoUserId = Math.abs(email.split('').reduce((a, b) => a + b.charCodeAt(0), 0));
      const token = generateToken(demoUserId, email);
      return res.status(201).json({
        token,
        user: {
          id: demoUserId,
          email: email,
          username: username
        },
        message: 'Account created (demo mode - not persisted)',
        warning: 'Using read-only database; data will not be saved between sessions'
      });
    }
    
    res.status(500).json({ error: 'Internal server error', details: err && err.message });
  }
});

// POST /auth/signin - Login user
router.post('/signin', async (req, res) => {
  try {
    const { email, password } = req.body;

    // Validation
    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password required' });
    }

    // Find user in database
    const user = await dbHelpers.getUserByEmail(email);
    if (!user) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    // Check password
    const validPassword = await bcrypt.compare(password, user.password_hash);
    if (!validPassword) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    // Generate token
    const token = generateToken(user.id, user.email);

    res.json({
      token,
      user: {
        id: user.id,
        email: user.email,
        username: user.username
      },
      message: 'Logged in successfully'
    });
  } catch (err) {
    console.error('Signin error:', err);
    res.status(500).json({ 
      error: 'Internal server error', 
      details: process.env.NODE_ENV === 'development' ? err.message : undefined 
    });
  }
});

// POST /auth/logout - Logout user
router.post('/logout', (req, res) => {
  // In a real app, you might invalidate the token in a blacklist
  res.json({ message: 'Logged out successfully' });
});

// GET /auth/me - Get current user
router.get('/me', async (req, res) => {
  try {
    const token = req.headers.authorization?.split(' ')[1];
    if (!token) {
      return res.status(401).json({ error: 'No token provided' });
    }

    const decoded = jwt.verify(token, JWT_SECRET);
    const user = await dbHelpers.getUserById(decoded.userId);

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.json({
      user: {
        id: user.id,
        email: user.email,
        username: user.username
      }
    });
  } catch (err) {
    res.status(401).json({ error: 'Invalid token' });
  }
});

// POST /auth/verify-token - Verify token validity
router.post('/verify-token', (req, res) => {
  try {
    const token = req.headers.authorization?.split(' ')[1];
    if (!token) {
      return res.status(401).json({ valid: false });
    }

    jwt.verify(token, JWT_SECRET);
    res.json({ valid: true });
  } catch (err) {
    res.status(401).json({ valid: false });
  }
});

// GET /auth/health - Health check
router.get('/health', (req, res) => {
  res.json({ 
    status: 'ok', 
    message: 'Auth service is running',
    timestamp: new Date()
  });
});

module.exports = router;
