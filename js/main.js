/* =========================================================
   疯狂动物园 · 主交互
   图鉴数据来自全局 TAX（由 admin.js 加载/落盘），可自由增删改名。
   ========================================================= */

/* ---------- 小工具 ---------- */
let toastTimer;
function toast(msg){
  const t = document.getElementById("toast");
  t.textContent = msg; t.classList.add("show");
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => t.classList.remove("show"), 2600);
}

/* 社媒图标（简化品牌图形） */
function socIcon(key){
  const s = 'viewBox="0 0 24 24" fill="currentColor"';
  const map = {
    douyin:   `<svg ${s}><path d="M14 3h2.6c.3 2.2 1.7 3.7 3.9 4v2.6c-1.5 0-2.9-.4-4-1.2v6.3a5.6 5.6 0 1 1-5.6-5.6c.3 0 .7 0 1 .1v2.7a2.9 2.9 0 1 0 2 2.8V3z"/></svg>`,
    bilibili: `<svg ${s}><path d="M7.2 2.4 9 4.8h6l1.8-2.4 1.6 1.2-1.2 1.6h.3A3.5 3.5 0 0 1 21 8.7v7.8a3.5 3.5 0 0 1-3.5 3.5h-11A3.5 3.5 0 0 1 3 16.5V8.7a3.5 3.5 0 0 1 3.5-3.5h.3L5.6 3.6 7.2 2.4zM6.5 9.3a1.3 1.3 0 0 0-1.3 1.3v4.3a1.3 1.3 0 0 0 2.6 0v-4.3a1.3 1.3 0 0 0-1.3-1.3zm11 0a1.3 1.3 0 0 0-1.3 1.3v4.3a1.3 1.3 0 0 0 2.6 0v-4.3a1.3 1.3 0 0 0-1.3-1.3z"/></svg>`,
    xhs:      `<svg ${s}><path d="M6 2h12a2 2 0 0 1 2 2v16a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2zm1 3v2h4.2l-4 9 1.8.8 4-9V5H7zm6.6 9.2 1.4 1.4 1.4-1.4 1.4 1.4L16.4 17l1.4 1.4-1.4 1.4L15 18.4l-1.4 1.4-1.4-1.4L13.6 17l-1.4-1.4 1.4-1.4z"/></svg>`,
    ks:       `<svg ${s}><path d="M12 2a10 10 0 1 0 0 20 10 10 0 0 0 0-20zm-1.2 5.6 5.2 3.4a1.3 1.3 0 0 1 0 2.2l-5.2 3.4a1.3 1.3 0 0 1-2-1.1v-1.9l-2 1.3a1 1 0 0 1-1.1-1.7l3.1-2v-.4l-3.1-2a1 1 0 0 1 1.1-1.7l2 1.3V8.7a1.3 1.3 0 0 1 2-1.1z"/></svg>`,
    forum:    `<svg ${s}><path d="M4 3h16a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2H9.4L5 21v-4H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2zm3 5h10v2H7V8zm0 4h7v2H7v-2z"/></svg>`
  };
  return map[key] || map.forum;
}

/* ---------- Hero / 公告条 / 导航栏文字 ---------- */
function setText(elId, value){ const el = document.getElementById(elId); if(el) el.textContent = value ?? el.textContent; }
function setSetting(path, val){
  const p = path.split("."); let o = S;
  for(let i=0;i<p.length-1;i++) o = o[p[i]] || (o[p[i]] = {});
  o[p[p.length-1]] = val;
}
/* 编辑模式下给导航栏链接文字加一个 ✎ 改名按钮 */
function setNavLinkText(elId, value, key){
  const el = document.getElementById(elId); if(!el) return;
  el.textContent = value ?? el.textContent;
  if(EDIT){
    let nb = el.parentNode.querySelector(":scope > .nav-edit");
    if(!nb){
      nb = document.createElement("button");
      nb.className = "nav-edit"; nb.type = "button"; nb.textContent = "✎"; nb.title = "修改导航文字";
      nb.addEventListener("click", async (e) => {
        e.preventDefault(); e.stopPropagation();
        const v = await askText("修改导航文字", el.textContent);
        if(v != null){ setSetting(key, v); saveS(); renderHero(); }
      });
      el.insertAdjacentElement("afterend", nb);
    }
  } else {
    const nb = el.parentNode.querySelector(":scope > .nav-edit");
    if(nb) nb.remove();
  }
}
function renderHero(){
  document.getElementById("promoText").textContent = S.hero.promo;
  document.getElementById("navTitle").textContent = S.hero.title;
  document.getElementById("footerTitle").textContent = S.hero.title;
  document.getElementById("heroTitle").textContent = S.hero.title;
  document.getElementById("heroSub").textContent = S.hero.sub;
  document.title = S.hero.title + " · 官方玩家社区";
  setNavLinkText("navPromo", S.nav.promo, "nav.promo");
  setNavLinkText("navCreator", S.nav.creators, "nav.creators");
  setNavLinkText("navSocial", S.nav.social, "nav.social");
  setNavLinkText("navCheckin", S.nav.checkin || "到此一游", "nav.checkin");
  setText("secPromoTitle", S.nav.promo);
  setText("secCreTitle", S.nav.creators);
  setText("secSocTitle", S.nav.social);
}

/* ---------- 版本动态 ---------- */
function renderVersions(){
  const grid = document.getElementById("versionGrid");
  grid.innerHTML = S.versions.map((v, i) => `
    <article class="ver-card" data-vi="${i}">
      <div class="ver-card__media">
        <img data-slot="version:${esc(v.id)}" alt="${esc(v.title)}">
        ${EDIT ? `<button class="up-btn" data-upslot="version:${esc(v.id)}">⬆ 上传活动图</button>` : ""}
        <span class="ver-card__tag">${esc(v.tag)}</span>
      </div>
      <div class="ver-card__body">
        <h3>${esc(v.title)}</h3>
        <time>${esc(v.date)}</time>
        <span class="ver-card__more">查看详情 →</span>
      </div>
    </article>`).join("");
  grid.querySelectorAll(".ver-card").forEach(c => {
    c.addEventListener("click", () => openVersion(S.versions[+c.dataset.vi]));
    const up = c.querySelector("[data-upslot]");
    if(up) up.addEventListener("click", e => { e.stopPropagation(); uploadToSlot(up.dataset.upslot, renderVersions); });
  });
  applyImages(grid);
}

function openVersion(v){
  const body = document.getElementById("versionModalBody");
  body.innerHTML = `
    <div class="ver-detail__media"><img data-slot="version:${esc(v.id)}" alt=""></div>
    <div class="ver-detail__head">
      <h3>${esc(v.title)}</h3>
      <div><span class="ver-card__tag">${esc(v.tag)}</span> <time>${esc(v.date)}</time></div>
    </div>
    <pre class="ver-detail__text">${esc(v.detail)}</pre>`;
  openModal("versionModal");
  applyImages(body);
}

