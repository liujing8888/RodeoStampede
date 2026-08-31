/* 同步【特殊动物】分类结构 + 【帽子】207 张图到线上站点
 *
 * 为什么需要本脚本：线上 k8s 用持久卷(PVC)存数据，git push 只更新镜像、不会改写已存在的 PVC，
 * 因此 taxonomy / 图片改动必须经 /api 写入线上 PVC 才会真正生效。
 *
 * 用法（在你本机 F:\网站 目录、能访问 rodeosocial.yodo1.cn 的机器上执行）：
 *   node tools/sync_to_live.js --password <线上管理员密码>
 *   node tools/sync_to_live.js --password <密码> --host https://rodeosocial.yodo1.cn
 *   node tools/sync_to_live.js --password <密码> --dry     # 只打印计划，不上传
 */
const fs = require("fs");

const idx = k => process.argv.indexOf(k);
const BASE = idx("--host") >= 0 ? process.argv[idx("--host") + 1] : "https://rodeosocial.yodo1.cn";
const PW = idx("--password") >= 0 ? process.argv[idx("--password") + 1] : (process.env.LIVE_ADMIN_PW || "");
const DRY = process.argv.includes("--dry");

if (!PW) {
  console.error("缺少密码。用法: node tools/sync_to_live.js --password <线上管理员密码> [--host URL] [--dry]");
  process.exit(1);
}

const TAX_FILE = "data/taxonomy.json";
const HAT_CAT_FILE = "tools/hat_category.json";
const MANIFEST_FILE = "tools/hat_manifest.json";

const SPECIAL_ID = "cat_special";
const HAT_ID = "cat_hat";
const MOVE_IDS = ["cat_328mqc7r", "cat_q84665qf", "cat_miwh5t8m"]; // 传奇 / VIP / 宠物乐园

function jget(url, headers) { return fetch(url, { headers }); }

// 递归收集指定 id 的分类对象，并从树中删除它们（用于幂等重建）
function collectAndPrune(arr, ids, out) {
  for (let i = arr.length - 1; i >= 0; i--) {
    const c = arr[i];
    if (ids.includes(c.id)) { out.push(c); arr.splice(i, 1); continue; }
    if (Array.isArray(c.subs)) collectAndPrune(c.subs, ids, out);
  }
}

async function main() {
  console.log("目标站点:", BASE);

  // 1) 登录校验
  let r = await fetch(BASE + "/api/login", {
    method: "POST", headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ password: PW })
  });
  if (!r.ok) { console.error("✗ 登录失败 (密码错误?):", await r.text()); process.exit(1); }
  console.log("✓ 登录成功");

  const auth = { "X-Admin-Token": PW, "Content-Type": "application/json" };

  // 2) 读取线上 taxonomy（以线上为基准，保留线上已有编辑）
  let live = [];
  if (!DRY) {
    r = await fetch(BASE + "/api/taxonomy", { headers: { "X-Admin-Token": PW } });
    if (!r.ok) { console.error("✗ 读取线上 taxonomy 失败:", await r.text()); process.exit(1); }
    live = await r.json();
  } else {
    live = JSON.parse(fs.readFileSync(TAX_FILE, "utf8")); // dry 下用本地预览
  }

  // 3) 收集 3 个原分类的数据（可能已在 特殊动物 内），随后从树中移除旧副本
  const three = [];
  collectAndPrune(live, MOVE_IDS, three);
  // 幂等：再移除可能存在的 特殊动物 / 帽子（避免重复）
  collectAndPrune(live, [SPECIAL_ID, HAT_ID], []);

  if (three.length !== 3) {
    console.warn("⚠ 仅找到", three.length, "个原分类（期望 3）。特殊动物将只包含找到的部分。");
  }

  const special = {
    id: SPECIAL_ID, name: "特殊动物", icon: "🐾",
    subs: three.map(c => ({ ...c, subs: c.subs || [] })), species: []
  };
  const hatCat = JSON.parse(fs.readFileSync(HAT_CAT_FILE, "utf8"));
  live.push(special);
  live.push(hatCat);

  console.log("→ 将写入线上：特殊动物(子:" + special.subs.map(s => s.name).join("/") + ")，帽子(物种:" + hatCat.species.length + ")");
  console.log("→ 线上顶层分类将变为:", live.map(c => c.name).join(" / "));

  // 4) 写回 taxonomy
  if (!DRY) {
    r = await fetch(BASE + "/api/taxonomy", { method: "PUT", headers: auth, body: JSON.stringify(live) });
    if (!r.ok) { console.error("✗ taxonomy 上传失败:", await r.text()); process.exit(1); }
    console.log("✓ taxonomy 已上传");
  } else {
    console.log("(dry) 跳过 taxonomy 上传");
  }

  // 5) 上传帽子图（仅 207 张新增）
  const manifest = JSON.parse(fs.readFileSync(MANIFEST_FILE, "utf8"));
  console.log("→ 开始上传帽子图:", manifest.length, "张", DRY ? "(dry)" : "");
  let ok = 0, fail = 0;
  for (let i = 0; i < manifest.length; i++) {
    const m = manifest[i];
    if (DRY) { if ((i + 1) % 40 === 0) console.log("  (dry) 计划:", m.name, "->", m.slot); continue; }
    const buf = fs.readFileSync(m.file);
    r = await fetch(BASE + "/api/img/" + encodeURIComponent(m.slot), {
      method: "PUT", headers: { "X-Admin-Token": PW, "Content-Type": "image/png" }, body: buf
    });
    if (r.ok) ok++; else { fail++; console.error("  ✗", m.name, await r.text()); }
    if ((i + 1) % 30 === 0 || i === manifest.length - 1) console.log(`  进度 ${i + 1}/${manifest.length} (成功 ${ok})`);
  }
  console.log(DRY ? "✓ dry 完成，未实际上传" : `✓ 帽子图上传完成：成功 ${ok} / 失败 ${fail} / 共 ${manifest.length}`);
  if (!DRY && fail === 0) console.log("\n全部完成。请硬刷新站点（Ctrl+F5）查看【特殊动物】与【帽子】分类。");
}

main().catch(e => { console.error(e); process.exit(1); });
