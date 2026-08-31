// 云函数 getInit —— 一次性返回分类树 + 站点设置 + 图片 fileID 映射
// 小程序 <image src> 可直接使用云 fileID，无需再换临时链接
const cloud = require('wx-server-sdk');
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV });
const db = cloud.database();

exports.main = async () => {
  const tax = await db.collection('taxonomy').doc('tree').get();
  const settings = await db.collection('settings').doc('global').get();

  // 图片可能超过 1000 条，必须分页拉全
  const map = {};
  let offset = 0;
  while (true) {
    const imgs = await db.collection('images').limit(1000).skip(offset).get();
    imgs.data.forEach(i => { map[i.slot] = i.fileID; });
    if (imgs.data.length < 1000) break;
    offset += 1000;
  }

  return {
    taxonomy: (tax.data && tax.data.tree) || [],
    settings: settings.data || {},
    images: map
  };
};