/* ---------- 图鉴（活数据 TAX） ---------- */
let curCatId = null, curSubId = null;
let batchDelMode = false;           /* 物种批量删除模式 */
const batchDelSel = new Set();      /* 待删除物种 id 集合 */
let vaBatchMode = false;            /* 物种弹窗内：个体批量删除模式 */
const vaBatchSel = new Set();       /* 待删除个体 id 集合 */

/* 从文件名取“名字”（去掉扩展名），用于上传图片时自动填充文字栏 */
function fileNameBase(name){
  return (name || "").replace(/\.[^.]+$/, "").trim() || "";
}

/* 数组内上移 / 下移：dir = "up" | "down"，按 id 定位，返回是否移动成功 */
function moveItem(arr, id, dir){
  const i = arr.findIndex(x => x.id === id);
  if(i < 0) return false;
  const j = dir === "up" ? i - 1 : i + 1;
  if(j < 0 || j >= arr.length) return false;
  const t = arr[i]; arr[i] = arr[j]; arr[j] = t;
  return true;
}

function curCat(){ return TAX.find(c => c.id === curCatId) || TAX[0]; }
/* 当前「物种容器」：普通分类返回当前下级分类；无下级分类的分类（传奇/VIP）直接返回分类本身 */
function curSub(){
  const c = curCat();
  if(c.subs && c.subs.length) return c.subs.find(s => s.id === curSubId) || c.subs[0];
  return c;
}
/* 选中首个分类并重置当前下级分类（兼容无下级分类的分类） */
function resetCur(){
  const c = TAX[0];
  curCatId = c.id;
  curSubId = (c.subs && c.subs.length) ? c.subs[0].id : null;
}

function renderCatTabs(){
  const box = document.getElementById("catTabs");
  const c = curCat();
  box.innerHTML = TAX.map(cat => `
    <button class="cat-tab ${cat.id === curCatId ? "is-active" : ""}" data-cat="${cat.id}">
      <span class="cat-tab__icon">${cat.icon}</span>${esc(cat.name)}
      <span class="cat-tab__n">${cat.subs.length ? cat.subs.length + " 区域" : (cat.species ? cat.species.length : 0) + " 物种"}</span>
      ${EDIT ? `<span class="row-tools">
        <button class="row-btn" data-act="ordCat" data-dir="up" data-id="${cat.id}" title="上移">↑</button>
        <button class="row-btn" data-act="ordCat" data-dir="down" data-id="${cat.id}" title="下移">↓</button>
        <button class="row-btn" data-act="renCat" data-id="${cat.id}" title="改名">✎</button>
        <button class="row-btn row-btn--del" data-act="delCat" data-id="${cat.id}" title="删除分类">🗑</button>
      </span>` : ""}
    </button>`).join("") +
    (EDIT ? `<button class="cat-tab cat-tab--add" data-act="addCat">＋ 分类</button>` : "");
  box.querySelectorAll(".cat-tab").forEach(b => {
    if(b.dataset.cat){
      b.addEventListener("click", () => {
        curCatId = b.dataset.cat;
        const c = TAX.find(x => x.id === curCatId);
        curSubId = (c.subs && c.subs.length) ? c.subs[0].id : null;
        batchDelSel.clear();
        renderCatTabs(); renderSubTabs(); renderSpecies();
      });
    }
  });
  box.querySelectorAll("[data-act]").forEach(b => b.addEventListener("click", e => {
    e.stopPropagation(); codexAction(b.dataset.act, b.dataset.id, null, b.dataset.dir);
  }));
}

function renderSubTabs(){
  const box = document.getElementById("subTabs");
  const c = curCat();
  if(!c.subs || !c.subs.length){
    box.innerHTML = `<div class="sub-note">该分类直接展示物种，无下级分类</div>`;
    return;
  }
  box.innerHTML = c.subs.map(s => `
    <button class="chip ${s.id === curSubId ? "is-active" : ""}" data-sub="${s.id}">
      ${s.icon} ${esc(s.name)}
      ${EDIT ? `<span class="row-tools">
        <button class="row-btn" data-act="ordSub" data-dir="up" data-id="${s.id}">↑</button>
        <button class="row-btn" data-act="ordSub" data-dir="down" data-id="${s.id}">↓</button>
        <button class="row-btn" data-act="renSub" data-id="${s.id}">✎</button>
        <button class="row-btn row-btn--del" data-act="delSub" data-id="${s.id}">🗑</button>
      </span>` : ""}
    </button>`).join("") +
    (EDIT ? `<button class="chip chip--add" data-act="addSub" data-cat="${c.id}">＋ 下级分类</button>` : "");
  box.querySelectorAll(".chip").forEach(b => {
    if(b.dataset.sub){
      b.addEventListener("click", () => {
        curSubId = b.dataset.sub;
        batchDelSel.clear();
        renderSubTabs(); renderSpecies();
      });
    }
  });
  box.querySelectorAll("[data-act]").forEach(b => b.addEventListener("click", e => {
    e.stopPropagation(); codexAction(b.dataset.act, b.dataset.id, b.dataset.cat, b.dataset.dir);
  }));
}

