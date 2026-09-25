/* =========================================================
   疯狂动物园 · 编辑模式
   - 文字/链接设置：优先存服务器（data/settings.json），浏览器 localStorage 作备份
   - 图鉴树：存服务器（data/taxonomy.json），可自由增删改名
   - 图片资源：优先存服务器（data/img/），浏览器 IndexedDB 作回退
   - 编辑模式入口：左下角 🛠 按钮（密码由服务器 data/admin_pw.txt 控制，可设环境变量 SITE_ADMIN_PW 覆盖）
   ========================================================= */

/* ---------- 默认设置（可被用户编辑覆盖） ---------- */
const S_KEY = "zooSettingsV1";

const DEFAULTS = {
  adminPass: "admin",
  hero: {
    title: "疯狂动物园",
    sub: "驾驭飞船穿梭草原、时空与海洋，收集属于你的 4000 种神奇动物",
    promo: "🎉 新版本「时空飞船 · 奥林匹斯」现已启航"
  },
  nav: {
    promo: "宣传图",
    creators: "优秀创作者",
    social: "社区社媒",
    checkin: "到此一游"
  },
  versions: [
    { id:"v3", title:"时空飞船 · 奥林匹斯启航", tag:"新地图", date:"2026-08-20",
      detail:"时空飞船新区域「奥林匹斯」开放！\n\n· 新增 20 种神话物种：天马、狮鹫、独角兽、地狱犬、凤凰……\n· 每个物种含 20 个不同个体，共计 400 个新图鉴条目\n· 限时活动「诸神试炼」开启，完成任务领取限定「神话」个体\n· 图鉴系统优化：支持按名字搜索与稀有度筛选" },
    { id:"v2", title:"海洋深潜版本", tag:"新玩法", date:"2026-07-15",
      detail:"海洋世界全面升级！\n\n· 开放深潜玩法，探索海底洞穴\n· 新增海洋图鉴 20 物种 × 20 个体\n· 好友互访：参观对方的动物园并赠送礼物" },
    { id:"v1", title:"创园公测正式开启", tag:"里程碑", date:"2026-06-01",
      detail:"疯狂动物园公测启动！\n\n· 首发天空飞船五大区域：草原、沙漠、基地、山脉、丛林\n· 集齐图鉴可领取限定坐骑\n· 加入官方社区，获取第一手攻略与福利" }
  ],
  posters: [
    { title:"草原日落 · 狮群巡游" },
    { title:"侏罗纪 · 雷霆霸王" },
    { title:"深海秘境 · 鲸之歌" }
  ],
  creators: [
    { name:"园长老王", role:"攻略组", desc:"全物种速通路线与稀有个体刷新点研究", link:"#" },
    { name:"驯兽师小鹿", role:"视频作者", desc:"每种动物的高光时刻混剪，周更不断", link:"#" },
    { name:"图鉴猎人", role:"数据党", desc:"个体掉率与属性面板全统计，表格控福音", link:"#" },
    { name:"画师阿波", role:"同人绘", desc:"疯狂动物园拟人化系列插画作者", link:"#" },
    { name:"主播大猫", role:"直播间", desc:"每晚 8 点挑战无伤驯服传说个体", link:"#" },
    { name:"手作娘喵喵", role:"手工区", desc:"黏土与毛毡动物周边制作教程", link:"#" }
  ],
  social: [
    { key:"douyin",  name:"抖音",   url:"#" },
    { key:"bilibili",name:"B站",    url:"#" },
    { key:"xhs",     name:"小红书", url:"#" },
    { key:"ks",      name:"快手",   url:"#" },
    { key:"forum",   name:"玩家社区", url:"#" }
  ],
  service: {
    greeting:"你好，牛仔们，这里是疯狂动物园客服 🦁",
    qq:"800123456", wechat:"fengkuang-zoo",
    email:"service@zoo.game", hours:"工作日 9:00 – 21:00"
  },
  vote: {
    desc:"为你最喜爱的动物、最希望出现在礼包的动物投上一票。\n规则：每月每设备 ❤️ 与 🎁 各 10 票，同一动物可重复投。\n点开任意物种，在每个「动物卡片」下方点击 ❤️ / 🎁 即可。",
    hint:"榜单数据来自全站玩家投票，去 动物图鉴 点开物种、在「个体卡片」上点 ❤️ / 🎁 即可参与。"
  }
};

