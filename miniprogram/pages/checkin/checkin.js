const app = getApp();
Page({
  data: { seq: null, visits: 0, first: false, section: '', done: false, loading: false },
  onLoad() {
    let id = wx.getStorageSync('deviceId');
    if (!id) {
      id = 'dev_' + Math.random().toString(36).slice(2) + Date.now().toString(36);
      wx.setStorageSync('deviceId', id);
    }
    this.deviceId = id;
  },
  pickSection(e) { this.setData({ section: e.currentTarget.dataset.s }); },
  async submit() {
    if (this.data.loading) return;
    this.setData({ loading: true });
    try {
      const res = await wx.cloud.callFunction({
        name: 'checkin',
        data: { deviceId: this.deviceId, section: this.data.section }
      });
      const r = res.result || {};
      this.setData({ seq: r.seq, visits: r.visits, first: r.first, done: true });
    } catch (e) {
      wx.showToast({ title: '打卡失败', icon: 'none' });
    }
    this.setData({ loading: false });
  }
});
