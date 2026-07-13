// Express Server for Dome Social Media Hub

import express from 'express';
import cookieParser from 'cookie-parser';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';

import { 
  initDb, 
  getUsers, 
  getUserWithPassword, 
  saveUser, 
  deleteUser, 
  getAccounts, 
  updateAccountConnection, 
  getPosts, 
  savePost, 
  updatePost, 
  deletePost 
} from './db.js';

import { DEPARTMENTS, ANALYTICS_DATA } from './mockData.js';
import './scheduler.js'; // Start background scheduler cron immediately

// Load environment config
dotenv.config();

const app = express();
const PORT = process.env.PORT || 8080;
const JWT_SECRET = process.env.JWT_SECRET || 'dome_social_super_secret_secret';

// ESM path helpers
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Middlewares
app.use(express.json());
app.use(cookieParser());

// Initialize Database
await initDb();

// Serve static assets from project root
app.use(express.static(__dirname));

// --- AUTH MIDDLEWARE ---
function authenticateToken(req, res, next) {
  const token = req.cookies.token;
  if (!token) {
    return res.status(401).json({ error: 'Unauthorized: Session token missing' });
  }

  jwt.verify(token, JWT_SECRET, (err, decoded) => {
    if (err) {
      return res.status(403).json({ error: 'Forbidden: Invalid session token' });
    }
    req.user = decoded;
    next();
  });
}

function requireAdmin(req, res, next) {
  if (req.user && req.user.role === 'administrator') {
    next();
  } else {
    res.status(403).json({ error: 'Access Denied: Administrator role required' });
  }
}

// --- AUTHENTICATION ENDPOINTS ---

// Log In Securely
app.post('/api/auth/login', async (req, res) => {
  const { username, password } = req.body;
  if (!username || !password) {
    return res.status(400).json({ error: 'Username and password are required' });
  }

  try {
    const user = await getUserWithPassword(username.trim().toLowerCase());
    if (!user) {
      return res.status(401).json({ error: 'Invalid username or password' });
    }

    const isValid = bcrypt.compareSync(password, user.password_hash);
    if (!isValid) {
      return res.status(401).json({ error: 'Invalid username or password' });
    }

    // Sign JWT token
    const token = jwt.sign(
      { username: user.username, role: user.role, allowedDepts: user.allowedDepts },
      JWT_SECRET,
      { expiresIn: '24h' }
    );

    // Set HTTP-Only Cookie
    res.cookie('token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      maxAge: 24 * 60 * 60 * 1000 // 24 hours
    });

    res.json({
      username: user.username,
      role: user.role,
      allowedDepts: user.allowedDepts
    });
  } catch (err) {
    console.error('Login Endpoint Error:', err);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

// Check Active Session
app.get('/api/auth/session', (req, res) => {
  const token = req.cookies.token;
  if (!token) {
    return res.status(401).json({ loggedIn: false });
  }

  jwt.verify(token, JWT_SECRET, (err, decoded) => {
    if (err) {
      return res.status(401).json({ loggedIn: false });
    }
    res.json({
      loggedIn: true,
      username: decoded.username,
      role: decoded.role,
      allowedDepts: decoded.allowedDepts
    });
  });
});

// Log Out
app.post('/api/auth/logout', (req, res) => {
  res.clearCookie('token');
  res.json({ success: true, message: 'Logged out successfully' });
});

// --- USER MANAGEMENT ENDPOINTS (Admin Only) ---

// List Users
app.get('/api/users', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const users = await getUsers();
    res.json(users);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch users list' });
  }
});

// Create User
app.post('/api/users', authenticateToken, requireAdmin, async (req, res) => {
  const { username, password, role, allowedDepts } = req.body;
  if (!username || !password || !role || !allowedDepts || allowedDepts.length === 0) {
    return res.status(400).json({ error: 'Missing required user creation fields' });
  }

  try {
    const existing = await getUserWithPassword(username.trim().toLowerCase());
    if (existing) {
      return res.status(400).json({ error: 'Username already exists' });
    }

    const newUser = {
      username: username.trim().toLowerCase(),
      password_hash: bcrypt.hashSync(password, 10),
      role: role === 'administrator' ? 'administrator' : 'manager',
      allowedDepts
    };

    await saveUser(newUser);
    res.status(201).json({ success: true, message: 'User profile created successfully' });
  } catch (err) {
    res.status(500).json({ error: 'Failed to save new user profile' });
  }
});

