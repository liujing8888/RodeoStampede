/* =========================================================
   疯狂动物园 · 到此一游（打卡纪念 + 数据上报）
   - 每个设备仅限一个"牛仔序号"（deviceId 去重）
   - 上报设备类型 / 品牌 / 型号 / 停留位置 / 访问次数
   - 数据落盘 data/checkins.json（服务器接口 /api/checkin）
   ========================================================= */
(function () {
  "use strict";

  const SEC = {
    "#codex": "动物图鉴",
    "#versions": "版本动态",
    "#wallpapers": "宣传图",
    "#creators": "优秀创作者",
    "#social": "社区社媒",
    "#checkin": "到此一游"
  };

  function esc(s) {
    return String(s == null ? "" : s).replace(/&/g, "&amp;").replace(/</g, "&lt;")
      .replace(/>/g, "&gt;").replace(/"/g, "&quot;");
  }

  /* ---------- 设备识别（手机 / 电脑，手机品牌粗识别） ---------- */
  function detectDevice() {
    const ua = navigator.userAgent || "";
    let deviceType = "desktop", brand = "Others", model = "", osVersion = "";
    const isMobile = /Android|iPhone|iPad|iPod|Mobile|Windows Phone|HarmonyOS|webOS|BlackBerry|IEMobile/i.test(ua);
    if (isMobile) deviceType = "phone";

    if (/iPhone|iPad|iPod/i.test(ua)) brand = "Apple";
    else if (/HUAWEI|HarmonyOS/i.test(ua)) brand = "Huawei";
    else if (/Xiaomi|Redmi|POCO|Mi \d/i.test(ua)) brand = "Xiaomi";
    else if (/Samsung|SM-/i.test(ua)) brand = "Samsung";
    else if (/OPPO/i.test(ua)) brand = "OPPO";
    else if (/vivo/i.test(ua)) brand = "vivo";
    else if (/Android/i.test(ua)) brand = "Android";
    else if (/Windows NT/i.test(ua)) brand = "Windows";
    else if (/Macintosh|Mac OS X/i.test(ua)) brand = "macOS";
    else if (/Linux/i.test(ua)) brand = "Linux";

    if (deviceType === "phone") {
      const m = ua.match(/\(([^)]*)\)/);
      if (m) model = m[1].slice(0, 60);
    }
    const ov = ua.match(/OS (\d+[._]\d+)/);
    if (ov) osVersion = ov[1].replace(/_/g, ".");
    return { deviceType, brand, model, osVersion };
  }

  function getDeviceId() {
    let id = "";
    try { id = localStorage.getItem("zooDeviceId"); } catch (e) {}
    if (!id) {
      id = "d_" + Date.now().toString(36) + "_" + Math.random().toString(36).slice(2, 10);
      try { localStorage.setItem("zooDeviceId", id); } catch (e) {}
    }
    return id;
  }

  /* ---------- 停留位置跟踪（滚动 / 锚点切换时记录访问过的区块） ---------- */
  const visited = new Set();
  function trackLocation() {
    const vh = window.innerHeight || 800;
    for (const sec in SEC) {
      const el = document.querySelector(sec);
      if (!el) continue;
      const r = el.getBoundingClientRect();
      if (r.bottom > vh * 0.35 && r.top < vh * 0.65) visited.add(sec);
    }
    if (location.hash && SEC[location.hash]) visited.add(location.hash);
  }
  function throttle(fn, ms) {
    let t = 0;
    return function () {
      const now = Date.now();
      if (now - t >= ms) { t = now; fn(); }
    };
  }
  window.addEventListener("scroll", throttle(trackLocation, 600), { passive: true });
  window.addEventListener("hashchange", trackLocation);
  trackLocation();

  /* ---------- 数字滚动动画 ---------- */
  function easeOut(t) { return 1 - Math.pow(1 - t, 3); }
  function animateNumber(el, to) {
    const from = 0, dur = 1300, t0 = performance.now();
    function step(now) {
      const p = Math.min(1, (now - t0) / dur);
      el.textContent = Math.floor(from + (to - from) * easeOut(p)).toLocaleString();
      if (p < 1) requestAnimationFrame(step);
      else el.textContent = Number(to).toLocaleString();
    }
    requestAnimationFrame(step);
  }

  /* ---------- 打卡音效（Web Audio 合成钟声，无外部音频文件） ---------- */
  let _ac = null;
  function getAC() {
    if (!_ac) {
      const AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return null;
      _ac = new AC();
    }
    if (_ac.state === "suspended") _ac.resume();
    return _ac;
  }
  function bellStrike(ac, t0, base) {
    const partials = [
      { r: 1.0,  g: 0.50, d: 1.6 },
      { r: 2.0,  g: 0.22, d: 1.1 },
      { r: 2.76, g: 0.16, d: 0.8 },
      { r: 3.94, g: 0.10, d: 0.6 },
      { r: 5.40, g: 0.05, d: 0.45 }
    ];
    partials.forEach(function (p) {
      const osc = ac.createOscillator();
      const gain = ac.createGain();
      osc.type = "sine";
      osc.frequency.value = base * p.r;
      gain.gain.setValueAtTime(0.0001, t0);
      gain.gain.exponentialRampToValueAtTime(p.g, t0 + 0.006);
      gain.gain.exponentialRampToValueAtTime(0.0001, t0 + p.d);
      osc.connect(gain).connect(ac.destination);
      osc.start(t0);
      osc.stop(t0 + p.d + 0.05);
    });
  }
  function playBell() {
    const ac = getAC();
    if (!ac) return;
    const now = ac.currentTime;
    bellStrike(ac, now, 523.25);        // C5
    bellStrike(ac, now + 0.22, 783.99); // G5 —— 叮·咚 钟声
  }

  /* ---------- 烟花特效（Canvas 粒子，无图片资源） ---------- */
  let _fx = null;
  function getFxCanvas() {
    if (_fx) return _fx;
    const c = document.createElement("canvas");
    c.className = "fx-canvas";
    document.body.appendChild(c);
    _fx = c;
    return c;
  }
  function launchFireworks() {
    if (window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const c = getFxCanvas();
    const ctx = c.getContext("2d");
    c.width = window.innerWidth;
    c.height = window.innerHeight;
    const parts = [];
    const colors = ["#ffd24a", "#ff6b9d", "#4f8ef7", "#7CFFB2", "#ff8a3d", "#c98bff"];
    function burst(x, y) {
      const n = 26 + Math.floor(Math.random() * 14);
      const col = colors[Math.floor(Math.random() * colors.length)];
      for (let i = 0; i < n; i++) {
        const a = (Math.PI * 2 * i) / n + Math.random() * 0.3;
        const sp = 2 + Math.random() * 4;
        parts.push({ x: x, y: y, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp, life: 1, col: col });
      }
    }
    burst(c.width * 0.5, c.height * 0.4);
    setTimeout(function () { burst(c.width * 0.28, c.height * 0.5); }, 180);
    setTimeout(function () { burst(c.width * 0.72, c.height * 0.46); }, 340);
    const t0 = performance.now();
    const dur = 1600;
    function frame(now) {
      const p = (now - t0) / dur;
      ctx.clearRect(0, 0, c.width, c.height);
      for (let i = parts.length - 1; i >= 0; i--) {
        const pt = parts[i];
        pt.x += pt.vx; pt.y += pt.vy;
        pt.vy += 0.045; pt.vx *= 0.99; pt.vy *= 0.99;
        pt.life -= 0.012;
        if (pt.life <= 0) { parts.splice(i, 1); continue; }
        ctx.globalAlpha = Math.max(0, pt.life);
        ctx.fillStyle = pt.col;
        ctx.beginPath();
        ctx.arc(pt.x, pt.y, 2.4, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.globalAlpha = 1;
      if (p < 1 || parts.length) requestAnimationFrame(frame);
      else ctx.clearRect(0, 0, c.width, c.height);
    }
    requestAnimationFrame(frame);
  }

  /* ---------- 打卡 ---------- */
  async function doCheckin() {
    const btn = document.getElementById("checkinBtn");
    if (btn) { btn.disabled = true; btn.textContent = "打卡中…"; }
    try { getAC(); } catch (e) {}
    const dev = detectDevice();
    trackLocation();
    visited.add("#checkin");
    const payload = {
      deviceId: getDeviceId(),
      deviceType: dev.deviceType,
      brand: dev.brand,
      model: dev.model,
      osVersion: dev.osVersion,
      locations: Array.from(visited)
    };
    try {
      const r = await zooApiFetch("/api/checkin", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });
      if (!r.ok) throw new Error("bad");
      const d = await r.json();
      showResult(d.seq, d.isNew, dev);
    } catch (e) {
      const prev = (function () { try { return localStorage.getItem("zooCheckedIn"); } catch (x) { return null; } })();
      if (prev) {
        document.getElementById("checkinNum").textContent = Number(prev).toLocaleString();
        document.getElementById("checkinSub").textContent =
          "👋 离线状态：显示你上次的打卡记录（第 " + Number(prev).toLocaleString() + " 位）";
        document.getElementById("checkinHint").textContent = "当前无法连接服务器，恢复网络后点击可重新同步";
      } else {
        document.getElementById("checkinSub").textContent = "⚠️ 打卡失败，请检查网络后重试";
      }
    } finally {
      if (btn) { btn.disabled = false; btn.textContent = "🤠 我也要打卡"; }
    }
  }

  function showResult(seq, isNew, dev) {
    animateNumber(document.getElementById("checkinNum"), seq);
    document.getElementById("checkinSub").textContent = isNew
      ? "🎉 欢迎加入牛仔名册！你已是官方记录的第 " + Number(seq).toLocaleString() + " 位牛仔"
      : "👋 老朋友，你早已是名册上的一员（全球第 " + Number(seq).toLocaleString() + " 位）";
    document.getElementById("checkinHint").textContent =
      "设备档案：" + dev.brand + " · " + (dev.deviceType === "phone" ? "手机" : "电脑") + (dev.model ? " · " + dev.model : "");
    try { localStorage.setItem("zooCheckedIn", String(seq)); } catch (e) {}
    const cow = document.getElementById("checkinCowboy");
    if (cow) { cow.classList.remove("is-pop"); void cow.offsetWidth; cow.classList.add("is-pop"); }
    playBell();
    launchFireworks();
  }

  function initCheckin() {
    const btn = document.getElementById("checkinBtn");
    if (btn) btn.addEventListener("click", doCheckin);
    const prev = (function () { try { return localStorage.getItem("zooCheckedIn"); } catch (x) { return null; } })();
    if (prev) {
      document.getElementById("checkinNum").textContent = Number(prev).toLocaleString();
      document.getElementById("checkinSub").textContent =
        "👋 你已是牛仔名册第 " + Number(prev).toLocaleString() + " 位，点击按钮可刷新你的足迹";
      document.getElementById("checkinHint").textContent = "· 数据已本地保存，点击按钮同步到全局名册 ·";
    }
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", initCheckin);
  else initCheckin();

  /* ---------- 管理员数据面板（供 admin.js 的 checkin 标签页调用） ---------- */
  window.loadCheckinStats = async function (mount) {
    const body = mount.querySelector("#admCheckinBody") || mount;
    body.innerHTML = '<p class="adm-hint">加载数据中…</p>';
    try {
      const r = await zooApiFetch("/api/checkin", { cache: "no-store" });
      if (!r.ok) throw new Error("bad");
      const d = await r.json();
      const total = d.total || 0;
      const brandRows = Object.entries(d.byBrand || {}).sort((a, b) => b[1] - a[1]);
      const locRows = Object.entries(d.byLoc || {}).sort((a, b) => b[1] - a[1])
        .map(([k, v]) => [SEC[k] || k, v]);
      const visitRows = Object.entries(d.byVisits || {}).sort((a, b) => (+a[0]) - (+b[0]))
        .map(([k, v]) => [k + " 次", v]);
      const typeRows = Object.entries(d.byType || {});

      const stat = (label, val) =>
        `<div class="ck-stat"><div class="ck-stat__v">${esc(val)}</div><div class="ck-stat__l">${esc(label)}</div></div>`;
      const bar = (label, n, tot) => {
        const pct = tot ? Math.round((n / tot) * 100) : 0;
        return `<div class="ck-bar"><div class="ck-bar__row"><span>${esc(label)}</span><span>${n}（${pct}%）</span></div><div class="ck-bar__track"><i style="width:${pct}%"></i></div></div>`;
      };

      body.innerHTML = `
        <div class="ck-head">
          <div class="ck-title">🤠 到此一游 · 打卡数据</div>
          <button class="btn btn--ghost btn--sm" id="ckRefresh">刷新</button>
        </div>
        <div class="ck-grid">
          ${stat("累计打卡牛仔", total.toLocaleString())}
          ${stat("手机访客", (d.byType && d.byType.phone) || 0)}
          ${stat("电脑访客", (d.byType && d.byType.desktop) || 0)}
          ${stat("回访最高", visitRows[0] ? visitRows[0][0] : "—")}
        </div>
        <div class="ck-block">
          <h4>设备类型</h4>
          ${typeRows.length ? typeRows.map(([k, v]) => bar(k === "phone" ? "手机" : k === "desktop" ? "电脑" : k, v, total)).join("") : "<p class='adm-hint'>暂无数据</p>"}
        </div>
        <div class="ck-block">
          <h4>设备 / 品牌分布</h4>
          ${brandRows.length ? brandRows.map(([k, v]) => bar(k, v, total)).join("") : "<p class='adm-hint'>暂无数据</p>"}
        </div>
        <div class="ck-block">
          <h4>主要停留位置（按访问热度）</h4>
          ${locRows.length ? locRows.map(([k, v]) => bar(k, v, total)).join("") : "<p class='adm-hint'>暂无数据</p>"}
        </div>
        <div class="ck-block">
          <h4>访问次数分布</h4>
          ${visitRows.length ? visitRows.map(([k, v]) => bar(k, v, total)).join("") : "<p class='adm-hint'>暂无数据</p>"}
        </div>
        <div class="ck-block">
          <h4>最近打卡（前 20 条）</h4>
          <div class="ck-table">
            <div class="ck-tr ck-tr--h"><span>名次</span><span>品牌</span><span>类型</span><span>停留</span><span>次数</span><span>时间</span></div>
            ${(d.recent || []).map(r => `<div class="ck-tr">
              <span>#${r.seq}</span>
              <span>${esc(r.brand)}</span>
              <span>${r.deviceType === "phone" ? "手机" : "电脑"}</span>
              <span>${(r.locations || []).map(l => SEC[l] || l).join("、") || "—"}</span>
              <span>${r.visits || 1}</span>
              <span>${esc((r.lastAt || "").replace("T", " ").slice(0, 16))}</span>
            </div>`).join("") || "<p class='adm-hint'>暂无记录</p>"}
          </div>
        </div>`;
      const rf = body.querySelector("#ckRefresh");
      if (rf) rf.addEventListener("click", () => window.loadCheckinStats(mount));
    } catch (e) {
      body.innerHTML = '<p class="adm-hint">⚠️ 加载失败，请确认服务器在线后刷新。</p>';
    }
  };
})();