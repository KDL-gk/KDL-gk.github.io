const crypto = require('crypto');
const fs = require('fs');
const path = require('path');

const DB_PATH = '/tmp/users.json';
const SECRET = process.env.JWT_SECRET || 'school-survey-secret-key-2026';

function loadUsers() {
  try {
    return JSON.parse(fs.readFileSync(DB_PATH, 'utf8'));
  } catch {
    const admin = {
      username: 'admin',
      password: hashPassword('admin123'),
      name: '管理员',
      role: 'admin',
      createdAt: new Date().toISOString()
    };
    const data = { users: [admin] };
    fs.writeFileSync(DB_PATH, JSON.stringify(data), 'utf8');
    return data;
  }
}

function saveUsers(data) {
  fs.writeFileSync(DB_PATH, JSON.stringify(data), 'utf8');
}

function hashPassword(pwd) {
  return crypto.createHash('sha256').update(pwd + SECRET).digest('hex');
}

function makeToken(user) {
  const payload = { username: user.username, name: user.name, ts: Date.now() };
  const b64 = Buffer.from(JSON.stringify(payload)).toString('base64');
  const sig = crypto.createHmac('sha256', SECRET).update(b64).digest('hex');
  return b64 + '.' + sig;
}

module.exports = (req, res) => {
  res.setHeader('Content-Type', 'application/json');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ success: false, message: '方法不允许' });

  const { username, password } = req.body || {};
  if (!username || !password) return res.json({ success: false, message: '请输入用户名和密码' });

  const db = loadUsers();
  const user = db.users.find(u => u.username === username);
  if (!user || user.password !== hashPassword(password)) {
    return res.json({ success: false, message: '用户名或密码错误' });
  }

  const token = makeToken(user);
  res.json({
    success: true,
    token,
    user: { username: user.username, name: user.name, role: user.role }
  });
};
