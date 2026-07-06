#!/bin/bash
# 山旅帖をダブルクリックで起動するランチャー。
# サーバーが未起動なら server.py を起動し、ブラウザでアプリを開く。
cd "$(dirname "$0")"

PORT=8765
URL="http://localhost:${PORT}/index.html"

if ! lsof -nP -iTCP:${PORT} -sTCP:LISTEN >/dev/null 2>&1; then
  nohup python3 server.py >/dev/null 2>&1 &
  # サーバーが立ち上がるまで最大5秒待つ
  for _ in $(seq 1 25); do
    lsof -nP -iTCP:${PORT} -sTCP:LISTEN >/dev/null 2>&1 && break
    sleep 0.2
  done
fi

open "$URL"
