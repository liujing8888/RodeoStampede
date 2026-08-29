# 疯狂动物园社区站 · 云端部署指南（关机不受影响）

> 目标：把网站部署到云平台，你关机 / 电脑断电后，别人依然能访问。
> 关键改动：server.js 已支持 `PORT` / `HOST` / `DATA_DIR` 环境变量，并带「首次种子」逻辑——挂载持久卷后首次启动会自动把内置 data/ 复制到卷里，无需手动传数据。

> ⚠️ **部署必须在你自己的电脑上操作**。Agent（WorkBuddy）运行在云端沙箱，无法访问外网下载工具或连接 Railway，因此**无法代为远程部署**。下文所有命令请在你的 Windows 电脑上执行；卡住时把报错发给我排查即可。

---

## 一、两条路线对比

| 路线 | 是否需要 GitHub | 关机后是否可访问 | 数据持久化 | 备注 |
|------|----------------|------------------|------------|------|
| **A. Railway（CLI 直接部署，推荐）** | ❌ 不需要 | ✅ 是 | 挂持久卷 | 最省事，本地目录直接 `railway up` |
| **B. Render（需 GitHub）** | ✅ 需要 | ✅ 是（free 有 15 分钟休眠） | 挂 Disk | 适合已有 GitHub 仓库 |

两者都**不需要你的电脑一直开机**。

---

### 🚀 最省事路径：Git 推仓库（免装任何 CLI，强烈推荐）

不想下载 railway.exe / 装 Node？走这条：Agent 已经在本项目完成了本地 `git init` + 首次提交（共 **1085 个文件**，含 923 张图与全部代码），你**只差最后一步 `git push`**，然后让平台连 GitHub 仓库自动部署。

> **前提：本机必须有 git**。按下面顺序做，通常能省掉下载：
> 1. **先查是否已装（0 下载）**：点开始菜单搜 **"Git Bash"**，若搜到 → 直接打开它（里面自带 git，无需安装）。或在 PowerShell 跑 `where git` 看是否返回路径。若已有 git，直接跳到下面的 push 步骤即可（注意：Git Bash 里路径写作 `/f/网站`，不是 `F:\网站`）。
> 2. **若确实没装，用直链下载（点开即下载，不是目录页、不乱码）**：
>    - 国内镜像（快）：`https://registry.npmmirror.com/-/binary/git-for-windows/v2.55.0.windows.5/Git-2.55.0.5-64-bit.exe`
>    - 官方 GitHub（慢但稳）：`https://github.com/git-for-windows/git/releases/download/v2.55.0.windows.5/Git-2.55.0.5-64-bit.exe`
>    - 下载后双击安装，一路 Next，**保持勾选「Add Git to the PATH」**（默认已勾），装完**重开 PowerShell**。
> 3. 验证：重开 PowerShell 后跑 `git --version` 能看到版本号即成功。
> - （`winget install --id Git.Git` 也可用，但 winget 默认从 GitHub 拉安装包，在国内可能也慢，故优先用上面的镜像 exe。）

1. **建 GitHub 仓库**（在浏览器里操作，约 1 分钟）：
   - 打开 https://github.com 并登录。若无账号先去 https://github.com/signup 用邮箱注册（免费、免手机）。
   - 右上角点 **"+"** → 选 **"New repository"**。
   - **Repository name**：填一个英文名，如 `crazy-zoo-site`（**不能含中文、空格、中文标点**）。
   - **Description**：可留空，或写「疯狂动物园社区站」。
   - 可见性选 **Public**（免费托管推荐；Private 也行，但要在平台授权时允许访问）。
   - ⚠️ **不要**勾选下面的 "Add a README file" / "Add .gitignore" / "Choose a license"——因为本地已有完整项目，勾了会生成初始文件导致 push 冲突。
   - 点 **"Create repository"**。
   - 创建成功后页面会显示仓库地址，形如 `https://github.com/你的用户名/crazy-zoo-site.git`，**复制这一行**（后面要用）。
2. **在你电脑 PowerShell 推送**：
   ```powershell
   cd F:\网站
   git remote add origin https://github.com/你的用户名/crazy-zoo-site.git
   git push -u origin master
   ```
   > 🔑 **认证坑（必看）**：GitHub 已不支持用「账号密码」push。若弹窗提示输入用户名/密码，**密码那一项要填 Personal Access Token（PAT）**，不是你的登录密码。
   > 生成 PAT：登录 GitHub → 右上角头像 → **Settings** → 左侧最下方 **Developer settings** → **Personal access tokens** → **Tokens (classic)** → **Generate new token (classic)** → Note 随便填（如 `zoo-deploy`）→ **Expiration** 选 No expiration（或 90 days）→ 勾选 **repo**（全选该组）→ 拉到底点 **Generate token** → **立刻复制**那串 `ghp_xxx`（只显示一次）。
   > 把 PAT 当密码粘贴即可。若想免去每次输入，可改用 SSH 密钥（进阶，需要再说）。
3. **Railway 网页部署（免 CLI，推荐）**：
   1. 打开 https://railway.app 登录（你邮箱注册的账号）。
   2. 点 **New Project** → 选 **Deploy from GitHub repo**。
   3. 首次会要求 **Connect GitHub**：点它 → 跳 GitHub 授权页 → 登录你的账号 → 授权 Railway 访问仓库（选 RodeoStampede 或 All repositories）。
   4. 选 **RodeoStampede** 仓库 → Railway 自动 Build & Deploy（读 `package.json` 的 `npm start` 启动 `node server.js`）。
   5. 部署完成后，项目 → **Settings** 可见分配的域名 `*.up.railway.app`，直接可访问。
   6. **挂持久卷（防丢数据）**：项目 → **Volumes** → New Volume，Mount Path 填 `/data`，大小 1–2 GB。
   7. **设环境变量**：项目 → **Variables** 加：`DATA_DIR` = `/data`；`SITE_ADMIN_PW` = 你的强密码（公开前必改）。
   8. 改完点 **Redeploy**。服务首次启动检测到 `/data` 为空，会自动把内置 `data/` 复制进卷（日志可见 `已用内置 data/ 初始化持久卷`）。
