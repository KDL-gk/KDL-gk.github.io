const http = require('http');
const fs = require('fs');
const path = require('path');

const PORT = 3000;
const PUBLIC_DIR = path.join(__dirname, 'public');
const DATA_DIR = path.join(__dirname, 'data');

if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR);

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.png': 'image/png', '.jpg': 'image/jpeg', '.gif': 'image/gif',
  '.svg': 'image/svg+xml', '.ico': 'image/x-icon'
};

function readJSON(file, fallback) {
  try { return JSON.parse(fs.readFileSync(path.join(DATA_DIR, file), 'utf-8')); }
  catch { return fallback; }
}
function writeJSON(file, data) {
  fs.writeFileSync(path.join(DATA_DIR, file), JSON.stringify(data, null, 2), 'utf-8');
}

function initData() {
  if (!fs.existsSync(path.join(DATA_DIR, 'users.json'))) {
    writeJSON('users.json', [{ username: 'admin', password: 'admin123', name: '管理员', role: 'admin' }]);
  }
  if (!fs.existsSync(path.join(DATA_DIR, 'projects.json'))) {
    writeJSON('projects.json', []);
  }
}
initData();

function parseBody(req) {
  return new Promise((resolve) => {
    let body = '';
    req.on('data', c => body += c);
    req.on('end', () => { try { resolve(JSON.parse(body)); } catch { resolve({}); } });
  });
}

function json(res, data, status = 200) {
  res.writeHead(status, { 'Content-Type': 'application/json; charset=utf-8', 'Access-Control-Allow-Origin': '*' });
  res.end(JSON.stringify(data));
}

function cors(res) {
  res.writeHead(204, {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET,POST,PUT,DELETE,OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type,Authorization'
  });
  res.end();
}

const server = http.createServer(async (req, res) => {
  if (req.method === 'OPTIONS') return cors(res);

  const url = new URL(req.url, `http://${req.headers.host}`);
  const p = url.pathname;

  // API routes
  if (p.startsWith('/api/')) {
    res.setHeader('Access-Control-Allow-Origin', '*');

    if (p === '/api/ping') return json(res, { ok: true });

    if (p === '/api/login' && req.method === 'POST') {
      const { username, password } = await parseBody(req);
      const users = readJSON('users.json', []);
      const user = users.find(u => u.username === username && u.password === password);
      if (!user) return json(res, { error: '用户名或密码错误' }, 401);
      return json(res, { username: user.username, name: user.name, role: user.role });
    }

    if (p === '/api/register' && req.method === 'POST') {
      const { username, name, password } = await parseBody(req);
      if (!username || !name || !password) return json(res, { error: '请填写所有字段' }, 400);
      if (username.length < 3) return json(res, { error: '用户名至少3个字符' }, 400);
      if (password.length < 6) return json(res, { error: '密码至少6位' }, 400);
      const users = readJSON('users.json', []);
      if (users.find(u => u.username === username)) return json(res, { error: '用户名已存在' }, 400);
      users.push({ username, password, name, role: 'user' });
      writeJSON('users.json', users);
      return json(res, { ok: true });
    }

    if (p === '/api/users' && req.method === 'GET') {
      return json(res, readJSON('users.json', []));
    }

    if (p === '/api/users' && req.method === 'POST') {
      const body = await parseBody(req);
      if (body.batch) {
        const users = readJSON('users.json', []);
        let added = 0;
        body.batch.forEach(u => {
          if (!u.username || u.username.length < 3) return;
          if (users.find(e => e.username === u.username)) return;
          users.push({ username: u.username, password: u.password || '123456', name: u.name || u.username, role: u.role || 'user' });
          added++;
        });
        writeJSON('users.json', users);
        return json(res, { added });
      }
      const { username, name, password, role } = body;
      if (!username || !name) return json(res, { error: '请填写用户名和姓名' }, 400);
      const users = readJSON('users.json', []);
      if (users.find(u => u.username === username)) return json(res, { error: '用户名已存在' }, 400);
      users.push({ username, password: password || '123456', name, role: role || 'user' });
      writeJSON('users.json', users);
      return json(res, { ok: true });
    }

    const userMatch = p.match(/^\/api\/users\/(.+)$/);
    if (userMatch) {
      const target = decodeURIComponent(userMatch[1]);
      const users = readJSON('users.json', []);
      if (req.method === 'PUT') {
        const body = await parseBody(req);
        const user = users.find(u => u.username === target);
        if (!user) return json(res, { error: '用户不存在' }, 404);
        if (body.role) user.role = body.role;
        if (body.password) user.password = body.password;
        writeJSON('users.json', users);
        return json(res, { ok: true });
      }
      if (req.method === 'DELETE') {
        const filtered = users.filter(u => u.username !== target);
        writeJSON('users.json', filtered);
        return json(res, { ok: true });
      }
    }

    if (p === '/api/projects' && req.method === 'GET') {
      return json(res, readJSON('projects.json', []));
    }

    if (p === '/api/projects' && req.method === 'POST') {
      const body = await parseBody(req);
      const projects = readJSON('projects.json', []);
      const project = {
        id: Date.now().toString(36) + Math.random().toString(36).slice(2, 6),
        ...body,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };
      projects.unshift(project);
      writeJSON('projects.json', projects);
      return json(res, project);
    }

    const projMatch = p.match(/^\/api\/projects\/(.+)$/);
    if (projMatch && req.method === 'DELETE') {
      const id = projMatch[1];
      const projects = readJSON('projects.json', []).filter(p => p.id !== id);
      writeJSON('projects.json', projects);
      const surveyFile = path.join(DATA_DIR, `survey_${id}.json`);
      if (fs.existsSync(surveyFile)) fs.unlinkSync(surveyFile);
      return json(res, { ok: true });
    }

    const surveyMatch = p.match(/^\/api\/survey\/(.+)$/);
    if (surveyMatch) {
      const id = surveyMatch[1];
      if (req.method === 'GET') {
        return json(res, readJSON(`survey_${id}.json`, {}));
      }
      if (req.method === 'POST') {
        const data = await parseBody(req);
        writeJSON(`survey_${id}.json`, data);
        const projects = readJSON('projects.json', []);
        const idx = projects.findIndex(p => p.id === id);
        if (idx >= 0) { projects[idx].updatedAt = new Date().toISOString(); writeJSON('projects.json', projects); }
        return json(res, { ok: true });
      }
    }

    return json(res, { error: 'Not found' }, 404);
  }

  // Static files
  let filePath = path.join(PUBLIC_DIR, p === '/' ? '/index.html' : p);
  const ext = path.extname(filePath);
  fs.readFile(filePath, (err, data) => {
    if (err) { res.writeHead(404, { 'Content-Type': 'text/html; charset=utf-8' }); res.end('<h1>404</h1>'); return; }
    res.writeHead(200, { 'Content-Type': MIME[ext] || 'application/octet-stream' });
    res.end(data);
  });
});

server.listen(PORT, '0.0.0.0', () => {
  const os = require('os');
  const nets = os.networkInterfaces();
  console.log('========================================');
  console.log('  安防工勘表系统已启动！');
  console.log('========================================');
  console.log(`  本机访问: http://localhost:${PORT}`);
  for (const name of Object.keys(nets)) {
    for (const net of nets[name]) {
      if (net.family === 'IPv4' && !net.internal) console.log(`  局域网访问: http://${net.address}:${PORT}`);
    }
  }
  console.log('========================================');
  console.log('  默认账号: admin / admin123');
  console.log('  数据目录: ' + DATA_DIR);
  console.log('  按 Ctrl+C 停止服务');
  console.log('========================================');
});
