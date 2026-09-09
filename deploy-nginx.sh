#!/bin/bash
# 部署「娛樂場禁入申請系統」靜態原型到 nginx 伺服器
set -euo pipefail

SERVER_USER="${SERVER_USER:-root}"      # 伺服器登入帳號，可用環境變數覆寫
SERVER_HOST="${SERVER_HOST:-192.168.31.42}"  # 伺服器 IP（不帶埠號）
SSH_PORT="${SSH_PORT:-22}"             # SSH 埠號
WEB_PORT="${WEB_PORT:-9988}"           # 網站埠號（nginx listen 的埠）
REMOTE_ROOT="${REMOTE_ROOT:-/var/www/dicj}"
LOCAL_DIR="$(cd "$(dirname "$0")" && pwd)"

echo "==> 建立遠端目錄 ${REMOTE_ROOT}"
ssh -p "${SSH_PORT}" "${SERVER_USER}@${SERVER_HOST}" "mkdir -p ${REMOTE_ROOT}"

echo "==> 同步 index.html 與 src/ 到 ${SERVER_USER}@${SERVER_HOST}:${REMOTE_ROOT}"
rsync -avz --delete -e "ssh -p ${SSH_PORT}" \
  "${LOCAL_DIR}/index.html" \
  "${LOCAL_DIR}/src" \
  "${SERVER_USER}@${SERVER_HOST}:${REMOTE_ROOT}/"

echo "==> 完成。用瀏覽器開啟 http://${SERVER_HOST}:${WEB_PORT}/ 驗證"
