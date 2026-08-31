/**
 * 本地迁移脚本：把 F:\网站\data 下的全部内容搬到微信云开发（CloudBase）
 * 覆盖：分类树 / 站点设置 / 全部图片(923张动物 + 宣传图 + icon + 背景图) / 打卡记录
 *
 * 用法：
 *   1) cd F:\网站\miniprogram\tools
 *   2) npm install
 *   3) 复制 .env.example 为 .env 并填好三个变量
 *   4) node migrate.js
 *
 * 变量说明：
 *   SECRET_ID / SECRET_KEY  —— 腾讯云访问密钥（云开发控制台「设置→环境」可关联/获取）
 *   ENV_ID                  —— 云开发环境 ID
 */
require('dotenv').config();
const cloud = require('@cloudbase/node-sdk');
const fs = require('fs');
const path = require('path');

const ROOT = 'F:/网站/data';
const IMG_DIR = path.join(ROOT, 'img');

const app = cloud.init({
  secretId: process.env.SECRET_ID,
  secretKey: process.env.SECRET_KEY,
  env: process.env.ENV_ID
});
const db = app.database();
const storage = app.storage();

async function uploadImage(file) {
  const slot = decodeURIComponent(file);          // brand%3Abanner -> brand:banner
  const filePath = path.join(IMG_DIR, file);
  const cloudPath = 'img/' + slot;
  const up = await storage.uploadFile({ cloudPath, filePath });
  const exist = await db.collection('images').where({ slot }).get();
  if (exist.data.length) {
    await db.collection('images').doc(exist.data[0]._id).update({ data: { fileID: up.fileID } });
  } else {
    await db.collection('images').add({ data: { slot, fileID: up.fileID, createdAt: Date.now() } });
  }
}

async function main() {
  // 1) 分类树
  const tax = JSON.parse(fs.readFileSync(path.join(ROOT, 'taxonomy.json'), 'utf8'));
  await db.collection('taxonomy').doc('tree').set({ tree: tax });
  console.log('✓ taxonomy 上传完成，分类数：', tax.length);

  // 2) 站点设置
  const settings = JSON.parse(fs.readFileSync(path.join(ROOT, 'settings.json'), 'utf8'));
  await db.collection('settings').doc('global').set(settings);
  console.log('✓ settings 上传完成');

  // 3) 全部图片（一张不漏）
  const files = fs.readdirSync(IMG_DIR);
  console.log('→ 待上传图片：', files.length, '张');
  let n = 0;
  for (const f of files) {
    await uploadImage(f);
    n++;
    if (n % 50 === 0) console.log('  已上传', n, '/', files.length);
  }
  console.log('✓ 图片全部上传完成：', n, '张');

  // 4) 打卡记录（如有）
  const ckPath = path.join(ROOT, 'checkins.json');
  if (fs.existsSync(ckPath)) {
    const ck = JSON.parse(fs.readFileSync(ckPath, 'utf8'));
    const list = Array.isArray(ck) ? ck : (ck.list || []);
    for (const c of list) await db.collection('checkins').add({ data: c });
    console.log('✓ checkins 上传完成：', list.length, '条');
  }

  console.log('\n🎉 迁移全部完成！去微信开发者工具上传部署云函数即可。');
}

main().catch(e => { console.error(e); process.exit(1); });
