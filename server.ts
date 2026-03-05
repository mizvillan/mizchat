import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import { createServer as createViteServer } from 'vite';
import path from 'path';
import fs from 'fs';
import Database from 'better-sqlite3';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import cookieParser from 'cookie-parser';
import multer from 'multer';
import { v4 as uuidv4 } from 'uuid';

const app = express();
const httpServer = createServer(app);
const io = new Server(httpServer);
const PORT = Number(process.env.PORT) || 3000;
const JWT_SECRET = process.env.JWT_SECRET || 'discord-clone-secret-key-change-me';

// Database Setup
const db = new Database('discord-clone.db');
db.pragma('journal_mode = WAL');

// Initialize Tables
db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id TEXT PRIMARY KEY,
    username TEXT UNIQUE,
    display_name TEXT,
    password TEXT,
    avatar TEXT,
    bio TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    is_admin INTEGER DEFAULT 0
  );

  CREATE TABLE IF NOT EXISTS channels (
    id TEXT PRIMARY KEY,
    name TEXT UNIQUE,
    type TEXT DEFAULT 'text' -- text, voice
  );

  CREATE TABLE IF NOT EXISTS messages (
    id TEXT PRIMARY KEY,
    channel_id TEXT,
    user_id TEXT,
    content TEXT,
    type TEXT DEFAULT 'text', -- text, image, file, voice
    attachment_url TEXT,
    reply_to_id TEXT,
    is_edited INTEGER DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY(user_id) REFERENCES users(id)
  );

  CREATE TABLE IF NOT EXISTS friends (
    user_id TEXT,
    friend_id TEXT,
    status TEXT, -- pending, accepted, blocked
    PRIMARY KEY(user_id, friend_id),
    FOREIGN KEY(user_id) REFERENCES users(id),
    FOREIGN KEY(friend_id) REFERENCES users(id)
  );
  
  CREATE TABLE IF NOT EXISTS dms (
    id TEXT PRIMARY KEY,
    participants TEXT -- JSON array of user_ids
  );
