const api = require('../../utils/api');

Page({
  data: { users: [], adminCount: 0, userCount: 0, currentUsername: '', addUsername: '', addName: '', addPassword: '123456', roleOptions: ['管理员', '实施人员'] },

  onShow() {
    const user = wx.getStorageSync('user');
    if (!user || user.role !== 'admin') { wx.navigateBack(); return; }
    this.setData({ currentUsername: user.username });
    this.loadUsers();
  },

  loadUsers() {
    api.getUsers().then(users => {
      this.setData({
        users,
        adminCount: users.filter(u => u.role === 'admin').length,
        userCount: users.filter(u => u.role !== 'admin').length
      });
    });
  },

  changeRole(e) {
    const username = e.currentTarget.dataset.username;
    const role = e.detail.value == 0 ? 'admin' : 'user';
    api.changeUserRole(username, role).then(() => {
      wx.showToast({ title: '已更改' });
      this.loadUsers();
    });
  },

  deleteUser(e) {
    const username = e.currentTarget.dataset.username;
    wx.showModal({
      title: '确认', content: '确定删除该用户？',
      success: res => {
        if (!res.confirm) return;
        api.deleteUser(username).then(() => {
          wx.showToast({ title: '已删除' });
          this.loadUsers();
        });
      }
    });
  },

  onAddUsername(e) { this.setData({ addUsername: e.detail.value }); },
  onAddName(e) { this.setData({ addName: e.detail.value }); },
  onAddPassword(e) { this.setData({ addPassword: e.detail.value }); },

  addUser() {
    const { addUsername, addName, addPassword } = this.data;
    if (!addUsername || !addName) { wx.showToast({ title: '请填写用户名和姓名', icon: 'none' }); return; }
    api.addUser({ username: addUsername, name: addName, password: addPassword || '123456', role: 'user' }).then(() => {
      wx.showToast({ title: '添加成功' });
      this.setData({ addUsername: '', addName: '' });
      this.loadUsers();
    }).catch(err => { wx.showToast({ title: err.message, icon: 'none' }); });
  }
});