function renderSpecies(){
  const grid = document.getElementById("speciesGrid");
  const sub = curSub();
  const inBatch = EDIT && batchDelMode;
  grid.innerHTML = sub.species.map(sp => {
    const sel = batchDelSel.has(sp.id);
    const lightbox = inBatch ? "" : `data-lightbox-slot="${spSlot(sp.id)}" data-lightbox-cap="${esc(sub.name)} · ${esc(sp.name)}"`;
    const tools = inBatch
      ? `<label class="sp-check"><input type="checkbox" data-batch-check="${sp.id}" ${sel ? "checked" : ""}><span>选择</span></label>`
      : (EDIT ? `<div class="sp-card__tools">
          <button class="up-btn up-btn--sm" data-upslot="${spSlot(sp.id)}">⬆封面</button>
          <button class="up-btn up-btn--sm" data-batch="${sp.id}">⬆批量图</button>
          <button class="up-btn up-btn--sm" data-move="${sp.id}">🚚移动</button>
          <button class="row-btn" data-act="ordSp" data-dir="up" data-id="${sp.id}" title="上移">↑</button>
          <button class="row-btn" data-act="ordSp" data-dir="down" data-id="${sp.id}" title="下移">↓</button>
          <button class="row-btn row-btn--del" data-act="delSp" data-id="${sp.id}">🗑</button>
        </div>` : "");
    const nameEl = (EDIT && !inBatch)
      ? `<input class="sp-card__name sp-card__name--edit" data-rename-sp="${sp.id}" value="${esc(sp.name)}">`
      : `<div class="sp-card__name">${esc(sp.name)}</div>`;
    return `
    <div class="sp-card ${sel ? "is-sel" : ""}" data-sp="${sp.id}">
      <div class="sp-card__media" ${lightbox}>
        <img data-slot="${spSlot(sp.id)}" alt="${esc(sp.name)}">
        <span class="sp-card__icon">${sub.icon}</span>
        ${tools}
      </div>
      ${nameEl}
      <span class="sp-card__count">${sp.variants.length} 种个体</span>
    </div>`;
  }).join("") +
    (EDIT && !inBatch ? `<button class="sp-card sp-card--add" data-act="addSp" data-sub="${sub.id}">＋ 添加物种</button>` : "");

  grid.querySelectorAll(".sp-card").forEach(c => {
    if(!c.dataset.sp) return;
    if(inBatch){
      c.addEventListener("click", () => {
        const id = c.dataset.sp;
        const on = !batchDelSel.has(id);
        if(on) batchDelSel.add(id); else batchDelSel.delete(id);
        c.classList.toggle("is-sel", on);
        const cb = c.querySelector("[data-batch-check]");
        if(cb) cb.checked = on;
        renderBatchBar();
      });
      return;
    }
    c.addEventListener("click", e => {
      if(e.target.closest("[data-upslot],[data-batch],[data-act],[data-rename-sp]")) return;
      const sp = curSub().species.find(p => p.id === c.dataset.sp);
      openSpecies(curCat(), curSub(), sp);
    });
    const up = c.querySelector("[data-upslot]");
    if(up) up.addEventListener("click", e => { e.stopPropagation(); uploadToSlot(up.dataset.upslot, renderSpecies); });
    const batch = c.querySelector("[data-batch]");
    if(batch) batch.addEventListener("click", e => { e.stopPropagation(); batchUploadToSpecies(batch.dataset.batch); });
    const ren = c.querySelector("[data-rename-sp]");
    if(ren) ren.addEventListener("change", () => {
      const sp = curSub().species.find(p => p.id === ren.dataset.renameSp);
      if(sp){ sp.name = ren.value.trim() || sp.name; saveTax(); renderSpecies(); }
    });
    const mv = c.querySelector("[data-move]");
    if(mv) mv.addEventListener("click", e => {
      e.stopPropagation();
      const sp2 = curSub().species.find(p => p.id === mv.dataset.move);
      if(sp2) openMoveSpecies(curCat(), curSub(), sp2);
    });
  });
  grid.querySelectorAll("[data-act]").forEach(b => b.addEventListener("click", e => {
    e.stopPropagation(); codexAction(b.dataset.act, b.dataset.id, b.dataset.sub, b.dataset.dir);
  }));
  applyImages(grid);
  renderBatchBar();
}

/* 物种批量删除工具条（位于图鉴物种区上方） */
function renderBatchBar(){
  const bar = document.getElementById("spBatchBar");
  if(!bar) return;
  if(!EDIT){ batchDelMode = false; batchDelSel.clear(); bar.classList.add("is-hidden"); bar.innerHTML = ""; return; }
  bar.classList.remove("is-hidden");
  if(batchDelMode){
    bar.innerHTML = `
      <span class="sp-batchbar__t">批量删除模式：点击或勾选要删除的物种</span>
      <span class="sp-batchbar__n">已选 ${batchDelSel.size} 个</span>
      <button class="btn btn--danger btn--sm" id="spBatchDelBtn">删除选中</button>
      <button class="btn btn--ghost btn--sm" id="spBatchCancelBtn">退出</button>`;
    bar.querySelector("#spBatchDelBtn").addEventListener("click", () => {
      const sub = curSub();
      const ids = [...batchDelSel];
      if(!ids.length){ toast("请先勾选要删除的物种"); return; }
      askConfirm(`确定删除选中的 ${ids.length} 个物种及其全部个体图片？`).then(ok => {
        if(!ok) return;
        ids.forEach(id => {
          const sp = sub.species.find(p => p.id === id);
          if(sp){ sp.variants.forEach(v => IMG.del(varSlot(v.id))); IMG.del(spSlot(sp.id)); }
        });
        sub.species = sub.species.filter(p => !batchDelSel.has(p.id));
        batchDelSel.clear(); batchDelMode = false;
        saveTax(); renderSpecies();
        toast(`已删除 ${ids.length} 个物种`);
      });
    });
    bar.querySelector("#spBatchCancelBtn").addEventListener("click", () => {
      batchDelMode = false; batchDelSel.clear(); renderSpecies();
    });
  } else {
    bar.innerHTML = `<button class="btn btn--ghost btn--sm" id="spBatchToggleBtn">批量删除物种</button>`;
    bar.querySelector("#spBatchToggleBtn").addEventListener("click", () => {
      batchDelMode = true; batchDelSel.clear(); renderSpecies();
    });
  }
}

