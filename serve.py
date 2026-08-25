"""手机直传照片的本地服务。

用法（电脑上运行）:
    .venv/Scripts/python serve.py        # Windows
    .venv/bin/python serve.py            # macOS / Linux

手机与电脑连接同一 Wi-Fi，用手机浏览器打开启动后打印的局域网地址，
进入「上传」页面选择照片，照片会以原始文件形式（EXIF 定位完整保留）
保存到 photos/src/，全部传完后自动运行 build.py 重新构建索引。

仅限局域网内使用；Ctrl+C 停止。首次运行若弹出防火墙提示，请选择「允许」。
"""
import json
import os
import socket
import subprocess
import sys
import threading
import time
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from urllib.parse import urlparse, parse_qs, unquote

PORT = 8199
ROOT = os.path.dirname(os.path.abspath(__file__))
SRC_DIR = os.path.join(ROOT, 'photos', 'src')
ALLOWED_EXT = {'.jpg', '.jpeg', '.png', '.heic', '.heif'}

UPLOAD_PAGE = """<!doctype html>
<html lang="zh-CN">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>照片直传 · 咕咕鸽的摄影集</title>
<style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body {
        background: #0a0a0c; color: #f5f5f7;
        font-family: -apple-system, BlinkMacSystemFont, 'Noto Sans SC', 'PingFang SC', sans-serif;
        min-height: 100vh; display: flex; flex-direction: column; align-items: center;
        padding: 40px 20px 60px; -webkit-font-smoothing: antialiased;
    }
    .mono { font-family: ui-monospace, Menlo, monospace; }
    .eyebrow { font-size: 0.68rem; letter-spacing: 0.4em; color: #9a9aa0; margin-bottom: 14px; }
    h1 { font-size: 1.6rem; letter-spacing: 0.2em; margin-bottom: 8px; }
    .sub { color: #9a9aa0; font-size: 0.82rem; line-height: 1.8; text-align: center; margin-bottom: 30px; }
    label.btn {
        display: block; width: min(420px, 86vw); text-align: center;
        border: 1px dashed rgba(255,255,255,.3); border-radius: 16px;
        padding: 40px 20px; cursor: pointer; transition: border-color .2s, background .2s;
    }
    label.btn:active { background: rgba(255,255,255,.06); }
    label.btn .icon { font-size: 2rem; }
    label.btn p { margin-top: 12px; font-size: 0.92rem; }
    label.btn small { display: block; margin-top: 6px; color: #9a9aa0; font-size: 0.72rem; }
    input[type=file] { display: none; }
    #go {
        display: none; width: min(420px, 86vw); margin-top: 18px;
        border: 0; border-radius: 999px; padding: 14px 0;
        background: #0a84ff; color: #fff; font-size: 1rem; font-weight: 600;
    }
    #list { width: min(420px, 86vw); margin-top: 20px; font-size: 0.78rem; line-height: 2; }
    #list div { display: flex; justify-content: space-between; gap: 10px; word-break: break-all; }
    .ok { color: #30d158; } .fail { color: #ff453a; } .doing { color: #ffd60a; }
    #summary { margin-top: 18px; color: #9a9aa0; font-size: 0.8rem; line-height: 1.9; text-align: center; }
    #summary b { color: #f5f5f7; }
</style>
</head>
<body>
    <div class="eyebrow mono">DIRECT UPLOAD</div>
    <h1>照片直传</h1>
    <p class="sub">选择照片后原样上传（保留拍摄定位），<br>传完自动构建，之后在电脑上 git push 即可发布。</p>

    <label class="btn" for="file">
        <span class="icon">📷</span>
        <p>点击选择照片</p>
        <small>支持 HEIC / JPG / PNG，可多选</small>
    </label>
    <input type="file" id="file" multiple accept="image/heic,image/heif,image/jpeg,image/png">
    <button id="go">开始上传（<span id="n">0</span> 张）</button>
    <div id="list" class="mono"></div>
    <div id="summary"></div>

<script>
const input = document.getElementById('file');
const go = document.getElementById('go');
const list = document.getElementById('list');
const summary = document.getElementById('summary');

input.addEventListener('change', () => {
    const n = input.files.length;
    document.getElementById('n').textContent = n;
    go.style.display = n ? 'block' : 'none';
    list.innerHTML = ''; summary.textContent = '';
});

go.addEventListener('click', async () => {
    go.disabled = true; go.textContent = '上传中…';
    let ok = 0, fail = 0;
    for (const f of input.files) {
        const row = document.createElement('div');
        row.innerHTML = `<span>${f.name}</span><span class="doing">…</span>`;
        list.appendChild(row);
        try {
            const r = await fetch('/upload?name=' + encodeURIComponent(f.name), { method: 'POST', body: f });
            if (!r.ok) throw new Error(r.status);
            row.lastChild.className = 'ok'; row.lastChild.textContent = 'OK'; ok++;
        } catch (e) {
            row.lastChild.className = 'fail'; row.lastChild.textContent = '失败'; fail++;
        }
    }
    let total = '';
    try {
        const r = await fetch('/upload?done=1', { method: 'POST' });
        const j = await r.json();
        total = `相册现共 <b>${j.total}</b> 张（${j.located} 张有定位）`;
    } catch (e) { total = '构建未完成，请在电脑上手动运行 build.py'; }
    summary.innerHTML = `上传完成：<b>${ok}</b> 张成功${fail ? `，<b style="color:#ff453a">${fail}</b> 张失败` : ''}。<br>${total}<br>在电脑上 <span class="mono">git add -A && git commit && git push</span> 即可发布。`;
    go.textContent = '已完成，可再选一批'; go.disabled = false;
    input.value = ''; go.style.display = 'none';
});
</script>
</body>
</html>"""


