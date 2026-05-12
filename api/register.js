const crypto = require('crypto');
const fs = require('fs');

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

module.exports = (req, res) => {
  res.setHeader('Content-Type', 'application/json');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ success: false, message: '方法不允许' });

  const { username, password, name } = req.body || {};
  if (!username || !password || !name) return res.json({ success: false, message: '请填写所有字段' });
  if (username.length < 3) return res.json({ success: false, message: '用户名至少3个字符' });
  if (password.length < 6) return res.json({ success: false, message: '密码至少6个字符' });

  const db = loadUsers();
  if (db.users.find(u => u.username === username)) {
    return res.json({ success: false, message: '用户名已存在' });
  }

  db.users.push({
    username,
    password: hashPassword(password),
    name,
    role: 'user',
    createdAt: new Date().toISOString()
  });
  saveUsers(db);

  res.json({ success: true, message: '注册成功' });
};
