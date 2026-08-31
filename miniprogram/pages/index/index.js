const app = getApp();
Page({
  data: {
    settings: {},
    banner: '',
    posters: [],
    cats: []
  },
  async onShow() {
    const d = await app.init();
    const imgs = d.images || {};
    this.setData({
      settings: d.settings || {},
      banner: imgs['brand:banner'] || '',
      posters: ['poster:0', 'poster:1', 'poster:2'].map(s => imgs[s]).filter(Boolean),
      cats: d.taxonomy || []
    });
  },
  goCodex() { wx.switchTab({ url: '/pages/codex/codex' }); },
  goCheckin() { wx.switchTab({ url: '/pages/checkin/checkin' }); }
});
