const api = require('../../utils/api');

Page({
  data: { projects: [], recentCount: 0, isAdmin: false, showNewModal: false, newSchool: '', newSurveyor: '', newPhone: '', newRemark: '' },

  onShow() {
    const user = wx.getStorageSync('user');
    if (!user) { wx.redirectTo({ url: '/pages/login/index' }); return; }
    this.setData({ isAdmin: user.role === 'admin', newSurveyor: user.name || user.username });
    this.loadProjects();
  },

  loadProjects() {
    api.getProjects().then(projects => {
      const weekAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;
      projects.forEach(p => {
        const d = new Date(p.createdAt);
        p.dateStr = d.getFullYear() + '/' + (d.getMonth() + 1) + '/' + d.getDate();
      });
      this.setData({
        projects,
        recentCount: projects.filter(p => new Date(p.createdAt).getTime() > weekAgo).length
      });
    }).catch(() => { wx.showToast({ title: '加载失败', icon: 'none' }); });
  },

  showModal() { this.setData({ showNewModal: true }); },
  hideModal() { this.setData({ showNewModal: false, newSchool: '', newPhone: '', newRemark: '' }); },
  noop() {},
  onNewSchool(e) { this.setData({ newSchool: e.detail.value }); },
  onNewPhone(e) { this.setData({ newPhone: e.detail.value }); },
  onNewRemark(e) { this.setData({ newRemark: e.detail.value }); },

  createProject() {
    const { newSchool, newSurveyor, newPhone, newRemark } = this.data;
    if (!newSchool) { wx.showToast({ title: '请填写学校名称', icon: 'none' }); return; }
    api.createProject({
      name: newSchool + '——工勘',
      school: newSchool,
      surveyor: newSurveyor,
      phone: newPhone,
      remark: newRemark
    }).then(() => {
      this.hideModal();
      this.loadProjects();
      wx.showToast({ title: '创建成功' });
    }).catch(err => { wx.showToast({ title: err.message, icon: 'none' }); });
  },

  deleteProject(e) {
    const id = e.currentTarget.dataset.id;
    wx.showModal({
      title: '确认删除', content: '删除后工勘数据也将清除，不可恢复！',
      success: res => {
        if (!res.confirm) return;
        api.deleteProject(id).then(() => {
          this.loadProjects();
          wx.showToast({ title: '已删除' });
        });
      }
    });
  },

  enterProject(e) {
    const id = e.currentTarget.dataset.id;
    wx.navigateTo({ url: '/pages/survey/index?id=' + id });
  },

  goAdmin() { wx.navigateTo({ url: '/pages/admin/index' }); },

  logout() {
    wx.removeStorageSync('token');
    wx.removeStorageSync('user');
    wx.redirectTo({ url: '/pages/login/index' });
  }
});
