const api = require('../../utils/api');

Page({
  data: {
    projectId: '',
    currentTab: 0,
    tabs: [
      { icon: '🏫', name: '学校总览' }, { icon: '👣', name: '人员轨迹' },
      { icon: '🚨', name: '事件预警' }, { icon: '🚪', name: '出入口' },
      { icon: '🏠', name: '宿管' }, { icon: '➕', name: '监控增加' },
      { icon: '🔥', name: '实施费用' }
    ],
    form: { projectName: '', surveyor: '', totalPeople: '', staffCount: '', studentCount: '', boarderCount: '', classCount: '', mainGate: '', notes: '' },
    trackList: [], alarmList: [], entranceList: [], dormList: [], monitorList: [], costList: [],
    costGrandTotal: 0, costLaborTotal: 0,
    locationOptions: ['教学楼走廊', '操场', '校门口', '食堂', '图书馆', '实验楼', '行政楼', '停车场', '围墙', '其他'],
    alarmLocationOptions: ['围墙东侧', '围墙西侧', '围墙南侧', '围墙北侧', '操场', '校门口', '教学楼', '宿舍楼', '食堂', '其他'],
    priorityOptions: ['P0', 'P1', 'P2'],
    camTypeOptions: ['枪机', '球机', '半球', '全景'],
    focalOptions: ['6MM', '4MM', '2.8MM', '8MM', '12MM'],
    scheme1Options: ['利旧-调整角度', '利旧-更换镜头', '利旧-原位保留', '利旧-移机', '新增'],
    gateOptions: ['北门', '南门', '东门', '西门', '侧门', '后门'],
    authOptions: ['人脸', '刷卡', '人脸+刷卡', '二维码'],
    lightOptions: ['充足', '不足', '无灯光']
  },

  onLoad(options) {
    if (!options.id) { wx.navigateBack(); return; }
    this.setData({ projectId: options.id });
    this.loadData(options.id);
  },

  loadData(id) {
    api.loadSurvey(id).then(data => {
      if (data && Object.keys(data).length) {
        const s = {};
        if (data.form) s.form = data.form;
        if (data.trackList) s.trackList = data.trackList;
        if (data.alarmList) s.alarmList = data.alarmList;
        if (data.entranceList) s.entranceList = data.entranceList;
        if (data.dormList) s.dormList = data.dormList;
        if (data.monitorList) s.monitorList = data.monitorList;
        if (data.costList) { s.costList = data.costList; this.calcCostTotals(data.costList, s); }
        this.setData(s);
      }
    }).catch(() => {});
  },

  switchTab(e) { this.setData({ currentTab: e.currentTarget.dataset.idx }); },

  onInput(e) {
    const field = e.currentTarget.dataset.field;
    this.setData({ ['form.' + field]: e.detail.value });
  },

  onListInput(e) {
    const { idx, list, field } = e.currentTarget.dataset;
    const key = list + '[' + idx + '].' + field;
    this.setData({ [key]: e.detail.value });
    if (list === 'costList' && (field === 'qty' || field === 'price' || field === 'labor')) {
      this.updateCostRow(idx);
    }
  },

  onPickerChange(e) {
    const { idx, list, field } = e.currentTarget.dataset;
    const options = this.getOptionsForField(field);
    const val = options[e.detail.value];
    this.setData({ [list + '[' + idx + '].' + field]: val, [list + '[' + idx + '].' + field + 'Idx']: e.detail.value });
  },

  getOptionsForField(field) {
    const map = { location: this.data.locationOptions, priority: this.data.priorityOptions, camType: this.data.camTypeOptions, focal: this.data.focalOptions, scheme1: this.data.scheme1Options, gate: this.data.gateOptions, auth: this.data.authOptions, light: this.data.lightOptions };
    if (map[field]) return map[field];
    return this.data.alarmLocationOptions;
  },

  removeItem(e) {
    const { idx, list } = e.currentTarget.dataset;
    const arr = this.data[list].slice();
    arr.splice(idx, 1);
    const s = { [list]: arr };
    if (list === 'costList') this.calcCostTotals(arr, s);
    this.setData(s);
  },

  addTrack() { const l = this.data.trackList.slice(); l.push({ location: '', priority: 'P0', camType: '枪机', focal: '6MM', scheme1: '', note: '' }); this.setData({ trackList: l }); },
  addAlarm() { const l = this.data.alarmList.slice(); l.push({ location: '', installPos: '', priority: 'P0', camType: '枪机', note: '' }); this.setData({ alarmList: l }); },
  addEntrance() { const l = this.data.entranceList.slice(); l.push({ gate: '北门', facePanel: '', width: '', channels: '', auth: '人脸', power: '' }); this.setData({ entranceList: l }); },
  addDorm() { const l = this.data.dormList.slice(); l.push({ exits: '', offices: '', channelWidth: '', camCount: '', light: '' }); this.setData({ dormList: l }); },
  addMonitor() { const l = this.data.monitorList.slice(); l.push({ position: '', camType: '枪机', count: '', usage: '' }); this.setData({ monitorList: l }); },
  addCost() {
    const l = this.data.costList.slice();
    l.push({ name: '', qty: 0, price: 0, labor: 0, remark: '', subtotal: 0, laborTotal: 0 });
    this.setData({ costList: l });
  },

  updateCostRow(idx) {
    const item = this.data.costList[idx];
    const qty = Number(item.qty) || 0;
    const price = Number(item.price) || 0;
    const labor = Number(item.labor) || 0;
    const s = {};
    s['costList[' + idx + '].subtotal'] = qty * price;
    s['costList[' + idx + '].laborTotal'] = qty * labor;
    this.setData(s);
    setTimeout(() => { this.calcCostTotals(this.data.costList); }, 50);
  },

  calcCostTotals(list, target) {
    let gt = 0, lt = 0;
    (list || []).forEach(item => { gt += (Number(item.qty) || 0) * (Number(item.price) || 0); lt += (Number(item.qty) || 0) * (Number(item.labor) || 0); });
    const s = target || {};
    s.costGrandTotal = gt;
    s.costLaborTotal = lt;
    if (!target) this.setData(s);
  },

  collectData() {
    return {
      form: this.data.form,
      trackList: this.data.trackList,
      alarmList: this.data.alarmList,
      entranceList: this.data.entranceList,
      dormList: this.data.dormList,
      monitorList: this.data.monitorList,
      costList: this.data.costList,
      timestamp: new Date().toISOString()
    };
  },

  saveData() {
    const data = this.collectData();
    wx.showLoading({ title: '保存中...' });
    api.saveSurvey(this.data.projectId, data).then(() => {
      wx.hideLoading();
      wx.showToast({ title: '保存成功' });
    }).catch(err => {
      wx.hideLoading();
      wx.showToast({ title: '保存失败: ' + err.message, icon: 'none' });
    });
  }
});