function deepMerge(base, over){
  for(const k in over){
    if(over[k] && typeof over[k] === "object" && !Array.isArray(over[k])
       && base[k] && typeof base[k] === "object" && !Array.isArray(base[k])){
      deepMerge(base[k], over[k]);
    } else { base[k] = over[k]; }
  }
  return base;
}
let S;
try { S = deepMerge(structuredClone(DEFAULTS), JSON.parse(localStorage.getItem(S_KEY) || "{}")); }
catch(e){ S = structuredClone(DEFAULTS); }

let API_OK = false;   /* 服务器持久存储是否可用（不可用时自动回退浏览器本地） */
async function saveS(){
  try{ localStorage.setItem(S_KEY, JSON.stringify(S)); }catch(e){}
  if(API_OK){
    try{
      const r = await zooApiFetch("/api/settings", { method:"PUT", headers: zooAuthHeaders({ "Content-Type":"application/json" }), body: JSON.stringify(S) });
      return !!r.ok;   /* 返回真实成败，便于上层提示 */
    }catch(e){ return false; }
  }
  return false;        /* 仅落本机，未同步服务器 */
}

/* ---------- 图鉴树（活数据，落盘 data/taxonomy.json） ---------- */
function loadTax(){
  return new Promise(async resolve => {
    try{
      const r = await zooApiFetch("/api/ping", { cache:"no-store" });
      API_OK = !!r.ok;
    }catch(e){ API_OK = false; }
    if(API_OK){
      try{
        const r = await zooApiFetch("/api/taxonomy", { cache:"no-store" });
        if(r.ok){ const d = await r.json(); if(Array.isArray(d) && d.length) TAX = d; }
      }catch(e){}
    }
    if(!TAX.length){
      TAX = defaultTaxonomy();
      saveTax();
    }
    resolve();
  });
}
function saveTax(){
  if(API_OK){
    zooApiFetch("/api/taxonomy", { method:"PUT", headers: zooAuthHeaders({ "Content-Type":"application/json" }), body: JSON.stringify(TAX) })
      .catch(() => {});
  }
}

/* ---------- 初始化存储：探测服务器；服务器为空时把浏览器旧数据迁移上去 ---------- */
async function initStorage(){
  try{
    const r = await zooApiFetch("/api/ping", { cache:"no-store" });
    API_OK = !!r.ok;
  }catch(e){ API_OK = false; }
  if(!API_OK) return;

  /* ① 设置：服务器优先；服务器为空则把本浏览器设置迁移上去 */
  let srv = {};
  try{
    const r = await zooApiFetch("/api/settings", { cache:"no-store" });
    if(r.ok) srv = await r.json();
  }catch(e){}
  if(srv && Object.keys(srv).length){
    S = deepMerge(structuredClone(DEFAULTS), srv);
  }else if(localStorage.getItem(S_KEY)){
    zooApiFetch("/api/settings", { method:"PUT", headers: zooAuthHeaders({ "Content-Type":"application/json" }), body: JSON.stringify(S) })
      .catch(() => {});
  }

  /* ② 图片：服务器为空时，把本浏览器 IndexedDB 里的图片一次性迁移上去 */
  let cnt = -1;
  try{
    const r = await zooApiFetch("/api/count", { cache:"no-store" });
    if(r.ok) cnt = (await r.json()).count;
  }catch(e){}
  if(cnt === 0 && imgDB){
    await new Promise(done => {
      let keys = [], vals = [];
      try{
        const tx = imgDB.transaction(IMG_STORE, "readonly");
        tx.objectStore(IMG_STORE).getAllKeys().onsuccess = e => keys = e.target.result;
        tx.objectStore(IMG_STORE).getAll().onsuccess = e => vals = e.target.result;
        tx.oncomplete = async () => {
          for(let i = 0; i < keys.length; i++){
            try{ await zooApiFetch("/api/img/" + encodeURIComponent(keys[i]), { method:"PUT", headers: zooAuthHeaders(), body: vals[i] }); }catch(e){}
          }
          done();
        };
        tx.onerror = () => done();
      }catch(e){ done(); }
    });
  }
}

/* ---------- 图片存储：优先服务器磁盘（data/img/），回退浏览器 IndexedDB ---------- */
const IMG_DB = "zooAssetsV1", IMG_STORE = "images";
let imgDB = null;
const urlCache = new Map();    /* slot -> objectURL（本次会话内复用） */
const blobCache = new Map();   /* slot -> Blob */

function openImgDB(){
  return new Promise((res, rej) => {
    const r = indexedDB.open(IMG_DB, 1);
    r.onupgradeneeded = e => {
      const d = e.target.result;
      if(!d.objectStoreNames.contains(IMG_STORE)) d.createObjectStore(IMG_STORE);
    };
    r.onsuccess = e => { imgDB = e.target.result; res(); };
    r.onerror = () => rej(r.error);
  });
}

