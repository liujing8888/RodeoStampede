#!/usr/bin/env bash
# =========================================================
#  疯狂动物园 · 国内云服务器一键部署脚本
#  适用：阿里云 / 腾讯云 轻量应用服务器（Ubuntu 22.04）
#  用法：
#    1) 把本文件和项目 zip（crazyzoo.zip）上传到服务器 /root/
#    2) 或先把项目 git 推到 GitHub（脚本会自动 clone）
#    3) 在服务器执行：  bash setup_server.sh
#  说明：管理员密码通过环境变量 SITE_ADMIN_PW 注入，不落盘、不进代码库
# =========================================================
set -e

echo "================================================"
echo "  疯狂动物园 · 国内服务器一键部署"
echo "================================================"

# ---------- 0. 基础工具 ----------
export PATH=$PATH:/usr/local/bin:/usr/bin:/root/.npm-global/bin
apt-get update -y >/dev/null 2>&1 || true
apt-get install -y curl unzip git >/dev/null 2>&1 || true

# ---------- 1. 安装 Node.js 20（优先国内镜像，避免海外源超时） ----------
install_node(){
  if command -v node >/dev/null 2>&1 && [ "$(node -v | sed 's/v//' | cut -d. -f1)" -ge 18 ]; then return; fi
  echo ">>> 安装 Node.js 20 (国内镜像) ..."
  NODE_VER=20.18.1
  case "$(uname -m)" in x86_64) NA=x64;; aarch64) NA=arm64;; *) NA=x64;; esac
  URL="https://registry.npmmirror.com/-/binary/node/v${NODE_VER}/node-v${NODE_VER}-linux-${NA}.tar.xz"
  if curl -fsSL "$URL" -o /tmp/node.tar.xz 2>/dev/null && [ -s /tmp/node.tar.xz ]; then
    tar -xJf /tmp/node.tar.xz -C /usr/local --strip-components=1 && echo "Node 已装: $(node -v)"
  else
    echo ">>> 国内镜像失败，尝试 nodesource 兜底 ..."
    curl -fsSL https://deb.nodesource.com/setup_20.x | bash - && apt-get install -y nodejs
  fi
}
install_node

# ---------- 2. 获取代码（本地 zip 优先，其次 git clone） ----------
APP_DIR=/root/crazyzoo
if [ ! -f "$APP_DIR/server.js" ]; then
  if [ -f /root/crazyzoo.tar.gz ]; then
    echo ">>> 解压本地上传的代码包 (tar.gz) ..."
    mkdir -p "$APP_DIR"
    tar -xzf /root/crazyzoo.tar.gz -C "$APP_DIR"
  elif [ -f /root/crazyzoo.zip ]; then
    echo ">>> 解压本地上传的代码包 (zip) ..."
    mkdir -p "$APP_DIR"
    unzip -o -q /root/crazyzoo.zip -d "$APP_DIR"
    # 部分打包会把文件放进子目录，修正层级
    if [ ! -f "$APP_DIR/server.js" ] && [ -f "$APP_DIR"/*/server.js ]; then
      mv "$APP_DIR"/*/* "$APP_DIR"/ 2>/dev/null || true
    fi
  elif command -v git >/dev/null 2>&1 && git ls-remote https://github.com/liujing8888/RodeoStampede.git >/dev/null 2>&1; then
    echo ">>> 通过 git 拉取代码 ..."
    git clone https://github.com/liujing8888/RodeoStampede.git "$APP_DIR"
  else
    echo "✗ 未找到代码：请把项目 zip 命名为 crazyzoo.zip 上传到 /root/ 后重跑本脚本"
    exit 1
  fi
fi
cd "$APP_DIR"

# ---------- 3. 管理员密码（写接口保护，不落盘） ----------
if [ -z "$SITE_ADMIN_PW" ]; then
  read -s -p "设置管理员密码（用于后台写接口，输入不显示）: " SITE_ADMIN_PW
  echo
fi
if [ -z "$SITE_ADMIN_PW" ]; then
  echo "✗ 密码不能为空"; exit 1
fi

# ---------- 4. 安装 pm2 常驻进程管理器 ----------
echo ">>> 安装 pm2 常驻管理器 ..."
npm config set registry https://registry.npmmirror.com >/dev/null 2>&1 || true
npm install -g pm2 >/dev/null 2>&1 || true

# ---------- 5. 启动服务 ----------
export PORT=8080
export HOST=0.0.0.0
pm2 delete crazyzoo 2>/dev/null || true
pm2 start server.js --name crazyzoo --update-env
pm2 save
pm2 startup >/dev/null 2>&1 || true

echo "================================================"
echo "✓ 部署完成！"
echo "  访问地址:  http://<你的服务器公网IP>:8080"
echo "  后台管理:  打开页面右上角 🛠，输入刚设的密码"
echo "  查看状态:  pm2 status"
echo "  重启服务:  pm2 restart crazyzoo"
echo "================================================"
