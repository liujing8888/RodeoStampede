/* =========================================================
   疯狂动物园 · 网站服务器（零依赖，Node 自带模块）
   - 静态文件：index.html / css / js / assets
   - 数据 API：
       GET  /api/ping            探测服务器是否可用
       GET  /api/settings        读取文字设置（data/settings.json）
       PUT  /api/settings        保存文字设置
       GET  /api/img/:slot       读取图片（data/img/<编码后的槽位名>）
       PUT  /api/img/:slot       上传/覆盖图片（请求体 = 图片二进制）
       DELETE /api/img/:slot     删除图片
       GET  /api/count           已存图片数量
   所有数据落盘在 F:\网站\data\，浏览器存储仅作回退与备份。
   ========================================================= */
const http = require("http");
const fs = require("fs");
const path = require("path");

const ROOT = __dirname;
// 云平台持久化：若设置 DATA_DIR 环境变量（指向挂载的持久卷），数据/图片全存那里；否则用本地 data/
const DATA_DIR = process.env.DATA_DIR ? path.resolve(process.env.DATA_DIR) : path.join(ROOT, "data");
const IMG_DIR = path.join(DATA_DIR, "img");
fs.mkdirSync(IMG_DIR, { recursive: true });

const CORS_ORIGINS = (process.env.CORS_ORIGINS || "*")
  .split(",")
  .map(v => v.trim())
  .filter(Boolean);

function applyCors(req, res) {
  const requestOrigin = req.headers.origin || "";
  const allowOrigin = CORS_ORIGINS.includes("*")
    ? "*"
    : (CORS_ORIGINS.includes(requestOrigin) ? requestOrigin : "");
  if (allowOrigin) res.setHeader("Access-Control-Allow-Origin", allowOrigin);
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, X-Admin-Token");
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS");
  res.setHeader("Access-Control-Max-Age", "600");
  if (requestOrigin && allowOrigin !== "*") res.setHeader("Vary", "Origin");
}

const MIME = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".svg": "image/svg+xml",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".webp": "image/webp",
  ".gif": "image/gif",
  ".ico": "image/x-icon"
};

function send(res, code, body, type) {
  const buf = Buffer.isBuffer(body) ? body : Buffer.from(String(body));
  res.writeHead(code, {
    "Content-Type": type || "text/plain; charset=utf-8",
    "Content-Length": buf.length
  });
  res.end(buf);
}

function readBody(req) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    req.on("data", c => chunks.push(c));
    req.on("end", () => resolve(Buffer.concat(chunks)));
    req.on("error", reject);
  });
}

/* 槽位名 → 安全文件名（encodeURIComponent 结果在 Windows/NTFS 上安全） */
function slotFile(slot) {
  return path.join(IMG_DIR, encodeURIComponent(slot));
}

/* ---------- 写接口鉴权（服务器侧真正校验，前端密码不再可信） ---------- */
const ADMIN_PW_FILE = path.join(DATA_DIR, "admin_pw.txt");
function getAdminPw() {
  if (process.env.SITE_ADMIN_PW) return String(process.env.SITE_ADMIN_PW);
  try {
    if (fs.existsSync(ADMIN_PW_FILE)) {
      const v = fs.readFileSync(ADMIN_PW_FILE, "utf8").trim();
      if (v) return v;
    }
  } catch (e) {}
  return "admin"; // 默认弱口令，发布前请通过 env SITE_ADMIN_PW 或编辑 data/admin_pw.txt 改强
}
function authOk(req) {
  const h = req.headers["x-admin-token"] || req.headers["X-Admin-Token"] || "";
  return typeof h === "string" && h !== "" && h === getAdminPw();
}
function deny(res) {
  return send(res, 401, '{"error":"unauthorized"}', "application/json");
}