function idbGet(id){
  return new Promise(res => {
    if(!imgDB) return res(null);
    const rq = imgDB.transaction(IMG_STORE, "readonly").objectStore(IMG_STORE).get(id);
    rq.onsuccess = () => res(rq.result || null);
    rq.onerror = () => res(null);
  });
}
function idbSet(id, blob){
  return new Promise(res => {
    if(!imgDB) return res(false);
    const tx = imgDB.transaction(IMG_STORE, "readwrite");
    tx.objectStore(IMG_STORE).put(blob, id);
    tx.oncomplete = () => res(true);
    tx.onerror = () => res(false);
  });
}
function idbDel(id){
  return new Promise(res => {
    if(!imgDB) return res();
    const tx = imgDB.transaction(IMG_STORE, "readwrite");
    tx.objectStore(IMG_STORE).delete(id);
    tx.oncomplete = () => res();
    tx.onerror = () => res();
  });
}

const IMG = {
  async get(id){
    if(blobCache.has(id)) return blobCache.get(id);
    let blob = null;
    if(API_OK){
      try{
        const r = await zooApiFetch("/api/img/" + encodeURIComponent(id), { cache:"no-store" });
        if(r.ok) blob = await r.blob();
      }catch(e){}
    }
    if(!blob) blob = await idbGet(id);
    if(blob) blobCache.set(id, blob);
    return blob;
  },
  async set(id, blob){
    if(API_OK){
      try{
        const r = await zooApiFetch("/api/img/" + encodeURIComponent(id), { method:"PUT", headers: zooAuthHeaders(), body: blob });
        if(r.ok){ blobCache.set(id, blob); urlCache.delete(id); return true; }
        /* 服务器可达但写入失败（多为未登录 / token 失效）→ 明确失败，不静默存本地 */
        return false;
      }catch(e){ return false; }
    }
    /* 仅当服务器完全不可达时，才回退浏览器本地，避免数据彻底丢失 */
    const ok = await idbSet(id, blob);
    if(ok){ blobCache.set(id, blob); urlCache.delete(id); }
    return ok;
  },
  async del(id){
    if(API_OK){ try{ await zooApiFetch("/api/img/" + encodeURIComponent(id), { method:"DELETE", headers: zooAuthHeaders() }); }catch(e){} }
    await idbDel(id);
    blobCache.delete(id); urlCache.delete(id);
    return true;
  },
  async count(){
    if(API_OK){
      try{
        const r = await zooApiFetch("/api/count", { cache:"no-store" });
        if(r.ok) return (await r.json()).count;
      }catch(e){}
    }
    return await new Promise(res => {
      if(!imgDB) return res(0);
      const rq = imgDB.transaction(IMG_STORE, "readonly").objectStore(IMG_STORE).count();
      rq.onsuccess = () => res(rq.result);
      rq.onerror = () => res(0);
    });
  }
};

/* 给 <img data-slot="..."> 填充图片；无图则隐藏该 img（露出 CSS 渐变占位） */
async function applyImages(root){
  const els = (root || document).querySelectorAll("img[data-slot]");
  for(const el of els){
    const slot = el.dataset.slot;
    if(urlCache.has(slot)){ el.src = urlCache.get(slot); el.style.display = ""; continue; }
    const blob = await IMG.get(slot);
    if(blob){
      const u = URL.createObjectURL(blob);
      urlCache.set(slot, u);
      el.src = u; el.style.display = "";
    }else{
      el.removeAttribute("src");
      el.style.display = "none";
    }
  }
}

/* ---------- 编辑模式 ---------- */
let EDIT = sessionStorage.getItem("zooEdit") === "1";

function pickFile(accept){
  return pickFiles(accept || "image/*", false);
}
function pickFiles(accept, multiple){
  return new Promise(res => {
    const inp = document.createElement("input");
    inp.type = "file"; inp.accept = accept || "image/*";
    if(multiple) inp.multiple = true;
    inp.onchange = () => res(multiple ? [...inp.files] : (inp.files && inp.files[0] || null));
    inp.click();
  });
}

async function uploadToSlot(slot, refresh){
  if(!window.ADMIN_TOKEN){
    toast("请先在右上角 🛠 登录编辑模式，再上传图片（否则无法保存到云端）");
    return;
  }
  const f = await pickFile("image/*");
  if(!f) return;
  const ok = await IMG.set(slot, f);
  toast(ok
    ? "图片已保存到云端服务器，不会丢失 ✅"
    : (API_OK ? "上传失败：请确认已登录编辑模式后重试" : "服务器不可达，图片已临时存本浏览器"));
  if(ok){
    if(slot === "brand:icon") applyFavicon();
    if(refresh) refresh(); else applyImages(document);
  }
}

