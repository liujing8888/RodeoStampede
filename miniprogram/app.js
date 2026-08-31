// app.js —— 初始化微信云开发，并提供一次拉取全量数据的缓存
App({
  globalData: {
    // 改成你在「云开发控制台 → 设置 → 环境」看到的环境 ID
    env: 'YOUR_ENV_ID',
    _init: null
  },

  onLaunch() {
    if (!wx.cloud) {
      console.error('当前基础库不支持云开发，请使用 2.2.3 以上版本');
      return;
    }
    wx.cloud.init({
      env: this.globalData.env,
      traceUser: true
    });
  },

  // 全量数据（分类树 + 设置 + 图片 fileID 映射）只拉一次，后续页面复用
  async init() {
    if (this.globalData._init) return this.globalData._init;
    wx.showLoading({ title: '加载中', mask: true });
    try {
      const res = await wx.cloud.callFunction({ name: 'getInit' });
      this.globalData._init = res.result || {};
    } catch (e) {
      console.error('getInit 失败', e);
      this.globalData._init = { taxonomy: [], settings: {}, images: {} };
    }
    wx.hideLoading();
    return this.globalData._init;
  }
});
