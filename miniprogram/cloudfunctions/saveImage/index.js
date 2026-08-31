// 云函数 saveImage —— 管理员上传图片后，把 slot -> fileID 写进数据库
// 鉴权：在云函数「配置 → 环境变量」里设置 ADMIN_PW，前端上传时带上
const cloud = require('wx-server-sdk');
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV });
const db = cloud.database();
const _ = db.command;

exports.main = async (event) => {
  if (event.adminPw !== process.env.ADMIN_PW) {
    return { ok: false, err: 'unauthorized' };
  }
  const { slot, fileID } = event;
  if (!slot || !fileID) return { ok: false, err: 'bad params' };

  const exist = await db.collection('images').where({ slot }).get();
  if (exist.data.length) {
    await db.collection('images').doc(exist.data[0]._id)
      .update({ data: { fileID, updatedAt: Date.now() } });
  } else {
    await db.collection('images').add({ data: { slot, fileID, createdAt: Date.now() } });
  }
  return { ok: true };
};
