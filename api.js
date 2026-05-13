// api.js — 统一 API 适配层
// 服务端可用时走 fetch API（多设备同步），否则降级 localStorage
(function() {
  const API = window.API = {};
  let _online = false;
  let _ready = false;
  const _readyCallbacks = [];

  API.isOnline = () => _online;

  API.ready = function(fn) {
    if (_ready) return fn();
    _readyCallbacks.push(fn);
  };

  // Detect server
  (async function() {
    try {
      const r = await fetch('/api/ping', { signal: AbortSignal.timeout(2000) });
      if (r.ok) _online = true;
    } catch {}
    _ready = true;
    _readyCallbacks.forEach(fn => fn());
  })();

  async function post(url, body) {
    const r = await fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
    return r.json();
  }
  async function get(url) { const r = await fetch(url); return r.json(); }
  async function put(url, body) {
    const r = await fetch(url, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
    return r.json();
  }
  async function del(url) { const r = await fetch(url, { method: 'DELETE' }); return r.json(); }

  // ===== Auth =====
  API.login = async function(username, password) {
    if (_online) {
      const res = await post('/api/login', { username, password });
      if (res.error) throw new Error(res.error);
      localStorage.setItem('token', Date.now().toString());
      localStorage.setItem('user', JSON.stringify(res));
      return res;
    }
    // fallback localStorage
    const users = _getLocalUsers();
    const user = users.find(u => u.username === username && u.password === password);
    if (!user) throw new Error('用户名或密码错误');
    const info = { username: user.username, name: user.name, role: user.role };
    localStorage.setItem('token', Date.now().toString());
    localStorage.setItem('user', JSON.stringify(info));
    return info;
  };

  API.register = async function(username, name, password) {
    if (_online) {
      const res = await post('/api/register', { username, name, password });
      if (res.error) throw new Error(res.error);
      return res;
    }
    const users = _getLocalUsers();
    if (users.find(u => u.username === username)) throw new Error('用户名已存在');
    users.push({ username, password, name, role: 'user' });
    localStorage.setItem('_survey_users', JSON.stringify(users));
    return { ok: true };
  };

  // ===== Users (admin) =====
  API.getUsers = async function() {
    if (_online) return get('/api/users');
    return _getLocalUsers();
  };

  API.addUser = async function(user) {
    if (_online) {
      const res = await post('/api/users', user);
      if (res.error) throw new Error(res.error);
      return res;
    }
    const users = _getLocalUsers();
    if (users.find(u => u.username === user.username)) throw new Error('用户名已存在');
    users.push({ username: user.username, password: user.password || '123456', name: user.name, role: user.role || 'user' });
    localStorage.setItem('_survey_users', JSON.stringify(users));
    return { ok: true };
  };

  API.batchAddUsers = async function(batch) {
    if (_online) return post('/api/users', { batch });
    const users = _getLocalUsers();
    let added = 0;
    batch.forEach(u => {
      if (!u.username || u.username.length < 3) return;
      if (users.find(e => e.username === u.username)) return;
      users.push({ username: u.username, password: u.password || '123456', name: u.name || u.username, role: 'user' });
      added++;
    });
    localStorage.setItem('_survey_users', JSON.stringify(users));
    return { added };
  };

  API.changeUserRole = async function(username, role) {
    if (_online) return put('/api/users/' + encodeURIComponent(username), { role });
    const users = _getLocalUsers();
    const u = users.find(u => u.username === username);
    if (u) { u.role = role; localStorage.setItem('_survey_users', JSON.stringify(users)); }
    return { ok: true };
  };

  API.deleteUser = async function(username) {
    if (_online) return del('/api/users/' + encodeURIComponent(username));
    const users = _getLocalUsers().filter(u => u.username !== username);
    localStorage.setItem('_survey_users', JSON.stringify(users));
    return { ok: true };
  };

  // ===== Projects =====
  API.getProjects = async function() {
    if (_online) return get('/api/projects');
    return JSON.parse(localStorage.getItem('_survey_projects') || '[]');
  };

  API.createProject = async function(data) {
    if (_online) return post('/api/projects', data);
    const projects = JSON.parse(localStorage.getItem('_survey_projects') || '[]');
    const project = { id: Date.now().toString(36) + Math.random().toString(36).slice(2, 6), ...data, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() };
    projects.unshift(project);
    localStorage.setItem('_survey_projects', JSON.stringify(projects));
    return project;
  };

  API.deleteProject = async function(id) {
    if (_online) return del('/api/projects/' + id);
    const projects = JSON.parse(localStorage.getItem('_survey_projects') || '[]').filter(p => p.id !== id);
    localStorage.setItem('_survey_projects', JSON.stringify(projects));
    localStorage.removeItem('_survey_data_' + id);
    return { ok: true };
  };

  // ===== Survey data =====
  API.loadSurvey = async function(id) {
    if (_online) return get('/api/survey/' + id);
    return JSON.parse(localStorage.getItem('_survey_data_' + id) || '{}');
  };

  API.saveSurvey = async function(id, data) {
    if (_online) return post('/api/survey/' + id, data);
    localStorage.setItem('_survey_data_' + id, JSON.stringify(data));
    const projects = JSON.parse(localStorage.getItem('_survey_projects') || '[]');
    const idx = projects.findIndex(p => p.id === id);
    if (idx >= 0) { projects[idx].updatedAt = new Date().toISOString(); localStorage.setItem('_survey_projects', JSON.stringify(projects)); }
    return { ok: true };
  };

  // ===== local helpers =====
  function _getLocalUsers() {
    const data = localStorage.getItem('_survey_users');
    if (data) return JSON.parse(data);
    const defaults = [{ username: 'admin', password: 'admin123', name: '管理员', role: 'admin' }];
    localStorage.setItem('_survey_users', JSON.stringify(defaults));
    return defaults;
  }
})();