function applyFavicon(){
  IMG.get("brand:icon").then(b => {
    const link = document.getElementById("favicon");
    if(b) link.href = URL.createObjectURL(b);
    else link.href = "assets/logo.svg";
  });
}

/* ---------- 通用输入弹窗（替代浏览器 prompt/confirm，适配内嵌预览） ---------- */
function askText(title, def){
  return new Promise(res => {
    const modal = document.getElementById("askModal");
    document.getElementById("askTitle").textContent = title;
    const inp = document.getElementById("askInput");
    inp.value = def || "";
    const done = v => { closeAsk(); res(v); };
    document.getElementById("askOk").onclick = () => done(inp.value.trim() || null);
    document.getElementById("askCancel").onclick = () => done(null);
    modal.querySelectorAll("[data-ask-close]").forEach(b => b.onclick = () => done(null));
    openModal("askModal");
    setTimeout(() => inp.focus(), 50);
  });
}
function closeAsk(){ document.getElementById("askModal").classList.remove("is-open"); }
function askConfirm(msg){
  return new Promise(res => {
    const modal = document.getElementById("confirmModal");
    document.getElementById("confirmText").textContent = msg;
    const done = v => { modal.classList.remove("is-open"); res(v); };
    document.getElementById("confirmOk").onclick = () => done(true);
    document.getElementById("confirmCancel").onclick = () => done(false);
    modal.querySelectorAll("[data-confirm-close]").forEach(b => b.onclick = () => done(false));
    openModal("confirmModal");
  });
}