4. **Render 备选**：New Web Service → 连 GitHub 仓库（详见路线 B）。

> 注：本地提交已忽略 `data/admin_pw.txt`（弱密码文件）与自动备份；部署后请用 `SITE_ADMIN_PW` 环境变量设强密码。

---

## 二、路线 A：Railway（推荐，免 GitHub）

### 1. 准备（注册 Railway 账号，免 GitHub）
- 打开 https://railway.app → 点 Login / Start for Free → 选 **Continue with Email**（国内 QQ/163 邮箱均可）→ 验证邮件 → 注册成功自动得 $5 额度。
- 若页面只显示 "Continue with GitHub"：先去 https://github.com/signup 用邮箱注册 GitHub（免费、免手机），再回来用 GitHub 登录。
- **下载 Windows 独立命令行（无需安装 Node）**：
  - 浏览器打开这个直链（已核对为最新 v5.45.7，64 位 Windows）：
    `https://github.com/railwayapp/cli/releases/download/v5.45.7/railway-v5.45.7-x86_64-pc-windows-gnu.tar.gz`
  - 下载得到 `railway-v5.45.7-x86_64-pc-windows-gnu.tar.gz`
  - 解压：右键用 7-Zip / WinRAR 解压（或用 PowerShell 执行 `tar -xf 文件名.tar.gz`），得到 `railway.exe`
  - 新建文件夹 `C:\railway\`，把 `railway.exe` 放进去 → 最终路径 `C:\railway\railway.exe`
  - 之后所有命令都用它的**绝对路径** `C:\railway\railway.exe`，不必配置环境变量。

### 2. 登录并初始化
```powershell
C:\railway\railway.exe login          # 弹出浏览器授权（用刚注册的账号登录）
cd F:\网站
C:\railway\railway.exe init           # 新建项目，选 Empty Project，按提示命名（如 crazy-zoo-site）
```

### 3. 部署（直接上传本地目录，含 data/ 初始图片）
```powershell
C:\railway\railway.exe up             # 把整个 F:\网站 上传并部署（第一次较慢，含 923 张图）
```
部署完成后 Railway 会分配一个 `*.up.railway.app` 域名，直接可访问。

### 4. 挂持久卷（关键！否则重启丢数据）
在 Railway 面板 → 你的项目 → **Volumes** → New Volume：
- 挂载路径（Mount Path）：`/data`
- 大小：1–2 GB 即可
然后在项目 **Variables** 里加一条：
- `DATA_DIR` = `/data`

改完变量后点 Redeploy。服务启动时检测到 `/data` 为空，会自动把内置 data/ 复制进去（日志可见 `已用内置 data/ 初始化持久卷`）。

### 5. 自定义域名（可选）
Railway → Settings → Domains → 绑定你自己的域名（需改 DNS CNAME）。

---

## 三、路线 B：Render（需 GitHub）

### 1. 建仓库并推送
```bash
cd F:\网站
git init
git add .
git commit -m "crazy zoo site"
# 在 GitHub 新建仓库后：
git remote add origin <你的仓库地址>
git push -u origin main
```
> 注意：若图片很多，可把 `data/img/` 加入 `.gitignore` 避免大仓库；但这样镜像内无图，需用「初始复制」之外的办法（见下方 FAQ）。默认推荐**不忽略 data/**，让首次部署自带图片。

### 2. 在 Render 创建 Web Service
- 连 GitHub 仓库
- Runtime：Node
- Build Command：`node -e "console.log('noop')"`
- Start Command：`node server.js`
- 添加 **Disk**：Mount Path `/var/data`，大小 2 GB
- 添加环境变量：`DATA_DIR` = `/var/data`
- 部署

---

## 四、部署后必做：改强密码

当前 admin 口令仍是默认 `admin`，公开后必须改：
- 方式一：进平台 Shell / 编辑 `data/admin_pw.txt` 换成强密码，重启服务。
- 方式二（推荐）：在平台 Variables 设 `SITE_ADMIN_PW=你的强密码`，重启生效（优先级高于文件）。

---

## 五、数据备份与回滚
- 你本机 `F:\网站\data/` 仍是一份完整离线备份，永不丢。
- 云平台卷可随时做 Snapshot。
- 编辑模式（🛠 admin）内所有改动都落卷，重启不丢。

---

## 六、常见问题
**Q：免费层会休眠吗？**
A：Render free 闲置 15 分钟会休眠（首次访问冷启动几秒）；Railway 默认不休眠，长时不活跃可能被回收，可升级付费保活。

**Q：图片传上去了吗？**
A：走路线 A（Railway CLI `railway up`）会把本地 `data/` 一起上传，首次启动种子自动填入卷，无需手动传。

**Q：以后还能用编辑模式改图鉴吗？**
A：能。编辑模式走的是服务器写接口，数据写进卷，云平台同样生效。

**Q：想迁回本机 / 换平台？**
A：把卷里的 `data/` 下载回本地即可，server.js 本地模式不依赖任何云配置。