function openSpecies(cat, sub, sp){
  const body = document.getElementById("speciesModalBody");
  const inVaBatch = EDIT && vaBatchMode;
  body.innerHTML = `
    <div class="sp-head">
      <div class="sp-head__media" data-lightbox-slot="${spSlot(sp.id)}" data-lightbox-cap="${esc(sub.name)} · ${esc(sp.name)}">
        <img data-slot="${spSlot(sp.id)}" alt="">
        <span>${sub.icon}</span>
      </div>
      <div class="sp-head__info">
        ${EDIT
          ? `<input class="sp-rename" data-rename-sp="${sp.id}" value="${esc(sp.name)}">`
          : `<h3>${esc(sp.name)}</h3>`}
        <div class="sp-head__meta">
          <span class="card__tag">${sub.icon} ${esc(sub.name)}</span>
          <span class="card__tag">${cat.icon} ${esc(cat.name)}</span>
          <span>共 ${sp.variants.length} 种个体</span>
        </div>
        ${EDIT ? `<div class="sp-head__tools">
          <button class="btn btn--ghost btn--sm" data-upslot="${spSlot(sp.id)}">⬆ 上传封面</button>
          <button class="btn btn--ghost btn--sm" data-act="batchSp" data-id="${sp.id}">⬆ 批量上传图片</button>
          <button class="btn btn--ghost btn--sm" id="moveSpBtn">🚚 移动到</button>
          <button class="btn btn--ghost btn--sm" id="vaBatchToggleBtn">批量删除个体</button>
          <button class="btn btn--danger btn--sm" data-act="delSp" data-id="${sp.id}">🗑 删除物种</button>
        </div>` : ""}
      </div>
    </div>
    <div class="va-batchbar is-hidden" id="vaBatchBar"></div>
    <div class="v-grid">
      ${sp.variants.map(v => {
        const sel = vaBatchSel.has(v.id);
        const tools = inVaBatch
          ? `<label class="sp-check"><input type="checkbox" data-va-check="${v.id}" ${sel ? "checked" : ""}><span>选择</span></label>`
            : (EDIT ? `<div class="v-card__tools">
              <button class="up-btn up-btn--sm" data-ordva="up" data-vid="${v.id}" title="上移">↑</button>
              <button class="up-btn up-btn--sm" data-ordva="down" data-vid="${v.id}" title="下移">↓</button>
              <button class="up-btn up-btn--sm" data-moveva="${v.id}" title="移动到其他物种">🚚</button>
              <button class="up-btn up-btn--sm" data-upslot="${varSlot(v.id)}">⬆</button>
              <button class="v-del" data-act="delVa" data-id="${v.id}">🗑</button>
            </div>` : "");
        const nameEl = (EDIT && !inVaBatch)
          ? `<input class="v-name-input" data-rename-va="${v.id}" value="${esc(v.name)}">`
          : `<div class="v-name">${esc(v.name)}</div>`;
        return `
        <div class="v-card r-${v.rarity} ${sel ? "is-sel" : ""}" data-va="${v.id}">
          <div class="v-card__media" ${inVaBatch ? "" : `data-lightbox-slot="${varSlot(v.id)}" data-lightbox-cap="${esc(v.name)}"`}>
            <img data-slot="${varSlot(v.id)}" alt="${esc(v.name)}">
            <span class="v-card__ph">${esc(sp.name)}</span>
            ${tools}
          </div>
          <span class="v-rarity r-${v.rarity}">${RARITY_LABEL[v.rarity]}</span>
          ${nameEl}
        </div>`;
      }).join("")}
    </div>
    ${EDIT && !inVaBatch ? `<button class="btn btn--primary btn--sm" data-act="addVa" data-id="${sp.id}">＋ 添加个体（单张图片）</button>` : ""}`;

  /* 灯箱 */
  body.querySelectorAll("[data-lightbox-slot]").forEach(el =>
    el.addEventListener("click", e => {
      if(e.target.closest("[data-upslot],[data-act],[data-rename-va],[data-ordva],[data-moveva]")) return;
      openLightbox(el.dataset.lightboxSlot, el.dataset.lightboxCap);
    }));
  /* 上传个体图 */
  body.querySelectorAll("[data-upslot]").forEach(b =>
    b.addEventListener("click", e => { e.stopPropagation(); uploadToSlot(b.dataset.upslot, () => applyImages(body)); }));
  /* 个体改名 */
  body.querySelectorAll("[data-rename-va]").forEach(inp =>
    inp.addEventListener("change", () => {
      const v = sp.variants.find(x => x.id === inp.dataset.renameVa);
      if(v){ v.name = inp.value.trim() || v.name; saveTax(); refreshSpeciesMeta(); }
    }));
  /* 物种改名（模态内） */
  const rsp = body.querySelector("[data-rename-sp]");
  if(rsp) rsp.addEventListener("change", () => {
    sp.name = rsp.value.trim() || sp.name; saveTax(); renderSpecies();
  });
  /* 各类增删 */
  body.querySelectorAll("[data-act]").forEach(b =>
    b.addEventListener("click", e => { e.stopPropagation(); codexAction(b.dataset.act, b.dataset.id); }));

  /* 个体批量删除入口 */
  const vaToggle = body.querySelector("#vaBatchToggleBtn");
  if(vaToggle) vaToggle.addEventListener("click", () => { vaBatchMode = true; vaBatchSel.clear(); openSpecies(cat, sub, sp); });
  /* 移动物种入口 */
  const moveBtn = body.querySelector("#moveSpBtn");
  if(moveBtn) moveBtn.addEventListener("click", () => openMoveSpecies(cat, sub, sp));
  /* 个体上移 / 下移 */
  body.querySelectorAll("[data-ordva]").forEach(b =>
    b.addEventListener("click", e => {
      e.stopPropagation();
      const v = sp.variants.find(x => x.id === b.dataset.vid);
      if(!v) return;
      if(moveItem(sp.variants, v.id, b.dataset.ordva)){ saveTax(); openSpecies(cat, sub, sp); }
    }));
  /* 个体移动到其他物种 */
  body.querySelectorAll("[data-moveva]").forEach(b =>
    b.addEventListener("click", e => {
      e.stopPropagation();
      const v = sp.variants.find(x => x.id === b.dataset.moveva);
      if(v) openMoveVariant(cat, sub, sp, v);
    }));
  renderVaBatchBar(cat, sub, sp, body);

  openModal("speciesModal");
  applyImages(body);
}

/* 物种弹窗内：个体批量删除工具条（仅编辑模式出现） */
function renderVaBatchBar(cat, sub, sp, body){
  const bar = document.getElementById("vaBatchBar");
  if(!bar) return;
  if(!EDIT){ vaBatchMode = false; vaBatchSel.clear(); bar.classList.add("is-hidden"); bar.innerHTML = ""; return; }
  bar.classList.remove("is-hidden");
  if(vaBatchMode){
    bar.innerHTML = `
      <span class="sp-batchbar__t">批量删除个体：点击卡片或勾选要删除的个体</span>
      <span class="sp-batchbar__n">已选 ${vaBatchSel.size} 个</span>
      <button class="btn btn--danger btn--sm" id="vaBatchDelBtn">删除选中</button>
      <button class="btn btn--ghost btn--sm" id="vaBatchCancelBtn">退出</button>`;
    bar.querySelector("#vaBatchDelBtn").addEventListener("click", () => {
      const ids = [...vaBatchSel];
      if(!ids.length){ toast("请先勾选要删除的个体"); return; }
      askConfirm(`确定删除选中的 ${ids.length} 个个体及其图片？`).then(ok => {
        if(!ok) return;
        ids.forEach(id => {
          const v = sp.variants.find(x => x.id === id);
          if(v) IMG.del(varSlot(v.id));
        });
        sp.variants = sp.variants.filter(x => !vaBatchSel.has(x.id));
        vaBatchSel.clear(); vaBatchMode = false;
        saveTax(); openSpecies(cat, sub, sp);
        toast(`已删除 ${ids.length} 个个体`);
      });
    });
    bar.querySelector("#vaBatchCancelBtn").addEventListener("click", () => {
      vaBatchMode = false; vaBatchSel.clear(); openSpecies(cat, sub, sp);
    });
    body.querySelectorAll(".v-card").forEach(card => {
      if(!card.dataset.va) return;
      card.addEventListener("click", () => {
        const id = card.dataset.va;
        const on = !vaBatchSel.has(id);
        if(on) vaBatchSel.add(id); else vaBatchSel.delete(id);
        card.classList.toggle("is-sel", on);
        const cb = card.querySelector("[data-va-check]");
        if(cb) cb.checked = on;
        const n = bar.querySelector(".sp-batchbar__n");
        if(n) n.textContent = `已选 ${vaBatchSel.size} 个`;
      });
    });
  } else {
    bar.innerHTML = "";
  }
}
/* 模态内改名后，刷新父物种的数量角标 */
function refreshSpeciesMeta(){
  const sub = curSub();
  renderSpecies();
}