`);

// Ensure only the main general channel exists
db.prepare("DELETE FROM channels WHERE lower(name) NOT IN ('general')").run();

// Seed Channels (ensure general exists and is first)
const seedChannels = ['general'];
const insertChannel = db.prepare('INSERT OR IGNORE INTO channels (id, name) VALUES (?, ?)');
seedChannels.forEach(name => insertChannel.run(uuidv4(), name));
// Normalize legacy names (e.g. mizchat) to general
db.prepare(`UPDATE channels SET name = 'general' WHERE lower(name) = 'mizchat'`).run();
const channelCount = db.prepare('SELECT count(*) as count FROM channels').get();
if (channelCount.count === 0) {
  insertChannel.run(uuidv4(), 'general');
}

// Middleware
app.use(express.json());
app.use(cookieParser());

// Auth Middleware
const authenticateToken = (req, res, next) => {
  const token = req.cookies.token;
  if (!token) return res.sendStatus(401);

  jwt.verify(token, JWT_SECRET, (err, user) => {
    if (err) return res.sendStatus(403);
    (req as any).user = user;
    next();
  });
};

// File Upload Setup
const uploadDir = path.join(process.cwd(), 'uploads');
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir);
}

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, uniqueSuffix + '-' + file.originalname);
  }
});
const upload = multer({ storage: storage });

// Serve Uploads
app.use('/uploads', express.static(uploadDir));

// API Routes

// Download Source Code
app.get('/api/source', (req, res) => {
  const files = [
    'package.json',
    'tsconfig.json',
    'vite.config.ts',
    'index.html',
    'server.ts',
    'src/main.tsx',
    'src/App.tsx',
    'src/index.css',
    'src/types.ts',
    'src/context/AuthContext.tsx',
    'src/context/SocketContext.tsx',
    'src/components/Layout.tsx',
    'src/components/Sidebar.tsx',
    'src/components/ChatArea.tsx',
    'src/components/MembersPanel.tsx',
    'src/components/ServerRail.tsx',
    'src/components/Message.tsx',
    'src/components/Modals/LoginModal.tsx',
    'src/components/Modals/ProfileModal.tsx'
  ];

  let content = 'DISCORD CLONE SOURCE CODE BUNDLE\n\n';

  files.forEach(file => {
    try {
      const filePath = path.join(process.cwd(), file);
      if (fs.existsSync(filePath)) {
        const fileContent = fs.readFileSync(filePath, 'utf8');
        content += `\n\n================================================================\n`;
        content += `FILE: ${file}\n`;
        content += `================================================================\n\n`;
        content += fileContent;
      } else {
        content += `\n\n!!! FILE NOT FOUND: ${file} !!!\n\n`;
      }
    } catch (err: any) {
      content += `\n\n!!! ERROR READING ${file}: ${err.message} !!!\n\n`;
    }
  });

  res.setHeader('Content-Type', 'text/plain');
  res.setHeader('Content-Disposition', 'attachment; filename="discord_clone_source.txt"');
  res.send(content);
});

// Register
app.post('/api/register', async (req, res) => {
  const { username, password, displayName } = req.body;
  if (!username || !password) return res.status(400).json({ error: 'Missing fields' });

  try {
    const hashedPassword = await bcrypt.hash(password, 10);
    const userId = uuidv4();
    const isAdmin = 0; // First user gets admin below
    
    // Check if first user
    const userCount = db.prepare('SELECT count(*) as count FROM users').get();
    const isFirstUser = userCount.count === 0;

    const stmt = db.prepare('INSERT INTO users (id, username, password, display_name, is_admin) VALUES (?, ?, ?, ?, ?)');
    stmt.run(userId, username, hashedPassword, displayName || username, isFirstUser || isAdmin ? 1 : 0);

    const token = jwt.sign({ id: userId, username, isAdmin: isFirstUser || isAdmin }, JWT_SECRET);
    res.cookie('token', token, { httpOnly: true, secure: process.env.NODE_ENV === 'production' });
    res.json({ id: userId, username, displayName, isAdmin: isFirstUser || isAdmin });
  } catch (err) {
    if (err.code === 'SQLITE_CONSTRAINT_UNIQUE') {
      return res.status(400).json({ error: 'Username already exists' });
    }
    res.status(500).json({ error: 'Server error' });
  }
});

// Login
app.post('/api/login', async (req, res) => {
  const { username, password } = req.body;
  const user = db.prepare('SELECT * FROM users WHERE username = ?').get(username);

  if (!user || !(await bcrypt.compare(password, user.password))) {
    return res.status(401).json({ error: 'Invalid credentials' });
  }

  const token = jwt.sign({ id: user.id, username: user.username, isAdmin: user.is_admin }, JWT_SECRET);
  res.cookie('token', token, { httpOnly: true, secure: process.env.NODE_ENV === 'production' });
  res.json({ 
    id: user.id, 
    username: user.username, 
    displayName: user.display_name, 
    avatar: user.avatar,
    bio: user.bio,
    isAdmin: user.is_admin,
    created_at: user.created_at
  });
});

// Logout
app.post('/api/logout', (req, res) => {
  res.clearCookie('token');
  res.json({ success: true });
});

// Get Me
app.get('/api/me', authenticateToken, (req, res) => {
  const user = db.prepare('SELECT id, username, display_name, avatar, bio, created_at, is_admin FROM users WHERE id = ?').get((req as any).user.id);
  if (!user) return res.sendStatus(404);
  res.json({
    id: user.id,
    username: user.username,
    displayName: user.display_name,
    avatar: user.avatar,
    bio: user.bio,
    isAdmin: user.is_admin,
    created_at: user.created_at
  });
});

// Upload
app.post('/api/upload', authenticateToken, upload.single('file'), (req, res) => {
  if (!req.file) return res.status(400).json({ error: 'No file uploaded' });
  const fileUrl = `/uploads/${req.file.filename}`;
  res.json({ url: fileUrl, filename: req.file.originalname, mimetype: req.file.mimetype });
});


// Socket.IO Logic
const connectedUsers = new Map(); // userId -> socketId

io.use((socket, next) => {
  const cookie = socket.handshake.headers.cookie;
  if (!cookie) return next(new Error('Authentication error'));
  
  // Parse cookie manually since socket.io doesn't use cookie-parser
  const token = cookie.split('; ').find(row => row.startsWith('token='))?.split('=')[1];
  
  if (!token) return next(new Error('Authentication error'));

  jwt.verify(token, JWT_SECRET, (err, decoded) => {
    if (err) return next(new Error('Authentication error'));
    (socket as any).user = decoded;
    next();
  });
});

io.on('connection', (socket) => {
  const userId = (socket as any).user.id;
  connectedUsers.set(userId, socket.id);
  
  // Broadcast presence
  io.emit('presence_global', { userId, status: 'online' });

  // Send initial data
  const channels = db.prepare(`
    SELECT * FROM channels
    ORDER BY 
      CASE WHEN lower(name) = 'general' THEN 0 ELSE 1 END,
      name COLLATE NOCASE
  `).all();
  socket.emit('channels_list', channels);

  // Helper to get user info
  const getUserInfo = (uid) => db.prepare('SELECT id, username, display_name, avatar, bio, is_admin FROM users WHERE id = ?').get(uid);

  // Join Channel
  socket.on('join_channel', (channelId) => {
    socket.join(channelId);
    const messages = db.prepare(`
      SELECT m.*, u.username, u.display_name, u.avatar, u.is_admin 
      FROM messages m 
      JOIN users u ON m.user_id = u.id 
      WHERE m.channel_id = ? 
      ORDER BY m.created_at ASC LIMIT 50
    `).all(channelId);
    socket.emit('message_history', { channelId, messages });
  });

  // Send Message
  socket.on('send_message', (data) => {
    const { channelId, content, type, attachmentUrl, replyToId } = data;
    const messageId = uuidv4();
    
    const stmt = db.prepare('INSERT INTO messages (id, channel_id, user_id, content, type, attachment_url, reply_to_id) VALUES (?, ?, ?, ?, ?, ?, ?)');
    stmt.run(messageId, channelId, userId, content, type || 'text', attachmentUrl, replyToId);

    const message = db.prepare(`
      SELECT m.*, u.username, u.display_name, u.avatar, u.is_admin 
      FROM messages m 
      JOIN users u ON m.user_id = u.id 
      WHERE m.id = ?
    `).get(messageId);

    io.to(channelId).emit('receive_message', message);
  });

  // Edit Message
  socket.on('edit_message', ({ messageId, newContent }) => {
    const msg = db.prepare('SELECT * FROM messages WHERE id = ?').get(messageId);
    if (!msg) return;
    
    // Check permission (owner or admin)
    const user = getUserInfo(userId);
    if (msg.user_id !== userId && !user.is_admin) return;

    db.prepare('UPDATE messages SET content = ?, is_edited = 1 WHERE id = ?').run(newContent, messageId);
    
    // Broadcast update to the channel the message belongs to
    io.to(msg.channel_id).emit('message_edited', { messageId, newContent, channelId: msg.channel_id });
  });

  // Delete Message
  socket.on('delete_message', ({ messageId }) => {
    const msg = db.prepare('SELECT * FROM messages WHERE id = ?').get(messageId);
    if (!msg) return;

    const user = getUserInfo(userId);
    if (msg.user_id !== userId && !user.is_admin) return;

    db.prepare('DELETE FROM messages WHERE id = ?').run(messageId);
    io.to(msg.channel_id).emit('message_deleted', { messageId, channelId: msg.channel_id });
  });

  // Clear Channel (Admin only)
  socket.on('clear_channel', ({ channelId }) => {
    const user = getUserInfo(userId);
    if (!user.is_admin) return;

    db.prepare('DELETE FROM messages WHERE channel_id = ?').run(channelId);
    io.to(channelId).emit('channel_cleared', { channelId });
  });
  
  // Purge Voice (Admin only)
  socket.on('purge_voice', ({ channelId }) => {
    const user = getUserInfo(userId);
    if (!user.is_admin) return;

    db.prepare("DELETE FROM messages WHERE channel_id = ? AND type = 'voice'").run(channelId);
    // Just reload history for everyone in channel effectively
    io.to(channelId).emit('voice_purged', { channelId });
  });

  // Friend Requests
  socket.on('friend_request_send', ({ targetUsername }) => {
    const target = db.prepare('SELECT id FROM users WHERE username = ?').get(targetUsername);
    if (!target) return socket.emit('friend_error', 'User not found');
    if (target.id === userId) return socket.emit('friend_error', 'Cannot add yourself');

    const existing = db.prepare('SELECT * FROM friends WHERE (user_id = ? AND friend_id = ?) OR (user_id = ? AND friend_id = ?)').get(userId, target.id, target.id, userId);
    
    if (existing) {
        if (existing.status === 'accepted') return socket.emit('friend_error', 'Already friends');
        if (existing.user_id === userId) return socket.emit('friend_error', 'Request already sent');
        // If existing request from other side, accept it
        db.prepare('UPDATE friends SET status = ? WHERE user_id = ? AND friend_id = ?').run('accepted', target.id, userId);
        
        // Notify both
        io.to(connectedUsers.get(userId)).emit('friend_request_accepted', { friendId: target.id });
        if (connectedUsers.has(target.id)) {
            io.to(connectedUsers.get(target.id)).emit('friend_request_accepted', { friendId: userId });
        }
        return;
    }

    db.prepare('INSERT INTO friends (user_id, friend_id, status) VALUES (?, ?, ?)').run(userId, target.id, 'pending');
    
    if (connectedUsers.has(target.id)) {
      const sender = getUserInfo(userId);
      io.to(connectedUsers.get(target.id)).emit('friend_request_received', { from: sender });
    }
    socket.emit('friend_request_sent', { to: targetUsername });
  });

  socket.on('friend_request_accept', ({ requestId }) => {
      // requestId is actually the user_id of the sender
      db.prepare('UPDATE friends SET status = ? WHERE user_id = ? AND friend_id = ?').run('accepted', requestId, userId);
      
      const newFriend = getUserInfo(requestId);
      socket.emit('friend_request_accepted', { friend: newFriend });
      
      if (connectedUsers.has(requestId)) {
          const me = getUserInfo(userId);
          io.to(connectedUsers.get(requestId)).emit('friend_request_accepted', { friend: me });
      }
  });
  
  socket.on('friend_request_decline', ({ requestId }) => {
      db.prepare('DELETE FROM friends WHERE user_id = ? AND friend_id = ?').run(requestId, userId);
      // Notify sender? Maybe not necessary for decline
  });

  // Get Friends List
  socket.on('get_friends', () => {
      const friends = db.prepare(`
        SELECT u.id, u.username, u.display_name, u.avatar, f.status, f.user_id as requester_id
        FROM friends f
        JOIN users u ON (f.user_id = u.id OR f.friend_id = u.id)
        WHERE (f.user_id = ? OR f.friend_id = ?) AND u.id != ?
      `).all(userId, userId, userId);
      socket.emit('friends_list', friends);
  });
  
  // Get Active Users (Simple implementation: all connected users)
  socket.on('get_active_users', () => {
      const activeUserIds = Array.from(connectedUsers.keys());
      if (activeUserIds.length === 0) return socket.emit('active_users', []);
      
      const placeholders = activeUserIds.map(() => '?').join(',');
      const users = db.prepare(`SELECT id, username, display_name, avatar, bio, is_admin FROM users WHERE id IN (${placeholders})`).all(...activeUserIds);
      socket.emit('active_users', users);
  });

  // Profile Updates
  socket.on('update_profile', ({ bio, avatar }) => {
      if (bio !== undefined) db.prepare('UPDATE users SET bio = ? WHERE id = ?').run(bio, userId);
      if (avatar !== undefined) db.prepare('UPDATE users SET avatar = ? WHERE id = ?').run(avatar, userId);
      
      const updatedUser = getUserInfo(userId);
      socket.emit('profile_updated', updatedUser);
      // Broadcast to everyone? Or just let them fetch on demand? 
      // For simplicity, broadcast global presence update which might trigger re-fetch if needed, 
      // or just rely on 'active_users' polling/events.
      io.emit('user_updated', updatedUser);
  });

  socket.on('disconnect', () => {
    connectedUsers.delete(userId);
    io.emit('presence_global', { userId, status: 'offline' });
  });
});

// Start Server
async function startServer() {
  // Vite Middleware
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    // Serve static files in production
    app.use(express.static('dist'));
    app.get('*', (req, res) => {
      res.sendFile(path.join(__dirname, 'dist', 'index.html'));
    });
  }

  httpServer.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
