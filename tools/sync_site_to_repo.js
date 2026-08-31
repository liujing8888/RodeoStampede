#!/usr/bin/env node
/**
 * 同步线上站点数据到本地仓库（工作流「方案 B」）
 * -------------------------------------------------------------
 * 你在网页后台 🛠 改完内容后，跑本脚本即可把线上最新数据拉回本地仓库并提交，
 * 需要同步到组织库时再加 --push（或自行 git push org main）。
 *
 * 数据来源（只读 GET，无需登录）：
 *   GET /api/taxonomy   -> data/taxonomy.json
 *   GET /api/settings   -> data/settings.json
 *   GET /api/checkin    -> data/checkins.json
 *   GET /api/img/<slot> -> data/img/<slot 编码>   (仅 --images)
 *
 * 用法：
 *   node tools/sync_site_to_repo.js                 # 拉 JSON 并提交（默认 rodeosocial.yodo1.cn）
 *   node tools/sync_site_to_repo.js --images        # 同时拉回图片
 *   node tools/sync_site_to_repo.js --images --force # 图片全部强制重下
 *   node tools/sync_site_to_repo.js --push          # 提交后再推组织库
 *   node tools/sync_site_to_repo.js --dry           # 只预览，不写盘不提交
 *   BASE_URL=https://xxx node tools/sync_site_to_repo.js
 *
 * 要求：Node >= 18（使用全局 fetch）。
 */

const fs = require("fs");
const path = require("path");
const { execSync } = require("child_process");

const ROOT = path.resolve(__dirname, "..");
const DATA = path.join(ROOT, "data");
const IMG_DIR = path.join(DATA, "img");

const BASE = process.env.BASE_URL || "https://rodeosocial.yodo1.cn";
const args = new Set(process.argv.slice(2));
const DRY = args.has("--dry");
const WITH_IMAGES = args.has("--images");
const FORCE = args.has("--force");
const DO_PUSH = args.has("--push");

const enc = (s) => encodeURIComponent(s);            // 用于 URL：brand:banner -> brand%3Abanner
const fileOf = (slot) => slot.replace(/:/g, "%3A");  // 用于本地文件名，与现有约定一致

const log = (...a) => console.log("[sync]", ...a);
const warn = (...a) => console.warn("[sync][WARN]", ...a);

async function getJSON(rel) {
  const r = await fetch(BASE + rel, { redirect: "follow" });
  if (!r.ok) throw new Error(`GET ${rel} -> HTTP ${r.status}`);
  return r.json();
}
async function getBytes(rel) {
  const r = await fetch(BASE + rel, { redirect: "follow" });
  if (!r.ok) throw new Error(`GET ${rel} -> HTTP ${r.status}`);
  return Buffer.from(await r.arrayBuffer());
}

// 收集所有可能的图片 slot（动物图 + 品牌图 + 宣传图 + 版本活动图）
function collectImageSlots(taxonomy, settings) {
  const slots = new Set();
  ["brand:banner", "brand:icon", "brand:logo"].forEach((s) => slots.add(s));
  const posters = (settings && settings.posters) || [];
  const n = Math.max(3, posters.length);
  for (let i = 0; i < n; i++) slots.add("poster:" + i);
  (settings && settings.versions || []).forEach((v) => v && v.id && slots.add("version:" + v.id));
  if (Array.isArray(taxonomy)) {
    for (const cat of taxonomy) for (const sub of cat.subs || []) for (const sp of sub.species || []) {
      slots.add("sp:" + sp.id);
      for (const v of sp.variants || []) slots.add("var:" + v.id);
    }
  }
  return [...slots];
}

function gitCommit(msg) {
  if (DRY) { log("DRY: 跳过 git commit"); return; }
  execSync("git add data/", { cwd: ROOT, stdio: "inherit" });
  try {
    execSync(`git commit -m "${msg}"`, { cwd: ROOT, stdio: "inherit" });
  } catch (e) {
    log("（无变更或提交被跳过，属正常）");
  }
}

async function main() {
  log("数据源:", BASE);
  log("模式:", DRY ? "预览(不落盘)" : "写入本地", WITH_IMAGES ? "+图片" : "", FORCE ? "+强制" : "", DO_PUSH ? "+推送" : "");

  // 1) 拉取并写入 JSON
  const files = [
    ["/api/taxonomy", "taxonomy.json"],
    ["/api/settings", "settings.json"],
    ["/api/checkin", "checkins.json"],
  ];
  let ok = 0;
  for (const [rel, name] of files) {
    try {
      const obj = await getJSON(rel);
      const text = JSON.stringify(obj, null, 2);
      if (DRY) { log(`DRY: ${name} 可获取, ${text.length} 字节`); }
      else { fs.writeFileSync(path.join(DATA, name), text + "\n"); log(`已更新 ${name} (${text.length} 字节)`); }
      ok++;
    } catch (e) { warn(`${name} 获取失败: ${e.message}`); }
  }
  if (ok === 0) { warn("三个 JSON 全部获取失败，终止。"); process.exit(1); }

  // 2) 图片同步（可选）
  if (WITH_IMAGES) {
    if (!DRY) fs.mkdirSync(IMG_DIR, { recursive: true });
    const taxonomy = JSON.parse(fs.readFileSync(path.join(DATA, "taxonomy.json"), "utf8"));
    const settings = JSON.parse(fs.readFileSync(path.join(DATA, "settings.json"), "utf8"));
    const slots = collectImageSlots(taxonomy, settings);
    log(`枚举到 ${slots.length} 个图片 slot`);
    let dl = 0, skip = 0, fail = 0;
    for (const slot of slots) {
      const f = path.join(IMG_DIR, fileOf(slot));
      if (!FORCE && fs.existsSync(f) && fs.statSync(f).size > 0) { skip++; continue; }
      try {
        const buf = await getBytes("/api/img/" + enc(slot));
        if (DRY) { log(`DRY: ${slot} 可下载 (${buf.length} 字节)`); }
        else { fs.writeFileSync(f, buf); }
        dl++;
      } catch (e) { fail++; warn(`${slot} 下载失败: ${e.message}`); }
    }
    log(`图片: 下载 ${dl}, 跳过已存在 ${skip}, 失败 ${fail}`);
  }

  // 3) 提交（必要时推送）
  const stamp = new Date().toISOString().slice(0, 16).replace("T", " ");
  gitCommit(`sync: 从线上 ${BASE} 拉取最新数据 (${stamp})`);
  if (DO_PUSH) {
    if (DRY) log("DRY: 跳过 git push");
    else { log("推送组织库 org main ..."); execSync("git push org main", { cwd: ROOT, stdio: "inherit" }); }
  } else {
    log("已完成本地提交。推组织库请执行: git push org main");
  }
}

main().catch((e) => { console.error("[sync][FATAL]", e); process.exit(1); });