/* ---------- 图鉴增删改名（编辑模式核心） ---------- */
function codexAction(act, id, extra, dir){
  switch(act){
    case "addCat": askText("新增分类名称", "新分类").then(name => {
      if(!name) return;
      const cat = { id: uid("cat_"), name, icon:"🗂️", subs:[
        { id: uid("sub_"), name:"新区域", icon:"📁", species:[] }
      ]};
      TAX.push(cat); curCatId = cat.id; curSubId = cat.subs[0].id;
      saveTax(); renderCatTabs(); renderSubTabs(); renderSpecies();
    }); break;
    case "renCat": { const c = TAX.find(x=>x.id===id); askText("修改分类名称", c.name).then(n => {
      if(n){ c.name = n; saveTax(); renderCatTabs(); renderHero(); }
    }); break; }
    case "delCat": { const c = TAX.find(x=>x.id===id); askConfirm(`确定删除分类「${c.name}」及其全部下级分类、物种与图片？`).then(ok => {
      if(!ok) return;
      c.subs.forEach(s=>s.species.forEach(p=>p.variants.forEach(v=>IMG.del(varSlot(v.id)))));
      (c.species||[]).forEach(p=>p.variants.forEach(v=>IMG.del(varSlot(v.id))));
      TAX = TAX.filter(x=>x.id!==id); if(!TAX.length) TAX = defaultTaxonomy();
      resetCur();
      saveTax(); renderCatTabs(); renderSubTabs(); renderSpecies();
    }); break; }

    /* ---------- 层级排序（上下移动） ---------- */
    case "ordCat": {
      if(moveItem(TAX, id, dir)){ saveTax(); renderCatTabs(); updateCodexDesc(); }
      break;
    }
    case "ordSub": {
      const c = TAX.find(x=>x.id===curCatId);
      if(c && moveItem(c.subs, id, dir)){ saveTax(); renderSubTabs(); renderSpecies(); updateCodexDesc(); }
      break;
    }
    case "ordSp": {
      const sub = curSub();
      if(sub && moveItem(sub.species, id, dir)){ saveTax(); renderSpecies(); updateCodexDesc(); }
      break;
    }

    case "addSub": askText("新增下级分类名称", "新区域").then(name => {
      if(!name) return; const c = TAX.find(x=>x.id===extra);
      const sub = { id: uid("sub_"), name, icon:"📁", species:[] };
      c.subs.push(sub); curSubId = sub.id;
      saveTax(); renderCatTabs(); renderSubTabs(); renderSpecies();
    }); break;
    case "renSub": { const c = TAX.find(x=>x.id===curCatId); const s = c.subs.find(y=>y.id===id);
      askText("修改下级分类名称", s.name).then(n => { if(n){ s.name = n; saveTax(); renderSubTabs(); renderSpecies(); } }); break; }
    case "delSub": { const c = TAX.find(x=>x.id===curCatId); const s = c.subs.find(y=>y.id===id);
      askConfirm(`确定删除「${s.name}」及其全部物种与图片？`).then(ok => {
        if(!ok) return; s.species.forEach(p=>p.variants.forEach(v=>IMG.del(varSlot(v.id))));
        c.subs = c.subs.filter(y=>y.id!==id); if(!c.subs.length) c.subs.push({id:uid("sub_"),name:"新区域",icon:"📁",species:[]});
        curSubId = c.subs[0].id; saveTax(); renderCatTabs(); renderSubTabs(); renderSpecies();
      }); break; }

    case "addSp": askText("新增物种名称", "新物种").then(name => {
      if(!name) return; const sub = curSub();
      const sp = { id: uid("sp_"), name, variants:[] };
      sub.species.push(sp); saveTax(); renderSpecies();
    }); break;
    case "delSp": { const sub = curSub(); const sp = sub.species.find(p=>p.id===id);
      askConfirm(`确定删除物种「${sp.name}」及其全部个体图片？`).then(ok => {
        if(!ok) return; sp.variants.forEach(v=>IMG.del(varSlot(v.id))); IMG.del(spSlot(sp.id));
        sub.species = sub.species.filter(p=>p.id!==id); saveTax(); renderSpecies(); closeModals();
      }); break; }

    case "addVa": pickFiles("image/*", true).then(files => { if(files && files[0]) addVariant(id, files[0]); }); break;
    case "delVa": { const sp = findSpeciesOfVariant(id);
      if(!sp) return; const v = sp.variants.find(x => x.id === id); if(!v) return;
      askConfirm(`删除个体「${v.name}」？`).then(ok => {
        if(!ok) return; IMG.del(varSlot(v.id));
        sp.variants = sp.variants.filter(x => x.id !== id);
        saveTax(); openSpecies(curCat(), curSub(), sp);
      }); break; }
    case "batchSp": batchUploadToSpecies(id); break;
  }
}

/* 按个体 id 反查所属物种 */
function findSpeciesOfVariant(vid){
  for(const c of TAX){
    const list = [ ...(c.subs||[]).flatMap(s => s.species), ...(c.species||[]) ];
    for(const p of list) if(p.variants.some(v => v.id === vid)) return p;
  }
  return null;
}

/* 添加单个个体（单张图片） */
function addVariant(spId, file){
  const sp = findSpeciesById(spId);
  if(!sp) return;
  const id = uid("va_");
  sp.variants.push({ id, name: fileNameBase(file.name) || `个体${sp.variants.length + 1}`, rarity: "common" });
  saveTax();
  IMG.set(varSlot(id), file).then(() => { openSpecies(curCat(), curSub(), sp); toast("已添加个体"); });
}

function findSpeciesById(spId){
  for(const c of TAX){
    const list = [ ...(c.subs||[]).flatMap(s => s.species), ...(c.species||[]) ];
    for(const p of list) if(p.id === spId) return p;
  }
  return null;
}

/* ---------- 移动物种到其他飞船 / 分类 ---------- */
let moveCtx = null;
function findSpeciesLocation(spId){
  for(const c of TAX){
    if(c.subs && c.subs.length){
      for(const s of c.subs){
        const p = s.species.find(x => x.id === spId);
        if(p) return { cat:c, sub:s, sp:p };
      }
    }
    if(c.species){
      const p = c.species.find(x => x.id === spId);
      if(p) return { cat:c, sub:null, sp:p };
    }
  }
  return null;
}
function populateMoveSubs(catId){
  populateSubsInto(document.getElementById("moveSubSel"), catId);
}
function populateSubsInto(sel, catId){
  const c = TAX.find(x => x.id === catId);
  if(!c.subs || !c.subs.length){ sel.innerHTML = ""; return; }
  sel.innerHTML = c.subs.map(s => `<option value="${s.id}">${s.icon||""} ${esc(s.name)}</option>`).join("");
}
/* 填充某分类+下级下的物种下拉（用于移动个体弹窗） */
function populateVaSpecies(catId, subId){
  const sel = document.getElementById("moveVaSpSel");
  const c = TAX.find(x => x.id === catId);
  let species = [];
  if(c.subs && c.subs.length){
    const s = (subId && c.subs.find(y => y.id === subId)) || c.subs[0];
    if(s) species = s.species;
  } else {
    species = c.species || [];
  }
  sel.innerHTML = species.map(p => `<option value="${p.id}">${esc(p.name)}（${p.variants.length} 个体）</option>`).join("");
}
function openMoveSpecies(cat, sub, sp){
  if(!EDIT) return;
  moveCtx = { spId: sp.id };
  document.getElementById("moveSpName").textContent = `将「${sp.name}」移动到：`;
  const catSel = document.getElementById("moveCatSel");
  catSel.innerHTML = TAX.map(c => `<option value="${c.id}">${c.icon||""} ${esc(c.name)}</option>`).join("");
  catSel.value = cat.id;
  const isFlat = !(cat.subs && cat.subs.length);
  const subWrap = document.getElementById("moveSubWrap");
  if(isFlat){
    subWrap.style.display = "none";
  } else {
    subWrap.style.display = "";
    populateMoveSubs(cat.id);
    const subSel = document.getElementById("moveSubSel");
    subSel.value = (sub && sub.id !== cat.id) ? sub.id : (cat.subs[0] ? cat.subs[0].id : "");
  }
  openModal("moveSpModal");
}
function moveSpecies(spId, toCatId, toSubId){
  const loc = findSpeciesLocation(spId);
  if(!loc) return;
  const toCat = TAX.find(c => c.id === toCatId);
  if(!toCat) return;
  const same = loc.cat.id === toCatId && (loc.sub ? loc.sub.id === toSubId : !toSubId);
  if(same){ toast("已在目标位置"); closeModals(); return; }
  if(loc.sub){ loc.sub.species = loc.sub.species.filter(p => p.id !== spId); }
  else { loc.cat.species = (loc.cat.species || []).filter(p => p.id !== spId); }
  const target = toSubId ? toCat.subs.find(s => s.id === toSubId) : toCat;
  if(!target) return;
  if(!target.species) target.species = [];
  target.species.push(loc.sp);
  saveTax();
  const dest = toCat.icon + " " + toCat.name + (toSubId ? " / " + toCat.subs.find(s => s.id === toSubId).name : "");
  toast(`已移动「${loc.sp.name}」到 ${dest}`);
  closeModals();
  curCatId = toCatId; curSubId = toSubId || null;
  renderCatTabs(); renderSubTabs(); renderSpecies(); updateCodexDesc();
}

