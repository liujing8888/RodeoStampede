/* 同步【特殊动物】分类结构 + 【帽子】207 张图到线上站点
 *
 * 为什么需要本脚本：线上 k8s 用持久卷(PVC)存数据，git push 只更新镜像、不会改写已存在的 PVC，
 * 因此 taxonomy / 图片改动必须经 /api 写入线上 PVC 才会真正生效。
 *
 * 用法（在你本机 F:\网站 目录、能访问 api.rodeosocial.yodo1.cn 的机器上执行）：
 *   node tools/sync_to_live.js --password <线上管理员密码>
 *   node tools/sync_to_live.js --password <密码> --host https://api.rodeosocial.yodo1.cn
 *   node tools/sync_to_live.js --password <密码> --dry     # 只打印计划，不上传
 *
 * 注意：线上站点(rodeosocial.yodo1.cn)是静态 OSS/CDN，真正的后端 API 在独立子域名
 *       api.rodeosocial.yodo1.cn（见 js/config.js）。默认 BASE 已指向该 API 域名。
 */
const fs = require("fs");
const path = require("path");
const ROOT = path.resolve(__dirname, ".."); // 项目根目录（脚本在 tools/ 下，故向上一级）

const idx = k => process.argv.indexOf(k);
const BASE = idx("--host") >= 0 ? process.argv[idx("--host") + 1] : "https://api.rodeosocial.yodo1.cn";
const PW = idx("--password") >= 0 ? process.argv[idx("--password") + 1] : (process.env.LIVE_ADMIN_PW || "");
const DRY = process.argv.includes("--dry");

if (!PW) {
  console.error("缺少密码。用法: node tools/sync_to_live.js --password <线上管理员密码> [--host URL] [--dry]");
  process.exit(1);
}

const TAX_FILE = path.join(ROOT, "data/taxonomy.json");
const HAT_CAT_FILE = path.join(ROOT, "tools/hat_category.json");
const MANIFEST_FILE = path.join(ROOT, "tools/hat_manifest.json");
const CONC = 8; // 并发上传数：兼顾速度与线上 LB 稳定性；若频繁 ECONNRESET 可降到 4

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

  // 5) 上传帽子图（并发上传 + 本地进度文件断点续传 + 重试，单张失败不影响整体）
  //    注意：线上 server 对 HEAD 返回 405，无法用 HEAD 探测是否已传，故改用本地 tools/.hat_done.json 记录已成功 slot。
  const manifest = JSON.parse(fs.readFileSync(MANIFEST_FILE, "utf8"));
  const total = manifest.length;
  console.log("→ 准备上传帽子图:", total, "张", DRY ? "(dry)" : `(并发 ${CONC})`);
  const sleep = ms => new Promise(res => setTimeout(res, ms));
  const authHdr = { "X-Admin-Token": PW, "Content-Type": "image/png" };
  const DONE_FILE = path.join(ROOT, "tools", ".hat_done.json");
  let doneSet = new Set();
  try { doneSet = new Set(JSON.parse(fs.readFileSync(DONE_FILE, "utf8"))); } catch (_) {}

  let ok = 0, skip = 0, fail = 0, planned = 0;
  const failed = [];
  for (let i = 0; i < total; i += CONC) {
    const batch = manifest.slice(i, i + CONC);
    const res = await Promise.all(batch.map(async (m) => {
      if (DRY) return { m, kind: "planned" };
      if (doneSet.has(m.slot)) return { m, kind: "skip" };
      const url = BASE + "/api/img/" + encodeURIComponent(m.slot);
      const buf = fs.readFileSync(path.join(ROOT, m.file));
      let uploaded = false;
      for (let attempt = 1; attempt <= 5 && !uploaded; attempt++) {
        try {
          const resp = await fetch(url, { method: "PUT", headers: authHdr, body: buf, signal: AbortSignal.timeout(30000) });
          if (resp.ok) uploaded = true;
          else console.error(`  ✗ ${m.name} (尝试${attempt}) ${(await resp.text()).slice(0, 120)}`);
        } catch (e) {
          console.error(`  ! ${m.name} (尝试${attempt}) ${e.cause?.code || e.message}`);
        }
        if (!uploaded && attempt < 5) await sleep(800 * attempt);
      }
      return { m, kind: uploaded ? "ok" : "fail" };
    }));
    for (const r of res) {
      if (r.kind === "planned") planned++;
      else if (r.kind === "skip") skip++;
      else if (r.kind === "ok") { ok++; doneSet.add(r.m.slot); }
      else { fail++; failed.push(r.m.slot); }
    }
    if (!DRY) fs.writeFileSync(DONE_FILE, JSON.stringify([...doneSet]));
    console.log(`  进度 ${Math.min(i + CONC, total)}/${total} (新传 ${ok}, 跳过已存在 ${skip}, 失败 ${fail}${DRY ? `, 计划 ${planned}` : ""})`);
    if (i + CONC < total && !DRY) await sleep(150); // 每批之间轻量停顿，安抚 LB
  }
  console.log(DRY ? "✓ dry 完成，未实际上传" : `✓ 帽子图上传完成：新传 ${ok} / 跳过已存在 ${skip} / 失败 ${fail} / 共 ${total}`);
  if (!DRY && fail > 0) console.log("以下 slot 上传失败，可再次运行本脚本自动续传（已成功的不会重复传）：\n  " + failed.join("\n  "));
  if (!DRY && fail === 0) console.log("\n全部完成。请硬刷新站点（Ctrl+F5）查看【特殊动物】与【帽子】分类。");
}

main().catch(e => { console.error(e); process.exit(1); });