// Delete User
app.delete('/api/users/:username', authenticateToken, requireAdmin, async (req, res) => {
  const { username } = req.params;
  if (username === 'admin') {
    return res.status(400).json({ error: 'Cannot delete the master admin account' });
  }

  try {
    await deleteUser(username);
    res.json({ success: true, message: `User "${username}" deleted successfully` });
  } catch (err) {
    res.status(500).json({ error: 'Failed to delete user profile' });
  }
});

// --- WORKSPACE & ACCOUNTS ENDPOINTS ---

// Fetch Allowed Departments
app.get('/api/departments', authenticateToken, (req, res) => {
  const filtered = DEPARTMENTS.filter(d => req.user.allowedDepts.includes(d.id));
  res.json(filtered);
});

// Fetch Accounts for Active Department
app.get('/api/accounts', authenticateToken, async (req, res) => {
  const { departmentId } = req.query;
  if (!departmentId) {
    return res.status(400).json({ error: 'Missing departmentId query parameter' });
  }

  // Permission Check
  if (!req.user.allowedDepts.includes(departmentId)) {
    return res.status(403).json({ error: 'Access Denied: Unauthorized department workspace' });
  }

  try {
    const accounts = await getAccounts(departmentId);
    res.json(accounts);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch social accounts' });
  }
});

// Connect Account integration (Simulated OAuth Approval)
app.post('/api/accounts/:id/connect', authenticateToken, async (req, res) => {
  const { id } = req.params;
  try {
    await updateAccountConnection(id, true, 'mock_access_token_1234567890');
    res.json({ success: true, message: 'API connection authorized' });
  } catch (err) {
    res.status(500).json({ error: 'Failed to connect account integration' });
  }
});

// Disconnect Account
app.post('/api/accounts/:id/disconnect', authenticateToken, async (req, res) => {
  const { id } = req.params;
  try {
    await updateAccountConnection(id, false, null);
    res.json({ success: true, message: 'API connection revoked' });
  } catch (err) {
    res.status(500).json({ error: 'Failed to disconnect account' });
  }
});

// --- POSTS MANAGER ENDPOINTS ---

// Fetch Posts
app.get('/api/posts', authenticateToken, async (req, res) => {
  const { departmentId, status } = req.query;
  if (!departmentId) {
    return res.status(400).json({ error: 'Missing departmentId parameter' });
  }

  if (!req.user.allowedDepts.includes(departmentId)) {
    return res.status(403).json({ error: 'Access Denied: Unauthorized department workspace' });
  }

  try {
    const posts = await getPosts(departmentId, status || 'all');
    res.json(posts);
  } catch (err) {
    res.status(500).json({ error: 'Failed to retrieve posts list' });
  }
});

// Save Post (Draft, Scheduled, or Instant Publish)
app.post('/api/posts', authenticateToken, async (req, res) => {
  const post = req.body;
  if (!post.id || !post.departmentId || !post.platforms || post.platforms.length === 0) {
    return res.status(400).json({ error: 'Missing required post fields' });
  }

  if (!req.user.allowedDepts.includes(post.departmentId)) {
    return res.status(403).json({ error: 'Access Denied: Unauthorized department workspace' });
  }

  try {
    await savePost(post);
    res.status(201).json({ success: true, message: 'Post successfully saved' });
  } catch (err) {
    res.status(500).json({ error: 'Failed to save post' });
  }
});

// Edit Post
app.put('/api/posts/:id', authenticateToken, async (req, res) => {
  const { id } = req.params;
  const updates = req.body;

  try {
    await updatePost(id, updates);
    res.json({ success: true, message: 'Post updated successfully' });
  } catch (err) {
    res.status(500).json({ error: 'Failed to update post' });
  }
});

// Delete Post
app.delete('/api/posts/:id', authenticateToken, async (req, res) => {
  const { id } = req.params;
  try {
    await deletePost(id);
    res.json({ success: true, message: 'Post deleted successfully' });
  } catch (err) {
    res.status(500).json({ error: 'Failed to delete post' });
  }
});

// --- ANALYTICS ENDPOINTS ---

app.get('/api/analytics/:deptId', authenticateToken, (req, res) => {
  const { deptId } = req.params;
  if (!req.user.allowedDepts.includes(deptId)) {
    return res.status(403).json({ error: 'Access Denied: Unauthorized department workspace' });
  }

  const data = ANALYTICS_DATA[deptId];
  if (data) {
    res.json(data);
  } else {
    res.status(404).json({ error: 'Analytics logs not found for department' });
  }
});

// Catch-all route to serve index.html for frontend routing
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'index.html'));
});

// Bind Server
app.listen(PORT, () => {
  console.log(`Server: Running online at http://127.0.0.1:${PORT}`);
});