/* ---------- 移动个体到其他物种 ---------- */
let moveVaCtx = null;
function openMoveVariant(cat, sub, sp, v){
  if(!EDIT) return;
  moveVaCtx = { vid: v.id, fromSpId: sp.id };
  document.getElementById("moveVaName").textContent = `将个体「${v.name}」（物种：${sp.name}）移动到：`;
  const catSel = document.getElementById("moveVaCatSel");
  catSel.innerHTML = TAX.map(c => `<option value="${c.id}">${c.icon||""} ${esc(c.name)}</option>`).join("");
  catSel.value = cat.id;
  const subWrap = document.getElementById("moveVaSubWrap");
  const subId = (sub && sub.id !== cat.id) ? sub.id : (cat.subs && cat.subs[0] ? cat.subs[0].id : null);
  if(cat.subs && cat.subs.length){
    subWrap.style.display = "";
    populateSubsInto(document.getElementById("moveVaSubSel"), cat.id);
    document.getElementById("moveVaSubSel").value = subId || "";
  } else {
    subWrap.style.display = "none";
  }
  populateVaSpecies(cat.id, subId);
  openModal("moveVaModal");
}
function moveVariant(vid, toCatId, toSubId, toSpId){
  const from = findSpeciesOfVariant(vid);
  if(!from) return;
  const toCat = TAX.find(c => c.id === toCatId);
  if(!toCat) return;
  const target = toSubId ? toCat.subs.find(s => s.id === toSubId) : toCat;
  if(!target || !target.species) return;
  const toSp = target.species.find(p => p.id === toSpId);
  if(!toSp) return;
  if(from.id === toSpId){ toast("已是该物种"); closeModals(); return; }
  const v = from.variants.find(x => x.id === vid);
  if(!v) return;
  from.variants = from.variants.filter(x => x.id !== vid);
  toSp.variants.push(v);
  saveTax();
  const dest = toCat.icon + " " + toCat.name + (toSubId ? " / " + toCat.subs.find(s => s.id === toSubId).name : "") + " · " + toSp.name;
  toast(`已移动个体「${v.name}」到 ${dest}`);
  const loc = findSpeciesLocation(from.id);
  closeModals();
  renderCatTabs(); renderSubTabs(); renderSpecies(); updateCodexDesc();
  if(loc) openSpecies(loc.cat, loc.sub, from);
}
function closeMoveModal(){
  const m = document.getElementById("moveSpModal");
  m.classList.remove("is-open"); m.setAttribute("aria-hidden", "true");
  moveCtx = null;
}
document.getElementById("moveCatSel").addEventListener("change", e => {
  const c = TAX.find(x => x.id === e.target.value);
  const subWrap = document.getElementById("moveSubWrap");
  if(c.subs && c.subs.length){ subWrap.style.display = ""; populateMoveSubs(c.id); }
  else subWrap.style.display = "none";
});
document.getElementById("moveSpConfirm").addEventListener("click", () => {
  if(!moveCtx) return;
  const spId = moveCtx.spId;
  const toCatId = document.getElementById("moveCatSel").value;
  const c = TAX.find(x => x.id === toCatId);
  const toSubId = (c.subs && c.subs.length) ? document.getElementById("moveSubSel").value : null;
  moveCtx = null;
  moveSpecies(spId, toCatId, toSubId);
});
document.querySelectorAll("#moveSpModal [data-ms-close]").forEach(el =>
  el.addEventListener("click", closeMoveModal));

/* ---------- 移动个体弹窗：分类/下级/物种 联动 ---------- */
document.getElementById("moveVaCatSel").addEventListener("change", e => {
  const c = TAX.find(x => x.id === e.target.value);
  const subWrap = document.getElementById("moveVaSubWrap");
  if(c.subs && c.subs.length){
    subWrap.style.display = "";
    populateSubsInto(document.getElementById("moveVaSubSel"), c.id);
    populateVaSpecies(c.id, c.subs[0] ? c.subs[0].id : null);
  } else {
    subWrap.style.display = "none";
    populateVaSpecies(c.id, null);
  }
});
document.getElementById("moveVaSubSel").addEventListener("change", e => {
  const c = TAX.find(x => x.id === document.getElementById("moveVaCatSel").value);
  populateVaSpecies(c.id, e.target.value);
});
document.getElementById("moveVaConfirm").addEventListener("click", () => {
  if(!moveVaCtx) return;
  const vid = moveVaCtx.vid;
  const toCatId = document.getElementById("moveVaCatSel").value;
  const c = TAX.find(x => x.id === toCatId);
  const toSubId = (c.subs && c.subs.length) ? document.getElementById("moveVaSubSel").value : null;
  const toSpId = document.getElementById("moveVaSpSel").value;
  moveVaCtx = null;
  moveVariant(vid, toCatId, toSubId, toSpId);
});
document.querySelectorAll("#moveVaModal [data-mv-close]").forEach(el =>
  el.addEventListener("click", () => {
    const m = document.getElementById("moveVaModal");
    m.classList.remove("is-open"); m.setAttribute("aria-hidden", "true");
    moveVaCtx = null;
  }));

