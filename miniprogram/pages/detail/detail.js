const app = getApp();
Page({
  data: { sp: null, img: '', variants: [] },
  async onLoad(q) {
    const d = await app.init();
    const tax = d.taxonomy || [];
    let sp = null;
    tax.forEach(c => (c.subs || []).forEach(s => (s.species || []).forEach(x => {
      if (x.id === q.sp) sp = x;
    })));
    if (!sp) { wx.showToast({ title: '未找到', icon: 'none' }); return; }
    this.setData({
      sp,
      img: (d.images || {})['sp:' + q.sp] || '',
      variants: sp.variants || []
    });
    wx.setNavigationBarTitle({ title: sp.name });
  }
});
