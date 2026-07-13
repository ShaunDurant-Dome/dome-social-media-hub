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
app.use((req, res, next) => {
  console.log(`[API Request] ${req.method} ${req.url}`);
  next();
});

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

// Fetch Accounts
app.get('/api/accounts', authenticateToken, async (req, res) => {
  const { departmentId } = req.query;
  try {
    if (departmentId) {
      if (!req.user.allowedDepts.includes(departmentId)) {
        return res.status(403).json({ error: 'Access Denied: Unauthorized department workspace' });
      }
      const accounts = await getAccounts(departmentId);
      return res.json(accounts);
    }
    
    // Return all accounts if admin, or filter by allowed departments
    const allAccounts = await getAccounts();
    if (req.user.role === 'admin') {
      res.json(allAccounts);
    } else {
      res.json(allAccounts.filter(a => req.user.allowedDepts.includes(a.departmentId)));
    }
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch social accounts' });
  }
});

// Connect Account integration (Simulated or Live Credentials Setup)
app.post('/api/accounts/:id/connect', authenticateToken, async (req, res) => {
  const { id } = req.params;
  const { live, name, handle, accessToken } = req.body;
  try {
    if (live) {
      await updateAccountConnection(id, true, accessToken, name, handle);
    } else {
      await updateAccountConnection(id, true, 'mock_access_token_1234567890');
    }
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

// Bulk Sync Meta Pages & Instagram
app.post('/api/sync/facebook', authenticateToken, async (req, res) => {
  const { userToken } = req.body;
  if (!userToken) {
    return res.status(400).json({ error: 'Missing userToken parameter' });
  }
  try {
    const metaRes = await fetch(`https://graph.facebook.com/v18.0/me/accounts?fields=name,id,access_token,instagram_business_account{id,username,name}&access_token=${userToken}&limit=100`);
    const metaJson = await metaRes.json();
    if (!metaRes.ok) {
      throw new Error(metaJson.error?.message || 'Meta API returned error status');
    }
    
    const pages = (metaJson.data || []).map(page => ({
      name: page.name,
      id: page.id,
      accessToken: page.access_token,
      instagram: page.instagram_business_account ? {
        id: page.instagram_business_account.id,
        username: page.instagram_business_account.username,
        name: page.instagram_business_account.name
      } : null
    }));
    
    res.json({ pages });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Bulk Sync Google Business Profiles
app.post('/api/sync/google', authenticateToken, async (req, res) => {
  const { userToken } = req.body;
  if (!userToken) {
    return res.status(400).json({ error: 'Missing userToken parameter' });
  }
  try {
    const accRes = await fetch('https://mybusiness.googleapis.com/v4/accounts', {
      headers: { 'Authorization': `Bearer ${userToken}` }
    });
    
    const contentType = accRes.headers.get('content-type') || '';
    let accJson;
    if (contentType.includes('application/json')) {
      accJson = await accRes.json();
    } else {
      throw new Error(`Google returned a non-JSON error (HTTP ${accRes.status}). Please check that the 'My Business Business Information API' is enabled in your Google Cloud Developer Console.`);
    }
    
    if (!accRes.ok) {
      throw new Error(accJson.error?.message || 'Failed to fetch Google accounts');
    }
    
    const locations = [];
    for (const acc of accJson.accounts || []) {
      const locRes = await fetch(`https://mybusiness.googleapis.com/v4/${acc.name}/locations`, {
        headers: { 'Authorization': `Bearer ${userToken}` }
      });
      
      const locContentType = locRes.headers.get('content-type') || '';
      if (locContentType.includes('application/json')) {
        const locJson = await locRes.json();
        if (locRes.ok && locJson.locations) {
          for (const loc of locJson.locations) {
            locations.push({
              name: loc.locationName,
              id: loc.name.split('/').pop(),
              handle: loc.name
            });
          }
        }
      }
    }
    res.json({ locations });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Save Bulk Mappings
app.post('/api/sync/save', authenticateToken, async (req, res) => {
  const { mappings } = req.body;
  if (!Array.isArray(mappings)) {
    return res.status(400).json({ error: 'Mappings must be an array' });
  }
  try {
    for (const m of mappings) {
      await updateAccountConnection(m.id, true, m.accessToken, m.name, m.handle);
    }
    res.json({ success: true, message: 'Bulk mappings applied successfully' });
  } catch (err) {
    res.status(500).json({ error: err.message });
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