/* ---------- 管理面板 ---------- */
function esc(s){ return String(s ?? "").replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/"/g,"&quot;"); }

function buildAdminPanel(){
  const wrap = document.getElementById("adminPanelBody");
  const hero = S.hero, serv = S.service;
  const cnt = taxCount();
  wrap.innerHTML = `
    <div class="adm-tabs">
      <button class="adm-tab is-active" data-t="brand">品牌视觉</button>
      <button class="adm-tab" data-t="poster">宣传图</button>
      <button class="adm-tab" data-t="ver">版本动态</button>
      <button class="adm-tab" data-t="cre">创作者</button>
      <button class="adm-tab" data-t="soc">社媒/客服</button>
      <button class="adm-tab" data-t="codex">图鉴管理</button>
      <button class="adm-tab" data-t="data">数据</button>
      <button class="adm-tab" data-t="checkin">到此一游数据</button>
    </div>

    <!-- 品牌视觉 -->
    <div class="adm-pane" data-pane="brand">
      <div class="adm-up-grid">
        <div class="adm-up"><img data-slot="brand:logo"><div class="adm-up__t">网站 Logo</div>
          <button class="btn btn--primary btn--sm" data-up="brand:logo">上传</button>
          <button class="btn btn--ghost btn--sm" data-del="brand:logo">清除</button></div>
        <div class="adm-up"><img data-slot="brand:icon"><div class="adm-up__t">浏览器 Icon</div>
          <button class="btn btn--primary btn--sm" data-up="brand:icon">上传</button>
          <button class="btn btn--ghost btn--sm" data-del="brand:icon">清除</button></div>
        <div class="adm-up adm-up--wide"><img data-slot="brand:banner"><div class="adm-up__t">顶部宣传图（Hero 背景）</div>
          <button class="btn btn--primary btn--sm" data-up="brand:banner">上传</button>
          <button class="btn btn--ghost btn--sm" data-del="brand:banner">清除</button></div>
      </div>
      <label class="adm-field"><span>网站名称</span><input id="admHeroTitle" value="${esc(hero.title)}"></label>
      <label class="adm-field"><span>副标题</span><input id="admHeroSub" value="${esc(hero.sub)}"></label>
      <label class="adm-field"><span>顶部公告条文字</span><input id="admPromo" value="${esc(hero.promo)}"></label>
      <h4 class="adm-sub-title">导航栏栏目文字（同步更新对应区块标题）</h4>
      <div class="adm-row">
        <label class="adm-field adm-field--inline"><span>栏目 1</span><input id="admNavPromo" value="${esc(S.nav.promo)}"></label>
        <label class="adm-field adm-field--inline"><span>栏目 2</span><input id="admNavCre" value="${esc(S.nav.creators)}"></label>
        <label class="adm-field adm-field--inline"><span>栏目 3</span><input id="admNavSoc" value="${esc(S.nav.social)}"></label>
        <label class="adm-field adm-field--inline"><span>栏目 4（到此一游）</span><input id="admNavCheckin" value="${esc(S.nav.checkin || "到此一游")}"></label>
      </div>
      <h4 class="adm-sub-title">导航栏背景图</h4>
      <div class="adm-up-grid">
        <div class="adm-up adm-up--wide"><img data-slot="nav:bg"><div class="adm-up__t">导航栏背景图（显示在导航栏后方）</div>
          <button class="btn btn--primary btn--sm" data-up="nav:bg">上传</button>
          <button class="btn btn--ghost btn--sm" data-del="nav:bg">清除</button></div>
      </div>
    </div>

    <!-- 宣传图（原壁纸） -->
    <div class="adm-pane is-hidden" data-pane="poster">
      <p class="adm-hint">3 张 16:9 宣传图，用于首页轮播。</p>
      <div class="adm-up-grid">
        ${[0,1,2].map(i => `
        <div class="adm-up adm-up--wide"><img data-slot="poster:${i}">
          <div class="adm-up__t">宣传图 ${i+1}</div>
          <input class="adm-inline" placeholder="标题" value="${esc(S.posters[i]?.title || "")}" data-poster-title="${i}">
          <div>
            <button class="btn btn--primary btn--sm" data-up="poster:${i}">上传</button>
            <button class="btn btn--ghost btn--sm" data-del="poster:${i}">清除</button>
          </div></div>`).join("")}
      </div>
    </div>

    <!-- 版本动态 -->
    <div class="adm-pane is-hidden" data-pane="ver">
      <p class="adm-hint">用户先看到活动图卡片，点进去是这里的详细内容。活动图可在下方每条的「上传活动图」中设置。用每条右侧的 ⬆ / ⬇ 调整展示顺序（首条不可上移、末条不可下移），最后点「保存全部」生效。</p>
      <div id="admVersions"></div>
      <button class="btn btn--primary btn--sm" id="admAddVersion">＋ 新增版本</button>
    </div>

    <!-- 创作者 -->
    <div class="adm-pane is-hidden" data-pane="cre">
      <div id="admCreators"></div>
      <button class="btn btn--primary btn--sm" id="admAddCreator">＋ 新增创作者</button>
    </div>

    <!-- 社媒 / 客服 -->
    <div class="adm-pane is-hidden" data-pane="soc">
      <h4>社区社媒链接</h4>
      <div id="admSocial"></div>
      <h4>客服信息（右下角对话框展示）</h4>
      <label class="adm-field"><span>客服欢迎语（对话框首句）</span><textarea id="admSvcGreet" rows="2">${esc(serv.greeting || "你好，牛仔们，这里是疯狂动物园客服 🦁")}</textarea></label>
      <label class="adm-field"><span>QQ 群</span><input id="admSvcQQ" value="${esc(serv.qq)}"></label>
      <label class="adm-field"><span>微信号</span><input id="admSvcWX" value="${esc(serv.wechat)}"></label>
      <label class="adm-field"><span>邮箱</span><input id="admSvcMail" value="${esc(serv.email)}"></label>
      <label class="adm-field"><span>服务时间</span><input id="admSvcHours" value="${esc(serv.hours)}"></label>
      <h4>动物投票文案</h4>
      <label class="adm-field"><span>投票页标题说明</span><textarea id="admVoteDesc" rows="3">${esc((S.vote && S.vote.desc) || "为你最喜爱的动物、最希望出现在礼包的动物投上一票。\n规则：每月每设备 ❤️ 与 🎁 各 10 票，同一动物可重复投。\n点开任意物种，在每个「动物卡片」下方点击 ❤️ / 🎁 即可。")}</textarea></label>
      <label class="adm-field"><span>投票页底部提示</span><textarea id="admVoteHint" rows="2">${esc((S.vote && S.vote.hint) || "榜单数据来自全站玩家投票，去 动物图鉴 点开物种、在「个体卡片」上点 ❤️ / 🎁 即可参与。")}</textarea></label>
    </div>

    <!-- 图鉴管理 -->
    <div class="adm-pane is-hidden" data-pane="codex">
      <p class="adm-hint">当前图鉴规模：<b>${cnt.cats}</b> 个分类 / <b>${cnt.subs}</b> 个下级分类 / <b>${cnt.species}</b> 个物种 / <b>${cnt.variants}</b> 个个体。<br>
      最方便的做法是<b>直接在页面上的「动物图鉴」区域</b>编辑：分类与下级分类标签旁有 ✎/🗑，物种卡片可改名、删除、批量传图。下方按钮用于快速新增分类。</p>
      <div id="admCodexTree"></div>
      <button class="btn btn--primary btn--sm" id="admAddCat">＋ 新增分类</button>
    </div>

    <!-- 数据 -->
    <div class="adm-pane is-hidden" data-pane="data">
      <p class="adm-hint">编辑密码由服务器文件 <code>data/admin_pw.txt</code> 控制（可用环境变量 <code>SITE_ADMIN_PW</code> 覆盖）。如需修改，请直接编辑该文件后重启服务。</p>
      <div class="adm-row">
        <button class="btn btn--primary btn--sm" id="admExport">导出文字数据（JSON）</button>
        <label class="btn btn--ghost btn--sm">导入文字数据<input type="file" id="admImport" accept="application/json" hidden></label>
        <button class="btn btn--danger btn--sm" id="admReset">恢复默认文字</button>
      </div>
      <p class="adm-hint">文字与图片都会保存到服务器磁盘（F:\\网站\\data\\），换浏览器、重启电脑都不丢。导出 JSON 可作为额外备份；「恢复默认文字」只重置文字，不影响图片与图鉴结构。</p>
    </div>

    <!-- 到此一游 · 数据 -->
    <div class="adm-pane is-hidden" data-pane="checkin" id="admCheckinPane">
      <div id="admCheckinBody"><p class="adm-hint">点击本标签页即自动加载打卡数据……</p></div>
    </div>

    <div class="adm-actions">
      <button class="btn btn--primary" id="admSaveAll">保存全部</button>
    </div>`;

  /* tab 切换 */
  wrap.querySelectorAll(".adm-tab").forEach(t => t.addEventListener("click", () => {
    wrap.querySelectorAll(".adm-tab").forEach(x => x.classList.toggle("is-active", x === t));
    wrap.querySelectorAll(".adm-pane").forEach(p => p.classList.toggle("is-hidden", p.dataset.pane !== t.dataset.t));
    if (t.dataset.t === "checkin" && window.loadCheckinStats) {
      window.loadCheckinStats(document.getElementById("admCheckinPane"));
    }
  }));

  /* 通用：上传 / 清除槽位 */
  wrap.querySelectorAll("[data-up]").forEach(b => b.addEventListener("click", () => uploadToSlot(b.dataset.up, () => { applyImages(wrap); applyImages(document); })));
  wrap.querySelectorAll("[data-del]").forEach(b => b.addEventListener("click", async () => {
    await IMG.del(b.dataset.del); applyImages(wrap); applyImages(document); if(b.dataset.del === "brand:icon") applyFavicon();
  }));

  renderAdmVersions(); renderAdmCreators(); renderAdmSocial(); renderAdmCodexTree();

  wrap.querySelector("#admAddVersion").addEventListener("click", () => {
    S.versions.push({ id:"v" + Date.now(), title:"新版本", tag:"活动", date:new Date().toISOString().slice(0,10), detail:"版本详细内容……" });
    renderAdmVersions(); renderVersions();
  });
  wrap.querySelector("#admAddCreator").addEventListener("click", () => {
    S.creators.push({ name:"新创作者", role:"—", desc:"简介", link:"#" });
    renderAdmCreators(); renderCreators();
  });
  wrap.querySelector("#admAddCat").addEventListener("click", () => {
    askText("新增分类名称", "新分类").then(name => {
      if(!name) return;
      const cat = { id: uid("cat_"), name, icon:"🗂️", subs:[{ id: uid("sub_"), name:"新区域", icon:"📁", species:[] }] };
      TAX.push(cat); saveTax(); renderAdmCodexTree(); toast("已新增分类");
    });
  });

  wrap.querySelector("#admExport").addEventListener("click", () => {
    const blob = new Blob([JSON.stringify(S, null, 2)], { type:"application/json" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob); a.download = "fengkuang-zoo-settings.json"; a.click();
  });
  wrap.querySelector("#admImport").addEventListener("change", e => {
    const f = e.target.files[0]; if(!f) return;
    const r = new FileReader();
    r.onload = () => {
      try {
        S = deepMerge(structuredClone(DEFAULTS), JSON.parse(r.result));
        saveS(); refreshAll(); buildAdminPanel(); toast("导入成功");
      } catch(err){ toast("导入失败：文件格式错误"); }
    };
    r.readAsText(f);
  });
  wrap.querySelector("#admReset").addEventListener("click", () => {
    if(!window.__admResetArmed){
      window.__admResetArmed = true;
      const btn = wrap.querySelector("#admReset");
      btn.textContent = "再点一次确认恢复";
      setTimeout(() => { window.__admResetArmed = false; btn.textContent = "恢复默认文字"; }, 3000);
      return;
    }
    window.__admResetArmed = false; wrap.querySelector("#admReset").textContent = "恢复默认文字";
    S = structuredClone(DEFAULTS); saveS(); refreshAll(); buildAdminPanel(); toast("已恢复默认文字");
  });

  wrap.querySelector("#admSaveAll").addEventListener("click", async () => {
    S.hero.title   = wrap.querySelector("#admHeroTitle").value.trim() || S.hero.title;
    S.hero.sub     = wrap.querySelector("#admHeroSub").value.trim();
    S.hero.promo   = wrap.querySelector("#admPromo").value.trim();
    S.nav.promo     = wrap.querySelector("#admNavPromo").value.trim() || "宣传图";
    S.nav.creators  = wrap.querySelector("#admNavCre").value.trim() || "优秀创作者";
    S.nav.social    = wrap.querySelector("#admNavSoc").value.trim() || "社区社媒";
    S.nav.checkin   = wrap.querySelector("#admNavCheckin").value.trim() || "到此一游";
    S.service.greeting = wrap.querySelector("#admSvcGreet").value.trim() || "你好，牛仔们，这里是疯狂动物园客服 🦁";
    S.service.qq     = wrap.querySelector("#admSvcQQ").value.trim();
    S.service.wechat = wrap.querySelector("#admSvcWX").value.trim();
    S.service.email  = wrap.querySelector("#admSvcMail").value.trim();
    S.service.hours  = wrap.querySelector("#admSvcHours").value.trim();
    S.vote = S.vote || {};
    S.vote.desc = wrap.querySelector("#admVoteDesc").value.trim() || "为你最喜爱的动物、最希望出现在礼包的动物投上一票。\n规则：每月每设备 ❤️ 与 🎁 各 10 票，同一动物可重复投。\n点开任意物种，在每个「动物卡片」下方点击 ❤️ / 🎁 即可。";
    S.vote.hint = wrap.querySelector("#admVoteHint").value.trim() || "榜单数据来自全站玩家投票，去 动物图鉴 每张卡片上点 ❤️ / 🎁 即可参与。";
    if(window.fillVoteDesc) window.fillVoteDesc();
    wrap.querySelectorAll("[data-poster-title]").forEach(i => {
      const idx = +i.dataset.posterTitle;
      if(S.posters[idx]) S.posters[idx].title = i.value.trim();
    });
    collectAdmVersions(); collectAdmCreators(); collectAdmSocial();
    const ok = await saveS(); refreshAll();
    if(ok) toast("已保存并同步到服务器 ✅");
    else if(API_OK) toast("⚠️ 保存失败：服务器拒绝，请先登录编辑模式（网址加 ?admin=1）");
    else toast("⚠️ 仅保存到本机：服务器不可达，上线后请在后台重新保存");
  });
}

/* 图鉴管理：树状预览 + 快速增删（页面内编辑为主，这里作补充） */
function renderAdmCodexTree(){
  const box = document.getElementById("admCodexTree"); if(!box) return;
  box.innerHTML = TAX.map(c => {
    const subs = c.subs || [];
    const direct = c.species || [];
    const spCnt = subs.reduce((n,s)=>n+s.species.length,0) + direct.length;
    return `
    <div class="adm-tree-cat">
      <div class="adm-tree-h">${esc(c.icon)} ${esc(c.name)} <span class="adm-tree-n">${subs.length} 区域 · ${spCnt} 物种</span></div>
      ${subs.map(s => `
        <div class="adm-tree-sub">▸ ${esc(s.icon)} ${esc(s.name)} <span class="adm-tree-n">${s.species.length} 物种</span></div>
      `).join("")}
    </div>`;
  }).join("");
}

function renderAdmVersions(){
  const box = document.getElementById("admVersions"); if(!box) return;
  box.innerHTML = S.versions.map((v, i) => `
    <div class="adm-item" data-vi="${i}">
      <div class="adm-item__head">
        <input class="adm-inline" placeholder="标题" value="${esc(v.title)}" data-vf="title">
        <input class="adm-inline adm-inline--s" placeholder="标签" value="${esc(v.tag)}" data-vf="tag">
        <input class="adm-inline adm-inline--s" placeholder="日期" value="${esc(v.date)}" data-vf="date">
        <span class="adm-move">
          <button class="btn btn--ghost btn--sm" data-vmove="up"${i===0?' disabled':''} title="上移">⬆</button>
          <button class="btn btn--ghost btn--sm" data-vmove="down"${i===S.versions.length-1?' disabled':''} title="下移">⬇</button>
        </span>
        <button class="btn btn--danger btn--sm" data-vdel>删除</button>
      </div>
      <textarea rows="4" placeholder="版本详细内容（点开活动图后显示）" data-vf="detail">${esc(v.detail)}</textarea>
      <div class="adm-item__foot">
        <button class="btn btn--ghost btn--sm" data-vup>上传活动图</button>
        <button class="btn btn--ghost btn--sm" data-vimgdel>清除活动图</button>
      </div>
    </div>`).join("");
  box.querySelectorAll("[data-vdel]").forEach(b => b.addEventListener("click", () => {
    S.versions.splice(+b.closest(".adm-item").dataset.vi, 1);
    renderAdmVersions(); renderVersions();
  }));
  box.querySelectorAll("[data-vup]").forEach(b => b.addEventListener("click", () => {
    const id = S.versions[+b.closest(".adm-item").dataset.vi].id;
    uploadToSlot("version:" + id, () => renderVersions());
  }));
  box.querySelectorAll("[data-vimgdel]").forEach(b => b.addEventListener("click", () => {
    const id = S.versions[+b.closest(".adm-item").dataset.vi].id;
    IMG.del("version:" + id).then(renderVersions);
  }));
  box.querySelectorAll("[data-vmove]").forEach(b => b.addEventListener("click", () => {
    collectAdmVersions();
    const i = +b.closest(".adm-item").dataset.vi;
    const dir = b.dataset.vmove;
    if(dir === "up" && i > 0){ const t = S.versions[i-1]; S.versions[i-1] = S.versions[i]; S.versions[i] = t; }
    else if(dir === "down" && i < S.versions.length - 1){ const t = S.versions[i+1]; S.versions[i+1] = S.versions[i]; S.versions[i] = t; }
    else return;
    renderAdmVersions(); renderVersions();
  }));
}
function collectAdmVersions(){
  document.querySelectorAll("#admVersions .adm-item").forEach(el => {
    const v = S.versions[+el.dataset.vi]; if(!v) return;
    el.querySelectorAll("[data-vf]").forEach(f => v[f.dataset.vf] = f.value.trim());
  });
}

function renderAdmCreators(){
  const box = document.getElementById("admCreators"); if(!box) return;
  box.innerHTML = S.creators.map((c, i) => `
    <div class="adm-item" data-ci="${i}">
      <div class="adm-item__head">
        <input class="adm-inline" placeholder="名字" value="${esc(c.name)}" data-cf="name">
        <input class="adm-inline adm-inline--s" placeholder="身份" value="${esc(c.role)}" data-cf="role">
        <button class="btn btn--danger btn--sm" data-cdel>删除</button>
      </div>
      <input class="adm-inline" placeholder="简介" value="${esc(c.desc)}" data-cf="desc">
      <input class="adm-inline" placeholder="主页链接 https://" value="${esc(c.link)}" data-cf="link">
    </div>`).join("");
  box.querySelectorAll("[data-cdel]").forEach(b => b.addEventListener("click", () => {
    S.creators.splice(+b.closest(".adm-item").dataset.ci, 1);
    renderAdmCreators(); renderCreators();
  }));
}
function collectAdmCreators(){
  document.querySelectorAll("#admCreators .adm-item").forEach(el => {
    const c = S.creators[+el.dataset.ci]; if(!c) return;
    el.querySelectorAll("[data-cf]").forEach(f => c[f.dataset.cf] = f.value.trim());
  });
}

function renderAdmSocial(){
  const box = document.getElementById("admSocial"); if(!box) return;
  box.innerHTML = S.social.map((s, i) => `
    <div class="adm-item" data-si="${i}">
      <div class="adm-item__head">
        <span class="adm-soc-ico">${socIcon(s.key)}</span>
        <input class="adm-inline adm-inline--s" placeholder="名称" value="${esc(s.name)}" data-sf="name">
        <input class="adm-inline" placeholder="链接 https://" value="${esc(s.url)}" data-sf="url">
        <button class="btn btn--danger btn--sm" data-sdel>删除</button>
      </div>
    </div>`).join("") + `<button class="btn btn--ghost btn--sm" id="admAddSocial">＋ 新增</button>`;
  box.querySelector("#admAddSocial").addEventListener("click", () => {
    S.social.push({ key:"forum", name:"新渠道", url:"#" });
    renderAdmSocial();
  });
  box.querySelectorAll("[data-sdel]").forEach(b => b.addEventListener("click", () => {
    S.social.splice(+b.closest(".adm-item").dataset.si, 1);
    renderAdmSocial();
  }));
}
function collectAdmSocial(){
  document.querySelectorAll("#admSocial .adm-item").forEach(el => {
    const s = S.social[+el.dataset.si]; if(!s) return;
    el.querySelectorAll("[data-sf]").forEach(f => s[f.dataset.sf] = f.value.trim());
  });
}