/* 批量上传到某物种：传什么图就生成什么个体，名字自动取图片文件名，不再要求文件名匹配 */
async function batchUploadToSpecies(spId){
  const sp = findSpeciesById(spId);
  if(!sp) return;
  const files = await pickFiles("image/*", true);
  if(!files || !files.length) return;
  const total = files.length;
  toast(`正在导入 ${total} 张图片…`);
  for(let i = 0; i < files.length; i++){
    const id = uid("va_");
    sp.variants.push({ id, name: fileNameBase(files[i].name) || `个体${sp.variants.length + 1}`, rarity: "common" });
    await IMG.set(varSlot(id), files[i]);
  }
  saveTax();
  openSpecies(curCat(), curSub(), sp);
  toast(`已为「${sp.name}」添加 ${total} 个个体（名字取自图片文件名）`);
}

/* ---------- 宣传图轮播（原「壁纸」） ---------- */
let carIdx = 0, carTimer;
function renderPosters(){
  const track = document.getElementById("carTrack");
  const dots = document.getElementById("carDots");
  track.innerHTML = S.posters.map((w, i) => `
    <div class="car-slide">
      <img data-slot="poster:${i}" alt="${esc(w.title)}">
      <div class="car-slide__cap">${esc(w.title)}</div>
      ${EDIT ? `<button class="up-btn" data-upslot="poster:${i}">⬆ 上传宣传图</button>` : ""}
    </div>`).join("");
  dots.innerHTML = S.posters.map((_, i) =>
    `<button class="car-dot ${i === carIdx ? "is-active" : ""}" data-i="${i}" aria-label="第 ${i+1} 张"></button>`).join("");
  dots.querySelectorAll(".car-dot").forEach(d =>
    d.addEventListener("click", () => { carGo(+d.dataset.i); restartCar(); }));
  track.querySelectorAll("[data-upslot]").forEach(b =>
    b.addEventListener("click", e => { e.stopPropagation(); uploadToSlot(b.dataset.upslot, renderPosters); }));
  track.parentElement.addEventListener("click", e => {
    const img = e.target.closest(".car-slide")?.querySelector("img[data-slot]");
    if(img && img.src && !e.target.closest("[data-upslot]"))
      openLightbox(img.dataset.slot, img.alt);
  });
  applyImages(track);
  carGo(carIdx);
}
function carGo(i){
  const n = S.posters.length || 1;
  carIdx = ((i % n) + n) % n;
  document.getElementById("carTrack").style.transform = `translateX(-${carIdx * 100}%)`;
  document.querySelectorAll(".car-dot").forEach((d, j) => d.classList.toggle("is-active", j === carIdx));
}
function restartCar(){
  clearInterval(carTimer);
  carTimer = setInterval(() => carGo(carIdx + 1), 5000);
}

/* ---------- 创作者 ---------- */
function renderCreators(){
  const grid = document.getElementById("creatorGrid");
  grid.innerHTML = S.creators.map(c => {
    const target = /^https?:/.test(c.link) ? ' target="_blank" rel="noopener"' : "";
    return `
    <a class="creator-card" href="${esc(c.link)}"${target}>
      <div class="creator-card__ava">${esc((c.name || "?").slice(0, 1))}</div>
      <div class="creator-card__body">
        <div class="creator-card__name">${esc(c.name)}</div>
        <span class="creator-card__role">${esc(c.role)}</span>
        <p>${esc(c.desc)}</p>
      </div>
    </a>`;
  }).join("");
}

/* ---------- 社区社媒 ---------- */
function renderSocial(){
  const grid = document.getElementById("socialGrid");
  grid.innerHTML = S.social.map(s => {
    const target = /^https?:/.test(s.url) ? ' target="_blank" rel="noopener"' : "";
    return `
    <a class="social-card soc-${esc(s.key)}" href="${esc(s.url)}"${target}>
      <span class="social-card__ico">${socIcon(s.key)}</span>
      <span class="social-card__name">${esc(s.name)}</span>
      <span class="social-card__hint">关注我们 →</span>
    </a>`;
  }).join("");
}

/* ---------- 客服对话框 ---------- */
function renderService(){
  const box = document.getElementById("chatContacts");
  box.innerHTML = `
    <div class="chat-contact"><span class="cc-ico">🐧</span><div><b>QQ 群</b><i>${esc(S.service.qq)}</i></div></div>
    <div class="chat-contact"><span class="cc-ico">💚</span><div><b>微信号</b><i>${esc(S.service.wechat)}</i></div></div>
    <div class="chat-contact"><span class="cc-ico">📮</span><div><b>邮箱</b><i>${esc(S.service.email)}</i></div></div>
    <div class="chat-hours">服务时间：${esc(S.service.hours)}</div>`;
}

/* ---------- 搜索（右上角） ---------- */
function initSearch(){
  const input = document.getElementById("searchInput");
  const box = document.getElementById("searchResults");
  input.addEventListener("input", () => {
    const q = input.value.trim();
    if(!q){ box.classList.remove("show"); box.innerHTML = ""; return; }
    const hits = searchAnimals(q);
    box.innerHTML = hits.length
      ? hits.slice(0, 12).map(h => `
          <button class="sr-item" data-cat="${h.cat.id}" data-sub="${h.sub ? h.sub.id : ""}" data-sp="${h.sp.id}">
            <span class="sr-name">${esc(h.v.name)}</span>
            <span class="sr-path">${h.cat.icon} ${esc(h.cat.name)}${h.sub ? " · " + esc(h.sub.name) : ""} · ${esc(h.sp.name)}</span>
          </button>`).join("")
          + (hits.length > 12 ? `<div class="sr-more">还有 ${hits.length - 12} 个结果，请输入更精确的名字…</div>` : "")
      : `<div class="sr-empty">没有找到「${esc(q)}」，换个关键词试试？</div>`;
    box.classList.add("show");
    box.querySelectorAll(".sr-item").forEach(b =>
      b.addEventListener("click", () => {
        box.classList.remove("show"); input.value = "";
        document.getElementById("codex").scrollIntoView({ behavior:"smooth" });
        curCatId = b.dataset.cat; curSubId = b.dataset.sub || null;
        renderCatTabs(); renderSubTabs();
        const sp = findSpeciesById(b.dataset.sp);
        if(sp) openSpecies(curCat(), curSub(), sp);
      }));
  });
  document.addEventListener("click", e => {
    if(!e.target.closest(".nav__search")) box.classList.remove("show");
  });
}

function searchAnimals(query){
  const q = query.trim().toLowerCase();
  if(!q) return [];
  const out = [];
  for(const c of TAX){
    for(const s of (c.subs||[])){
      for(const sp of s.species){
        const hitSp = sp.name.toLowerCase().includes(q);
        for(const v of sp.variants){
          if(v.name.toLowerCase().includes(q) || hitSp){
            out.push({ cat:c, sub:s, sp, v });
            if(out.length >= 60) return out;
          }
        }
      }
    }
    for(const sp of (c.species||[])){
      const hitSp = sp.name.toLowerCase().includes(q);
      for(const v of sp.variants){
        if(v.name.toLowerCase().includes(q) || hitSp){
          out.push({ cat:c, sub:null, sp, v });
          if(out.length >= 60) return out;
        }
      }
    }
  }
  return out;
}

