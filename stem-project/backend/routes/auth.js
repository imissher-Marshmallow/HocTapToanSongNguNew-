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
    res.status(500).json({ error: 'Internal server error' });
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
    res.status(500).json({ error: 'Internal server error' });
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

module.exports = router;
