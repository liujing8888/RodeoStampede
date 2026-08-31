const app = getApp();
Page({
  data: {
    adminPw: '',
    slot: '',
    status: '',
    presets: ['brand:banner', 'brand:icon', 'brand:logo', 'poster:0', 'poster:1', 'poster:2']
  },
  onPw(e) { this.setData({ adminPw: e.detail.value }); },
  onSlot(e) { this.setData({ slot: e.detail.value }); },
  fillPreset(e) { this.setData({ slot: e.currentTarget.dataset.s }); },
  async choose() {
    if (!this.data.adminPw) { this.setData({ status: '请先填管理员密码' }); return; }
    if (!this.data.slot) { this.setData({ status: '请填写 slot（如 brand:banner）' }); return; }

    let chooseRes;
    try {
      chooseRes = await wx.chooseImage({ count: 1, sizeType: ['original'] });
    } catch (e) { return; }

    const filePath = chooseRes.tempFilePaths[0];
    wx.showLoading({ title: '上传中' });
    try {
      const up = await wx.cloud.uploadFile({
        cloudPath: 'img/' + this.data.slot,
        filePath
      });
      const save = await wx.cloud.callFunction({
        name: 'saveImage',
        data: { adminPw: this.data.adminPw, slot: this.data.slot, fileID: up.fileID }
      });
      this.setData({ status: save.result.ok ? '已保存到云端 ✅' : ('失败：' + (save.result.err || '未知')) });
    } catch (e) {
      this.setData({ status: '上传出错：' + e.errMsg });
    }
    wx.hideLoading();
  }
});