const server = http.createServer(async (req, res) => {
  try {
    applyCors(req, res);
    const url = new URL(req.url, "http://localhost");
    const p = url.pathname;

    if (req.method === "OPTIONS") {
      res.writeHead(204, { "Content-Length": "0" });
      return res.end();
    }

    /* ---------- API ---------- */
    if (p === "/api/ping") return send(res, 200, "ok");

    /* 编辑登录：校验管理员口令，成功后前端用该口令作为 X-Admin-Token 调用写接口 */
    if (p === "/api/login") {
      if (req.method === "POST" || req.method === "PUT") {
        let d; try { d = JSON.parse((await readBody(req)).toString("utf8")); } catch (e) { return send(res, 400, '{"error":"bad json"}', "application/json"); }
        const pw = String(d.password || "");
        if (pw && pw === getAdminPw()) return send(res, 200, '{"ok":true}', "application/json");
        return send(res, 401, '{"error":"wrong password"}', "application/json");
      }
      return send(res, 405, "method not allowed");
    }

    if (p === "/api/settings") {
      const f = path.join(DATA_DIR, "settings.json");
      if (req.method === "GET") {
        let raw = fs.existsSync(f) ? fs.readFileSync(f, "utf8") : "{}";
        try { const o = JSON.parse(raw); delete o.adminPass; raw = JSON.stringify(o); } catch (e) {}
        return send(res, 200, raw, "application/json");
      }
      if (req.method === "PUT" || req.method === "POST") {
        if (!authOk(req)) return deny(res);
        const body = await readBody(req);
        fs.writeFileSync(f, body);
        return send(res, 200, '{"ok":true}', "application/json");
      }
      return send(res, 405, "method not allowed");
    }

    if (p === "/api/taxonomy") {
      const f = path.join(DATA_DIR, "taxonomy.json");
      if (req.method === "GET") {
        if (fs.existsSync(f)) return send(res, 200, fs.readFileSync(f), "application/json");
        return send(res, 200, "[]", "application/json");
      }
      if (req.method === "PUT" || req.method === "POST") {
        if (!authOk(req)) return deny(res);
        const body = await readBody(req);
        fs.writeFileSync(f, body);
        return send(res, 200, '{"ok":true}', "application/json");
      }
      return send(res, 405, "method not allowed");
    }

    if (p === "/api/count") {
      let n = 0;
      try { n = fs.readdirSync(IMG_DIR).filter(f => fs.statSync(path.join(IMG_DIR, f)).isFile()).length; } catch (e) {}
      return send(res, 200, JSON.stringify({ count: n }), "application/json");
    }

    /* ---------- 到此一游：打卡数据存储与统计 ---------- */
    if (p === "/api/checkin") {
      const CFile = path.join(DATA_DIR, "checkins.json");
      const readC = () => { try { return fs.existsSync(CFile) ? JSON.parse(fs.readFileSync(CFile, "utf8")) : []; } catch (e) { return []; } };
      const writeC = a => { try { fs.writeFileSync(CFile, JSON.stringify(a, null, 2)); return true; } catch (e) { return false; } };

      if (req.method === "POST" || req.method === "PUT") {
        let d; try { d = JSON.parse((await readBody(req)).toString("utf8")); } catch (e) { return send(res, 400, JSON.stringify({ error: "bad json" }), "application/json"); }
        const id = String(d.deviceId || "").slice(0, 64);
        if (!id) return send(res, 400, JSON.stringify({ error: "missing deviceId" }), "application/json");
        const list = readC();
        const now = new Date().toISOString();
        let rec = list.find(x => x.id === id);
        if (rec) {
          rec.visits = (rec.visits || 0) + 1; rec.lastAt = now;
          if (Array.isArray(d.locations)) rec.locations = Array.from(new Set([...(rec.locations || []), ...d.locations]));
          if (d.deviceType) rec.deviceType = d.deviceType;
          if (d.brand) rec.brand = d.brand;
          if (d.model) rec.model = d.model;
          if (d.osVersion) rec.osVersion = d.osVersion;
          writeC(list);
          return send(res, 200, JSON.stringify({ seq: rec.seq, isNew: false, total: list.length }), "application/json");
        }
        const seq = list.length + 1;
        rec = { id, seq, deviceType: d.deviceType || "unknown", brand: d.brand || "unknown", model: d.model || "", osVersion: d.osVersion || "", locations: Array.isArray(d.locations) ? d.locations : [], visits: 1, firstAt: now, lastAt: now };
        list.push(rec); writeC(list);
        return send(res, 200, JSON.stringify({ seq, isNew: true, total: list.length }), "application/json");
      }
      if (req.method === "GET") {
        const list = readC();
        const byType = {}, byBrand = {}, byLoc = {}, byVisits = {};
        for (const r of list) {
          byType[r.deviceType] = (byType[r.deviceType] || 0) + 1;
          byBrand[r.brand] = (byBrand[r.brand] || 0) + 1;
          for (const l of (r.locations || [])) byLoc[l] = (byLoc[l] || 0) + 1;
          const v = r.visits || 1; byVisits[v] = (byVisits[v] || 0) + 1;
        }
        const recent = list.slice().sort((a, b) => (b.lastAt || "").localeCompare(a.lastAt || "")).slice(0, 20)
          .map(r => ({ seq: r.seq, brand: r.brand, deviceType: r.deviceType, locations: r.locations, visits: r.visits, lastAt: r.lastAt }));
        return send(res, 200, JSON.stringify({ total: list.length, byType, byBrand, byLoc, byVisits, recent }), "application/json");
      }
      return send(res, 405, "method not allowed");
    }

    const m = p.match(/^\/api\/img\/(.+)$/);
    if (m) {
      let slot;
      try { slot = decodeURIComponent(m[1]); } catch (e) { return send(res, 400, "bad slot"); }
      /* 安全：槽位名不允许路径穿越 */
      if (!slot || /[\\/]/.test(slot) || slot.includes("..")) return send(res, 400, "bad slot");
      const f = slotFile(slot);

      if (req.method === "GET") {
        if (fs.existsSync(f) && fs.statSync(f).isFile()) {
          res.writeHead(200, {
            "Content-Type": "image/png",
            "Cache-Control": "public, max-age=86400"
          });
          return fs.createReadStream(f).pipe(res);
        }
        return send(res, 404, "");
      }
      if (req.method === "PUT" || req.method === "POST") {
        if (!authOk(req)) return deny(res);
        const body = await readBody(req);
        if (!body.length) return send(res, 400, "empty body");
        fs.writeFileSync(f, body);
        return send(res, 200, '{"ok":true}', "application/json");
      }
      if (req.method === "DELETE") {
        if (!authOk(req)) return deny(res);
        if (fs.existsSync(f)) fs.unlinkSync(f);
        return send(res, 200, '{"ok":true}', "application/json");
      }
      return send(res, 405, "method not allowed");
    }

    /* ---------- 静态文件 ---------- */
    let sp = p;
    try { sp = decodeURIComponent(p); } catch (e) {}
    if (sp === "/") sp = "/index.html";
    /* 禁止直接访问数据目录（含图片/配置/打卡数据），只能通过受控 API */
    if (sp === "/data" || sp.startsWith("/data/")) return send(res, 403, "forbidden");
    const file = path.normalize(path.join(ROOT, sp));
    if (!file.startsWith(path.normalize(ROOT))) return send(res, 403, "forbidden");
    if (fs.existsSync(file) && fs.statSync(file).isFile()) {
      res.writeHead(200, {
        "Content-Type": MIME[path.extname(file).toLowerCase()] || "application/octet-stream",
        "Cache-Control": "no-cache"
      });
      return fs.createReadStream(file).pipe(res);
    }
    return send(res, 404, "Not Found");
  } catch (err) {
    console.error(err);
    return send(res, 500, "server error");
  }
});

const PORT = process.env.PORT || 8080;
const HOST = process.env.HOST || "0.0.0.0";

// 云平台首次种子：若持久卷(DATA_DIR)为空，从内置 data/ 复制初始数据（仅一次，之后全落卷）
function seedDataIfEmpty() {
  const src = path.join(ROOT, "data");
  if (DATA_DIR === src) return; // 本地模式（未设 DATA_DIR）不复制
  const targetTax = path.join(DATA_DIR, "taxonomy.json");
  if (!fs.existsSync(targetTax)) {
    try {
      fs.cpSync(src, DATA_DIR, { recursive: true });
      console.log("[疯狂动物园] 已用内置 data/ 初始化持久卷: " + DATA_DIR);
    } catch (e) {
      console.error("[疯狂动物园] 初始化持久卷失败: " + e.message);
    }
  }
}
seedDataIfEmpty();

server.listen(PORT, HOST, () => {
  console.log("[疯狂动物园] 网站与数据服务已启动: http://" + HOST + ":" + PORT);
  console.log("[疯狂动物园] 数据落盘目录: " + DATA_DIR);
});