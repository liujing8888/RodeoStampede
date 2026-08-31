const app = getApp();
Page({
  data: {
    cats: [],
    list: [],
    keyword: '',
    filtered: []
  },
  async onLoad() {
    const d = await app.init();
    const tax = d.taxonomy || [];
    const imgs = d.images || {};
    const list = [];
    tax.forEach(cat => (cat.subs || []).forEach(sub =>
      (sub.species || []).forEach(sp => list.push({
        id: sp.id, name: sp.name, cat: cat.name, sub: sub.name,
        img: imgs['sp:' + sp.id] || ''
      }))
    ));
    this.allList = list;
    this.setData({ cats: tax, list, filtered: list });
  },
  onSearch(e) {
    const kw = e.detail.value.trim();
    this.setData({
      keyword: kw,
      filtered: kw ? this.allList.filter(s => s.name.indexOf(kw) >= 0) : this.allList
    });
  },
  goDetail(e) { wx.navigateTo({ url: '/pages/detail/detail?sp=' + e.currentTarget.dataset.id }); }
});
