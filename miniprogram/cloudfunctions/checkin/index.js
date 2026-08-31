// 云函数 checkin —— “到此一游”打卡，按设备去重，首次分配序号
const cloud = require('wx-server-sdk');
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV });
const db = cloud.database();
const _ = db.command;

exports.main = async (event) => {
  const { deviceId, section } = event;
  if (!deviceId) return { ok: false, err: 'no deviceId' };

  const exist = await db.collection('checkins').where({ deviceId }).get();
  if (exist.data.length) {
    const rec = exist.data[0];
    await db.collection('checkins').doc(rec._id)
      .update({ data: { visits: _.inc(1), lastSection: section || '', lastAt: Date.now() } });
    return { ok: true, seq: rec.seq, visits: rec.visits + 1, first: false };
  }

  const count = await db.collection('checkins').count();
  const seq = count.total + 1;
  await db.collection('checkins').add({
    data: {
      deviceId, seq, visits: 1,
      firstSection: section || '', lastSection: section || '',
      firstAt: Date.now(), lastAt: Date.now()
    }
  });
  return { ok: true, seq, visits: 1, first: true };
};
