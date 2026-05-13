const api = require('../../utils/api');

Page({
  data: { username: '', password: '', msg: '', msgType: '', loading: false },

  onLoad() {
    const token = wx.getStorageSync('token');
    if (token) {
      wx.redirectTo({ url: '/pages/projects/index' });
    }
  },

  onUsernameInput(e) { this.setData({ username: e.detail.value }); },
  onPasswordInput(e) { this.setData({ password: e.detail.value }); },

  handleLogin() {
    const { username, password } = this.data;
    if (!username || !password) {
      this.setData({ msg: '请输入用户名和密码', msgType: 'error' });
      return;
    }
    this.setData({ loading: true, msg: '' });
    api.login(username, password).then(() => {
      this.setData({ msg: '登录成功，正在跳转...', msgType: 'success' });
      setTimeout(() => {
        wx.redirectTo({ url: '/pages/projects/index' });
      }, 600);
    }).catch(err => {
      this.setData({ msg: err.message, msgType: 'error', loading: false });
    });
  }
});