def lan_ip():
    s = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
    try:
        s.connect(('8.8.8.8', 80))
        return s.getsockname()[0]
    except OSError:
        return '127.0.0.1'
    finally:
        s.close()


# 上传停止 4 秒后自动构建（手机端页面被切后台导致“完成”信号丢失时也能触发）
_build_timer = None
_build_lock = threading.Lock()


def run_build():
    r = subprocess.run([sys.executable, 'build.py'], cwd=ROOT, capture_output=True, text=True)
    print(r.stdout or r.stderr, flush=True)


def schedule_build():
    global _build_timer
    with _build_lock:
        if _build_timer:
            _build_timer.cancel()
        _build_timer = threading.Timer(4.0, run_build)
        _build_timer.start()


class Handler(SimpleHTTPRequestHandler):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=ROOT, **kwargs)

    def log_message(self, fmt, *args):
        sys.stdout.write('%s - %s\n' % (self.address_string(), fmt % args))

    def _send(self, code, body, ctype):
        if isinstance(body, str):
            body = body.encode('utf-8')
        self.send_response(code)
        self.send_header('Content-Type', ctype)
        self.send_header('Content-Length', str(len(body)))
        self.send_header('Cache-Control', 'no-store')
        self.end_headers()
        self.wfile.write(body)

    def do_GET(self):
        if urlparse(self.path).path == '/upload':
            self._send(200, UPLOAD_PAGE, 'text/html; charset=utf-8')
        else:
            super().do_GET()

    def do_POST(self):
        parsed = urlparse(self.path)
        if parsed.path != '/upload':
            self._send(404, '{"ok":false}', 'application/json')
            return
        query = parse_qs(parsed.query)

        if query.get('done'):
            # 手机端的“完成”信号：立即构建（若自动构建已在计时则取消）
            with _build_lock:
                if _build_timer:
                    _build_timer.cancel()
            print('—— 收到完成信号，开始构建 ——', flush=True)
            r = subprocess.run([sys.executable, 'build.py'], cwd=ROOT, capture_output=True, text=True)
            print(r.stdout or r.stderr, flush=True)
            try:
                photos = json.load(open(os.path.join(ROOT, 'photos.json'), encoding='utf-8'))
                located = sum(1 for p in photos if p.get('lat') is not None)
                self._send(200, json.dumps({'ok': r.returncode == 0, 'total': len(photos), 'located': located}), 'application/json')
            except Exception as e:
                self._send(200, json.dumps({'ok': False, 'total': 0, 'located': 0}), 'application/json')
            return

        name = unquote((query.get('name') or [''])[0]).split('/')[-1].split('\\')[-1].strip()
        ext = os.path.splitext(name)[1].lower()
        if not name or ext not in ALLOWED_EXT:
            self._send(400, json.dumps({'ok': False, 'error': '不支持的文件类型'}), 'application/json')
            return

        length = int(self.headers.get('Content-Length') or 0)
        data = self.rfile.read(length)
        if not data:
            self._send(400, json.dumps({'ok': False, 'error': '空文件'}), 'application/json')
            return

        os.makedirs(SRC_DIR, exist_ok=True)
        target = os.path.join(SRC_DIR, name)
        if os.path.exists(target) and os.path.getsize(target) != len(data):
            # 同名但内容不同（如相机计数器循环），加时间戳避免覆盖
            base, e = os.path.splitext(name)
            target = os.path.join(SRC_DIR, f"{base}_{int(time.time())}{e}")
        with open(target, 'wb') as f:
            f.write(data)
        print(f'已保存 {os.path.basename(target)}（{len(data) / 1e6:.1f}MB）', flush=True)
        schedule_build()
        self._send(200, json.dumps({'ok': True, 'saved': os.path.basename(target)}), 'application/json')


def main():
    os.makedirs(SRC_DIR, exist_ok=True)
    ip = lan_ip()
    server = ThreadingHTTPServer(('0.0.0.0', PORT), Handler)
    print(f"""
照片直传服务已启动（仅限局域网使用，Ctrl+C 停止）：

  本机预览   http://127.0.0.1:{PORT}/gallery.html
  手机直传   http://{ip}:{PORT}/upload      <- 手机与电脑连同一 Wi-Fi，浏览器打开

  手机也可以打开 http://{ip}:{PORT}/gallery.html 先预览当前相册。
  首次运行如弹出防火墙提示，请选择「允许」。
""")
    try:
        server.serve_forever()
    except KeyboardInterrupt:
        print('\n服务已停止。')


if __name__ == '__main__':
    main()
