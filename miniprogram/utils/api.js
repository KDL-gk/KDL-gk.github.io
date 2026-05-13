const BASE_URL = 'http://172.20.209.44:3000';

function request(url, method, data) {
  return new Promise((resolve, reject) => {
    wx.request({
      url: BASE_URL + url,
      method: method || 'GET',
      data: data,
      header: { 'Content-Type': 'application/json' },
      success(res) {
        if (res.data && res.data.error) reject(new Error(res.data.error));
        else resolve(res.data);
      },
      fail(err) { reject(new Error(err.errMsg || '网络错误')); }
    });
  });
}

function getUser() {
  return wx.getStorageSync('user') || {};
}

module.exports = {
  BASE_URL,

  login(username, password) {
    return request('/api/login', 'POST', { username, password }).then(res => {
      wx.setStorageSync('token', Date.now().toString());
      wx.setStorageSync('user', res);
      getApp().globalData.user = res;
      return res;
    });
  },

  getProjects() {
    const u = getUser();
    return request('/api/projects?username=' + encodeURIComponent(u.username || '') + '&role=' + encodeURIComponent(u.role || ''));
  },

  createProject(data) {
    const u = getUser();
    data.createdBy = u.username;
    return request('/api/projects', 'POST', data);
  },

  deleteProject(id) {
    return request('/api/projects/' + id, 'DELETE');
  },

  loadSurvey(id) {
    return request('/api/survey/' + id);
  },

  saveSurvey(id, data) {
    return request('/api/survey/' + id, 'POST', data);
  },

  getUsers() {
    return request('/api/users');
  },

  addUser(user) {
    return request('/api/users', 'POST', user);
  },

  changeUserRole(username, role) {
    return request('/api/users/' + encodeURIComponent(username), 'PUT', { role });
  },

  deleteUser(username) {
    return request('/api/users/' + encodeURIComponent(username), 'DELETE');
  },

  batchAddUsers(batch) {
    return request('/api/users', 'POST', { batch });
  }
};
