#!/usr/bin/env python3
"""山旅帖ローカルサーバー。

静的ファイル配信（従来の python3 -m http.server 8765 と同等）に加えて、
POST /api/publish で計画書HTMLの保存と git add/commit/push を行う。
"""
import json
import re
import subprocess
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path

ROOT = Path(__file__).resolve().parent
PORT = 8765


class Handler(SimpleHTTPRequestHandler):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=str(ROOT), **kwargs)

    def end_headers(self):
        # ブラウザに古いキャッシュを使わせない（毎回サーバーへ更新確認させる）
        self.send_header('Cache-Control', 'no-cache')
        super().end_headers()

    def _send_json(self, status, obj):
        body = json.dumps(obj, ensure_ascii=False).encode('utf-8')
        self.send_response(status)
        self.send_header('Content-Type', 'application/json; charset=utf-8')
        self.send_header('Content-Length', str(len(body)))
        self.end_headers()
        self.wfile.write(body)

    def do_POST(self):
        if self.path != '/api/publish':
            self.send_error(404)
            return

        try:
            length = int(self.headers.get('Content-Length', 0))
            data = json.loads(self.rfile.read(length))
            slug = data['slug']
            html = data['html']
        except (ValueError, KeyError, json.JSONDecodeError):
            self._send_json(400, {'ok': False, 'error': 'リクエストの形式が不正です'})
            return

        # ファイル名として安全な slug のみ受け付ける（パス区切り・先頭ドットを拒否）
        if not isinstance(slug, str) or not isinstance(html, str) \
                or not re.fullmatch(r'[^/\\\x00]+', slug) or slug.startswith('.'):
            self._send_json(400, {'ok': False, 'error': 'ファイル名が不正です'})
            return

        plans_dir = ROOT / 'plans'
        plans_dir.mkdir(exist_ok=True)
        (plans_dir / f'{slug}.html').write_text(html, encoding='utf-8')

        commands = [
            ['git', 'add', 'plans/'],
            ['git', 'commit', '-m', f'山旅帖: 計画書を追加 ({slug})'],
            ['git', 'push'],
        ]
        for cmd in commands:
            try:
                result = subprocess.run(
                    cmd, cwd=ROOT, capture_output=True, text=True, timeout=120)
            except subprocess.TimeoutExpired:
                self._send_json(500, {'ok': False, 'error': f'{" ".join(cmd[:2])} がタイムアウトしました'})
                return
            if result.returncode != 0:
                detail = (result.stderr or result.stdout).strip()
                self._send_json(500, {'ok': False, 'error': f'{" ".join(cmd[:2])} に失敗しました: {detail}'})
                return

        self._send_json(200, {'ok': True})


if __name__ == '__main__':
    server = ThreadingHTTPServer(('127.0.0.1', PORT), Handler)
    print(f'山旅帖サーバー起動: http://localhost:{PORT}/index.html')
    server.serve_forever()
