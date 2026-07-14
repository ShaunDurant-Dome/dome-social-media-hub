// Database Adapter for Dome Social Media Hub (Postgres & Local JSON Fallback)

import fs from 'fs';
import path from 'path';
import pg from 'pg';
import bcrypt from 'bcryptjs';
import { SOCIAL_ACCOUNTS, INITIAL_POSTS, DEPARTMENTS } from './mockData.js';

const { Pool } = pg;

// Environment Config
const isPostgres = !!process.env.DATABASE_URL;
let pool = null;

if (isPostgres) {
  console.log('DB: Using PostgreSQL Mode');
  pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false } // Required for Render/Supabase hosting
  });
} else {
  console.log('DB: Using Local JSON File Mode');
}

// Local Database File Paths (Auto-detects Render Persistent Disk mount directory)
const dataDir = fs.existsSync('/data') ? '/data' : process.cwd();

const USERS_FILE = path.join(dataDir, 'db_users.json');
const ACCOUNTS_FILE = path.join(dataDir, 'db_accounts.json');
const POSTS_FILE = path.join(dataDir, 'db_posts.json');
const GALLERY_FILE = path.join(dataDir, 'db_gallery.json');

const DEFAULT_GALLERY = [
  { id: 'preset-1', url: 'https://images.unsplash.com/photo-1514525253161-7a46d19cd819?w=800&auto=format&fit=crop&q=80', label: 'Event' },
  { id: 'preset-2', url: 'https://images.unsplash.com/photo-1563379091339-03b21ab4a4f8?w=800&auto=format&fit=crop&q=80', label: 'Dining' },
  { id: 'preset-3', url: 'https://images.unsplash.com/photo-1517838277536-f5f99be501cd?w=800&auto=format&fit=crop&q=80', label: 'Fitness' },
  { id: 'preset-4', url: 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=800&auto=format&fit=crop&q=80', label: 'Office' },
  { id: 'preset-5', url: 'https://images.unsplash.com/photo-1513558161293-cdaf765ed2fd?w=800&auto=format&fit=crop&q=80', label: 'Bar' },
  { id: 'preset-6', url: 'https://images.unsplash.com/photo-1470225620780-dba8ba36b745?w=800&auto=format&fit=crop&q=80', label: 'Concert' }
];

// Default initial users
const DEFAULT_USERS = [
  { username: 'admin', password_hash: bcrypt.hashSync('adminpass', 10), role: 'administrator', allowedDepts: ['namibia', 'gym', 'cycling', 'hotel', 'kinderzone', 'pitstop'] },
  { username: 'gymmanager', password_hash: bcrypt.hashSync('gympass', 10), role: 'gym_manager', allowedDepts: ['gym', 'cycling'] },
  { username: 'loungemanager', password_hash: bcrypt.hashSync('loungepass', 10), role: 'lounge_manager', allowedDepts: ['pitstop'] },
  { username: 'namibiamanager', password_hash: bcrypt.hashSync('nampass', 10), role: 'namibia_manager', allowedDepts: ['namibia'] },
  { username: 'hotelmanager', password_hash: bcrypt.hashSync('hotelpass', 10), role: 'hotel_manager', allowedDepts: ['hotel', 'kinderzone'] }
];

// Initialize database schema/files
export async function initDb() {
  if (isPostgres) {
    try {
      // 1. Create tables if they do not exist
      await pool.query(`
        CREATE TABLE IF NOT EXISTS users (
          id SERIAL PRIMARY KEY,
          username VARCHAR(50) UNIQUE NOT NULL,
          password_hash VARCHAR(255) NOT NULL,
          role VARCHAR(50) NOT NULL,
          allowed_depts TEXT[] NOT NULL,
          created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
        );
      `);

      await pool.query(`
        CREATE TABLE IF NOT EXISTS social_accounts (
          id VARCHAR(50) PRIMARY KEY,
          department_id VARCHAR(50) NOT NULL,
          platform VARCHAR(20) NOT NULL,
          name VARCHAR(100) NOT NULL,
          handle VARCHAR(100) NOT NULL,
          avatar VARCHAR(10),
          connected BOOLEAN DEFAULT FALSE,
          access_token TEXT,
          updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
        );
      `);

      await pool.query(`
        CREATE TABLE IF NOT EXISTS posts (
          id VARCHAR(50) PRIMARY KEY,
          department_id VARCHAR(50) NOT NULL,
          platforms TEXT[] NOT NULL,
          content TEXT,
          media_url TEXT,
          media_type VARCHAR(10) DEFAULT 'none',
          status VARCHAR(20) NOT NULL,
          scheduled_date TIMESTAMP WITH TIME ZONE,
          created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
          published_at TIMESTAMP WITH TIME ZONE,
          metrics JSONB
        );
      `);

      await pool.query('ALTER TABLE posts ADD COLUMN IF NOT EXISTS error_details TEXT;');

      await pool.query(`
        CREATE TABLE IF NOT EXISTS gallery_presets (
          id VARCHAR(50) PRIMARY KEY,
          url TEXT NOT NULL,
          label VARCHAR(100),
          created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
        );
      `);

      // 2. Seed tables if empty
      const usersCount = await pool.query('SELECT COUNT(*) FROM users');
      if (parseInt(usersCount.rows[0].count) === 0) {
        console.log('DB: Seeding default users...');
        for (const user of DEFAULT_USERS) {
          await pool.query(
            'INSERT INTO users (username, password_hash, role, allowed_depts) VALUES ($1, $2, $3, $4)',
            [user.username, user.password_hash, user.role, user.allowedDepts]
          );
        }
      }

      const accountsCount = await pool.query('SELECT COUNT(*) FROM social_accounts');
      if (parseInt(accountsCount.rows[0].count) === 0) {
        console.log('DB: Seeding default social accounts...');
        for (const acc of SOCIAL_ACCOUNTS) {
          await pool.query(
            'INSERT INTO social_accounts (id, department_id, platform, name, handle, avatar, connected, access_token) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)',
            [acc.id, acc.departmentId, acc.platform, acc.name, acc.handle, acc.avatar, acc.connected, null]
          );
        }
      }

      // Clean up old mock posts if present
      await pool.query("DELETE FROM posts WHERE id LIKE 'post-nam-%' OR id LIKE 'post-gym-%' OR id LIKE 'post-cyc-%' OR id LIKE 'post-hot-%' OR id LIKE 'post-kin-%' OR id LIKE 'post-pit-%'");
      
      const postsCount = await pool.query('SELECT COUNT(*) FROM posts');
      if (parseInt(postsCount.rows[0].count) === 0) {
        console.log('DB: Seeding initial posts...');
        for (const post of INITIAL_POSTS) {
          await pool.query(
            'INSERT INTO posts (id, department_id, platforms, content, media_url, media_type, status, scheduled_date, created_at, published_at, metrics) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)',
            [post.id, post.departmentId, post.platforms, post.content, post.mediaUrl, post.mediaType, post.status, post.scheduledDate ? new Date(post.scheduledDate) : null, new Date(post.createdAt), post.publishedAt ? new Date(post.publishedAt) : null, post.metrics ? JSON.stringify(post.metrics) : null]
          );
        }
      }

      const galleryCount = await pool.query('SELECT COUNT(*) FROM gallery_presets');
      if (parseInt(galleryCount.rows[0].count) === 0) {
        console.log('DB: Seeding default gallery presets...');
        for (const p of DEFAULT_GALLERY) {
          await pool.query(
            'INSERT INTO gallery_presets (id, url, label) VALUES ($1, $2, $3)',
            [p.id, p.url, p.label]
          );
        }
      }
      console.log('DB: PostgreSQL initialization complete.');
    } catch (err) {
      console.error('DB Init Error:', err);
    }
  } else {
    // Local Files Init
    if (!fs.existsSync(USERS_FILE)) {
      fs.writeFileSync(USERS_FILE, JSON.stringify(DEFAULT_USERS, null, 2));
      console.log('DB: Created local db_users.json');
    }
    if (!fs.existsSync(ACCOUNTS_FILE)) {
      fs.writeFileSync(ACCOUNTS_FILE, JSON.stringify(SOCIAL_ACCOUNTS, null, 2));
      console.log('DB: Created local db_accounts.json');
    }
    if (!fs.existsSync(POSTS_FILE)) {
      fs.writeFileSync(POSTS_FILE, JSON.stringify(INITIAL_POSTS, null, 2));
      console.log('DB: Created local db_posts.json');
    } else {
      // Clean up old mock posts from local file if they exist
      try {
        let posts = JSON.parse(fs.readFileSync(POSTS_FILE, 'utf8'));
        const originalLength = posts.length;
        posts = posts.filter(p => !p.id.startsWith('post-nam-') && !p.id.startsWith('post-gym-') && !p.id.startsWith('post-cyc-') && !p.id.startsWith('post-hot-') && !p.id.startsWith('post-kin-') && !p.id.startsWith('post-pit-'));
        if (posts.length !== originalLength) {
          fs.writeFileSync(POSTS_FILE, JSON.stringify(posts, null, 2));
          console.log(`DB: Cleared ${originalLength - posts.length} mockup posts from local file.`);
        }
      } catch (e) {}
    }
    if (!fs.existsSync(GALLERY_FILE)) {
      fs.writeFileSync(GALLERY_FILE, JSON.stringify(DEFAULT_GALLERY, null, 2));
      console.log('DB: Created local db_gallery.json');
    }
  }
}

// --- USER OPERATIONS ---

export async function getUsers() {
  if (isPostgres) {
    const res = await pool.query('SELECT id, username, role, allowed_depts FROM users ORDER BY id ASC');
    return res.rows.map(row => ({
      username: row.username,
      role: row.role,
      allowedDepts: row.allowed_depts
    }));
  } else {
    const users = JSON.parse(fs.readFileSync(USERS_FILE, 'utf8'));
    return users.map(u => ({ username: u.username, role: u.role, allowedDepts: u.allowedDepts }));
  }
}

export async function getUserWithPassword(username) {
  if (isPostgres) {
    const res = await pool.query('SELECT username, password_hash, role, allowed_depts FROM users WHERE username = $1', [username]);
    if (res.rows.length === 0) return null;
    const row = res.rows[0];
    return {
      username: row.username,
      password_hash: row.password_hash,
      role: row.role,
      allowedDepts: row.allowed_depts
    };
  } else {
    const users = JSON.parse(fs.readFileSync(USERS_FILE, 'utf8'));
    return users.find(u => u.username === username) || null;
  }
}

export async function saveUser(user) {
  if (isPostgres) {
    await pool.query(
      'INSERT INTO users (username, password_hash, role, allowed_depts) VALUES ($1, $2, $3, $4)',
      [user.username, user.password_hash, user.role, user.allowedDepts]
    );
  } else {
    const users = JSON.parse(fs.readFileSync(USERS_FILE, 'utf8'));
    users.push(user);
    fs.writeFileSync(USERS_FILE, JSON.stringify(users, null, 2));
  }
}

export async function deleteUser(username) {
  if (isPostgres) {
    await pool.query('DELETE FROM users WHERE username = $1', [username]);
  } else {
    let users = JSON.parse(fs.readFileSync(USERS_FILE, 'utf8'));
    users = users.filter(u => u.username !== username);
    fs.writeFileSync(USERS_FILE, JSON.stringify(users, null, 2));
  }
}

// --- SOCIAL ACCOUNTS OPERATIONS ---

export async function getAccounts(departmentId = null) {
  if (isPostgres) {
    let query = 'SELECT id, department_id, platform, name, handle, avatar, connected FROM social_accounts';
    const params = [];
    if (departmentId) {
      query += ' WHERE department_id = $1';
      params.push(departmentId);
    }
    const res = await pool.query(query, params);
    return res.rows.map(row => ({
      id: row.id,
      departmentId: row.department_id,
      platform: row.platform,
      name: row.name,
      handle: row.handle,
      avatar: row.avatar,
      connected: row.connected
    }));
  } else {
    const accounts = JSON.parse(fs.readFileSync(ACCOUNTS_FILE, 'utf8'));
    if (departmentId) {
      return accounts.filter(a => a.departmentId === departmentId);
    }
    return accounts;
  }
}

export async function updateAccountConnection(id, connected, accessToken = null, name = null, handle = null) {
  if (isPostgres) {
    let query = 'UPDATE social_accounts SET connected = $1, access_token = $2, updated_at = CURRENT_TIMESTAMP';
    const params = [connected, accessToken];
    let index = 3;
    
    if (name) {
      query += `, name = $${index}`;
      params.push(name);
      index++;
    }
    if (handle) {
      query += `, handle = $${index}`;
      params.push(handle);
      index++;
    }
    
    query += ` WHERE id = $${index}`;
    params.push(id);
    
    await pool.query(query, params);
  } else {
    const accounts = JSON.parse(fs.readFileSync(ACCOUNTS_FILE, 'utf8'));
    const index = accounts.findIndex(a => a.id === id);
    if (index > -1) {
      accounts[index].connected = connected;
      accounts[index].accessToken = accessToken;
      if (name) accounts[index].name = name;
      if (handle) accounts[index].handle = handle;
      fs.writeFileSync(ACCOUNTS_FILE, JSON.stringify(accounts, null, 2));
    }
  }
}

// --- POST OPERATIONS ---

export async function getPosts(departmentId, status = 'all') {
  if (isPostgres) {
    let query = 'SELECT id, department_id, platforms, content, media_url, media_type, status, scheduled_date, created_at, published_at, metrics, error_details FROM posts WHERE department_id = $1';
    const params = [departmentId];
    
    if (status !== 'all') {
      query += ' AND status = $2';
      params.push(status);
    }
    
    const res = await pool.query(query, params);
    return res.rows.map(row => ({
      id: row.id,
      departmentId: row.department_id,
      platforms: row.platforms,
      content: row.content,
      mediaUrl: row.media_url,
      mediaType: row.media_type,
      status: row.status,
      scheduledDate: row.scheduled_date ? row.scheduled_date.toISOString() : null,
      createdAt: row.created_at.toISOString(),
      publishedAt: row.published_at ? row.published_at.toISOString() : null,
      metrics: row.metrics,
      errorDetails: row.error_details
    }));
  } else {
    const posts = JSON.parse(fs.readFileSync(POSTS_FILE, 'utf8'));
    let filtered = posts.filter(p => p.departmentId === departmentId);
    if (status !== 'all') {
      filtered = filtered.filter(p => p.status === status);
    }
    return filtered;
  }
}

export async function getPost(id) {
  if (isPostgres) {
    const res = await pool.query('SELECT id, department_id, platforms, content, media_url, media_type, status, scheduled_date, created_at, published_at, metrics, error_details FROM posts WHERE id = $1', [id]);
    if (res.rows.length === 0) return null;
    const row = res.rows[0];
    return {
      id: row.id,
      departmentId: row.department_id,
      platforms: row.platforms,
      content: row.content,
      mediaUrl: row.media_url,
      mediaType: row.media_type,
      status: row.status,
      scheduledDate: row.scheduled_date ? row.scheduled_date.toISOString() : null,
      createdAt: row.created_at.toISOString(),
      publishedAt: row.published_at ? row.published_at.toISOString() : null,
      metrics: row.metrics,
      errorDetails: row.error_details
    };
  } else {
    const posts = JSON.parse(fs.readFileSync(POSTS_FILE, 'utf8'));
    return posts.find(p => p.id === id) || null;
  }
}

export async function savePost(post) {
  if (isPostgres) {
    await pool.query(
      'INSERT INTO posts (id, department_id, platforms, content, media_url, media_type, status, scheduled_date, created_at, published_at, metrics) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)',
      [post.id, post.departmentId, post.platforms, post.content, post.mediaUrl, post.mediaType, post.status, post.scheduledDate ? new Date(post.scheduledDate) : null, new Date(post.createdAt), post.publishedAt ? new Date(post.publishedAt) : null, post.metrics ? JSON.stringify(post.metrics) : null]
    );
  } else {
    const posts = JSON.parse(fs.readFileSync(POSTS_FILE, 'utf8'));
    posts.push(post);
    fs.writeFileSync(POSTS_FILE, JSON.stringify(posts, null, 2));
  }
}

export async function updatePost(id, updates) {
  if (isPostgres) {
    const keys = Object.keys(updates);
    const setClause = keys.map((key, i) => {
      // Map JS camelCase to SQL snake_case
      const sqlKey = key.replace(/([A-Z])/g, "_$1").toLowerCase();
      return `${sqlKey} = $${i + 2}`;
    }).join(', ');
    
    const params = [id, ...keys.map(key => {
      // Handle Date conversions
      if (key === 'scheduledDate' || key === 'publishedAt' || key === 'createdAt') {
        return updates[key] ? new Date(updates[key]) : null;
      }
      return updates[key];
    })];

    await pool.query(
      `UPDATE posts SET ${setClause} WHERE id = $1`,
      params
    );
  } else {
    const posts = JSON.parse(fs.readFileSync(POSTS_FILE, 'utf8'));
    const index = posts.findIndex(p => p.id === id);
    if (index > -1) {
      posts[index] = { ...posts[index], ...updates };
      fs.writeFileSync(POSTS_FILE, JSON.stringify(posts, null, 2));
    }
  }
}

export async function deletePost(id) {
  if (isPostgres) {
    await pool.query('DELETE FROM posts WHERE id = $1', [id]);
  } else {
    let posts = JSON.parse(fs.readFileSync(POSTS_FILE, 'utf8'));
    posts = posts.filter(p => p.id !== id);
    fs.writeFileSync(POSTS_FILE, JSON.stringify(posts, null, 2));
  }
}

// Fetch posts that are scheduled and due to be published
export async function getDueScheduledPosts() {
  const now = new Date();
  if (isPostgres) {
    const res = await pool.query(
      "SELECT id, department_id, platforms, content, media_url, media_type, status, scheduled_date FROM posts WHERE status = 'scheduled' AND scheduled_date <= $1",
      [now]
    );
    return res.rows.map(row => ({
      id: row.id,
      departmentId: row.department_id,
      platforms: row.platforms,
      content: row.content,
      mediaUrl: row.media_url,
      mediaType: row.media_type,
      status: row.status,
      scheduledDate: row.scheduled_date ? row.scheduled_date.toISOString() : null
    }));
  } else {
    const posts = JSON.parse(fs.readFileSync(POSTS_FILE, 'utf8'));
    return posts.filter(p => p.status === 'scheduled' && p.scheduledDate && new Date(p.scheduledDate) <= now);
  }
}

export async function getAccountTokensForDept(deptId) {
  if (isPostgres) {
    const res = await pool.query('SELECT platform, access_token, name, handle FROM social_accounts WHERE department_id = $1 AND connected = true', [deptId]);
    return res.rows.map(row => ({
      platform: row.platform,
      accessToken: row.access_token,
      name: row.name,
      handle: row.handle
    }));
  } else {
    const accounts = JSON.parse(fs.readFileSync(ACCOUNTS_FILE, 'utf8'));
    return accounts
      .filter(a => a.departmentId === deptId && a.connected)
      .map(a => ({
        platform: a.platform,
        accessToken: a.accessToken || a.access_token,
        name: a.name,
        handle: a.handle
      }));
  }
}

// --- GALLERY OPERATIONS ---
export async function getGalleryPresets() {
  if (isPostgres) {
    const res = await pool.query('SELECT id, url, label FROM gallery_presets ORDER BY created_at ASC');
    return res.rows;
  } else {
    if (!fs.existsSync(GALLERY_FILE)) {
      fs.writeFileSync(GALLERY_FILE, JSON.stringify(DEFAULT_GALLERY, null, 2));
    }
    return JSON.parse(fs.readFileSync(GALLERY_FILE, 'utf8'));
  }
}

export async function addGalleryPreset(url, label) {
  const id = `preset-${Date.now()}`;
  if (isPostgres) {
    await pool.query(
      'INSERT INTO gallery_presets (id, url, label) VALUES ($1, $2, $3)',
      [id, url, label]
    );
  } else {
    const gallery = JSON.parse(fs.readFileSync(GALLERY_FILE, 'utf8'));
    gallery.push({ id, url, label });
    fs.writeFileSync(GALLERY_FILE, JSON.stringify(gallery, null, 2));
  }
  return { id, url, label };
}

export async function deleteGalleryPreset(id) {
  if (isPostgres) {
    await pool.query('DELETE FROM gallery_presets WHERE id = $1', [id]);
  } else {
    let gallery = JSON.parse(fs.readFileSync(GALLERY_FILE, 'utf8'));
    gallery = gallery.filter(g => g.id !== id);
    fs.writeFileSync(GALLERY_FILE, JSON.stringify(gallery, null, 2));
  }
  return { success: true };
}