/* ---------- 模态 / 灯箱 ---------- */
function openModal(id){
  const m = document.getElementById(id);
  m.classList.add("is-open"); m.setAttribute("aria-hidden", "false");
}
function closeModals(){
  document.querySelectorAll(".modal").forEach(m => {
    m.classList.remove("is-open"); m.setAttribute("aria-hidden", "true");
  });
  vaBatchMode = false; vaBatchSel.clear();
}
document.querySelectorAll(".modal [data-close], .modal [data-am-close], .modal [data-lm-close]").forEach(el =>
  el.addEventListener("click", closeModals));
document.addEventListener("keydown", e => {
  if(e.key === "Escape"){ closeModals(); closeLightbox(); }
});

function openLightbox(slot, cap){
  IMG.get(slot).then(blob => {
    if(!blob){ toast("该图片还没有上传"); return; }
    document.getElementById("lightboxImg").src = URL.createObjectURL(blob);
    document.getElementById("lightboxCap").textContent = cap || "";
    const lb = document.getElementById("lightbox");
    lb.classList.add("is-open"); lb.setAttribute("aria-hidden", "false");
  });
}
function closeLightbox(){
  const lb = document.getElementById("lightbox");
  lb.classList.remove("is-open"); lb.setAttribute("aria-hidden", "true");
}
document.querySelectorAll("#lightbox [data-close]").forEach(el =>
  el.addEventListener("click", closeLightbox));

/* ---------- 客服开关 ---------- */
document.getElementById("chatFab").addEventListener("click", () =>
  document.getElementById("chatPanel").classList.toggle("show"));
document.getElementById("chatClose").addEventListener("click", () =>
  document.getElementById("chatPanel").classList.remove("show"));

/* ---------- 轮播控制 ---------- */
document.getElementById("carPrev").addEventListener("click", () => { carGo(carIdx - 1); restartCar(); });
document.getElementById("carNext").addEventListener("click", () => { carGo(carIdx + 1); restartCar(); });

/* ---------- 平滑滚动导航高亮 ---------- */
document.querySelectorAll('a[href^="#"]').forEach(a =>
  a.addEventListener("click", e => {
    const el = document.querySelector(a.getAttribute("href"));
    if(el){ e.preventDefault(); el.scrollIntoView({ behavior:"smooth" }); }
  }));

/* ---------- 编辑模式入口 ---------- */
function setEditUI(){
  document.body.classList.toggle("is-edit", EDIT);
  document.getElementById("adminOpenPanel").classList.toggle("is-hidden", !EDIT);
  document.getElementById("adminExit").classList.toggle("is-hidden", !EDIT);
  document.getElementById("adminToggle").classList.toggle("is-hidden", EDIT);
  document.getElementById("editTip").classList.toggle("is-hidden", !EDIT);
  renderVersions(); renderCatTabs(); renderSubTabs(); renderSpecies(); renderPosters();
  renderHero();
}
const loginModal  = document.getElementById("loginModal");
const loginInput  = document.getElementById("loginPassInput");
const loginErr    = document.getElementById("loginErr");

/* 全局编辑令牌：登录成功后保存，写接口随请求头带上；由 admin.js 初始化时从 sessionStorage 恢复 */
function zooAuthHeaders(extra){
  const h = Object.assign({}, extra || {});
  if (window.ADMIN_TOKEN) h["X-Admin-Token"] = window.ADMIN_TOKEN;
  return h;
}

function showAdminFabs(){ document.getElementById("adminFabs").classList.add("is-visible"); }
function hideAdminFabs(){ document.getElementById("adminFabs").classList.remove("is-visible"); }
function openLogin(){
  loginInput.value = ""; loginErr.classList.add("is-hidden");
  openModal("loginModal");
  setTimeout(() => loginInput.focus(), 50);
}
async function tryLogin(){
  const pw = loginInput.value;
  if(!pw){ loginErr.textContent = "请输入密码"; loginErr.classList.remove("is-hidden"); return; }
  try{
    const r = await zooApiFetch("/api/login", { method:"POST", headers:{ "Content-Type":"application/json" }, body: JSON.stringify({ password: pw }) });
    if(r.ok){
      window.ADMIN_TOKEN = pw;
      localStorage.setItem("zooAdminToken", pw);
      sessionStorage.setItem("zooToken", pw);
      showAdminFabs();
      closeModals();
      EDIT = true; sessionStorage.setItem("zooEdit", "1");
      setEditUI(); toast("编辑模式已开启");
    } else {
      loginErr.textContent = "密码错误，请重试"; loginErr.classList.remove("is-hidden");
      loginInput.select();
    }
  }catch(e){
    loginErr.textContent = "网络错误，请重试"; loginErr.classList.remove("is-hidden");
  }
}
document.getElementById("adminToggle").addEventListener("click", openLogin);
document.getElementById("loginGo").addEventListener("click", tryLogin);
loginInput.addEventListener("keydown", e => { if(e.key === "Enter") tryLogin(); });
document.getElementById("adminExit").addEventListener("click", () => {
  EDIT = false; window.ADMIN_TOKEN = ""; sessionStorage.removeItem("zooEdit"); sessionStorage.removeItem("zooToken");
  localStorage.removeItem("zooAdminToken"); hideAdminFabs();
  setEditUI(); toast("已退出编辑模式");
});
document.getElementById("adminOpenPanel").addEventListener("click", () => {
  buildAdminPanel(); applyImages(document.getElementById("adminPanelBody"));
  openModal("adminModal");
});

/* ---------- 全量刷新 ---------- */
function updateCodexDesc(){
  const el = document.getElementById("codexDesc");
  if(!el) return;
  const c = taxCount();
  el.textContent = `${c.cats} 个分类 · ${c.subs} 个区域 · ${c.species} 个物种 · ${c.variants} 个个体`;
}
function refreshAll(){
  renderHero(); renderVersions(); renderCatTabs(); renderSubTabs(); renderSpecies(); updateCodexDesc();
  renderPosters(); renderCreators(); renderSocial(); renderService();
}

/* ---------- 初始化 ---------- */
openImgDB().catch(err => console.error("IndexedDB 初始化失败：", err)).finally(async () => {
  try{ await initStorage(); }catch(e){ console.error("存储初始化失败：", e); }
  try{ await loadTax(); }catch(e){ console.error("图鉴加载失败：", e); }
  if(!curCatId && TAX[0]){ resetCur(); }
  refreshAll();
  applyImages(document);
  applyFavicon();
  restartCar();
  /* 恢复管理员登录态：本机曾登录则自动显示编辑入口（仅管理员可见） */
  const savedAdmin = localStorage.getItem("zooAdminToken") || sessionStorage.getItem("zooToken");
  if(savedAdmin){ window.ADMIN_TOKEN = savedAdmin; showAdminFabs(); }
  /* 隐藏入口：URL 带 ?admin=1 时弹出登录框，供管理员首次登录 */
  if(location.search.indexOf("admin") > -1) openLogin();
});
initSearch();