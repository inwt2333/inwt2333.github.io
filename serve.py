"""手机直传照片的本地服务。

用法（电脑上运行）:
    .venv/Scripts/python serve.py        # Windows
    .venv/bin/python serve.py            # macOS / Linux

手机与电脑连接同一 Wi-Fi，用手机浏览器打开启动后打印的局域网地址，
进入「上传」页面，输入终端里显示的 4 位配对码后选择照片。照片会以
原始文件形式（EXIF 定位完整保留）保存到 photos/src/，全部传完后
自动运行 build.py 重新构建索引。

安全设计（服务只监听局域网，但仍以防所在的 Wi-Fi 并不可信）：
- 每次启动生成 4 位配对码，上传必须携带；
- 静态文件只暴露站点白名单目录（.git / photos/src / 脚本等一律不可读）；
- 单文件上限 80MB。

仅限局域网内使用；Ctrl+C 停止。首次运行若弹出防火墙提示，请选择「允许」。
"""
import json
import hashlib
import os
import random
import socket
import subprocess
import sys
import threading
from pathlib import Path
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from urllib.parse import urlparse, parse_qs, unquote

PORT = 8199
ROOT = os.path.dirname(os.path.abspath(__file__))
SRC_DIR = os.path.join(ROOT, 'photos', 'src')
ALLOWED_EXT = {'.jpg', '.jpeg', '.png', '.heic', '.heif'}
MAX_UPLOAD = 80 * 1024 * 1024  # 单文件 80MB 上限

PIN = f'{random.randint(0, 9999):04d}'  # 每次启动随机生成，打印在终端

# 手机预览可访问的范围：站点页面与其依赖，其余（.git、photos/src、脚本）一律 404
ALLOWED_GET = {
    '/', '/index.html', '/essays.html', '/gallery.html', '/article.html',
    '/food.html', '/food.json', '/about.html', '/friends.html', '/404.html', '/locate.html',
    '/photos.json', '/photos/manual.json', '/posts.json',
    '/feed.xml', '/sitemap.xml', '/robots.txt', '/favicon.ico',
}
ALLOWED_GET_PREFIX = ('/music/', '/food/web/', '/food/thumb/', '/assets/', '/photos/web/', '/photos/thumb/', '/posts/', '/post/', '/gym/')


def _get_allowed(path):
    """静态预览白名单：拦截目录穿越与一切非站点文件"""
    path = unquote(path).replace('\\', '/')
    if '/../' in path or path.startswith('../'):
        return False
    if path in ALLOWED_GET:
        return True
    return any(path.startswith(p) for p in ALLOWED_GET_PREFIX)


UPLOAD_PAGE = """<!doctype html>
<html lang="zh-CN">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>照片直传 · Inwt 的摄影集</title>
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
    .sub { color: #9a9aa0; font-size: 0.82rem; line-height: 1.8; text-align: center; margin-bottom: 26px; }
    .pin-row {
        display: flex; align-items: center; gap: 12px; margin-bottom: 30px;
        color: #9a9aa0; font-size: 0.82rem;
    }
    .pin-row input {
        width: 110px; background: rgba(255,255,255,.06); color: #f5f5f7;
        border: 1px solid rgba(255,255,255,.25); border-radius: 10px;
        padding: 10px 0; text-align: center; font-size: 1.25rem; letter-spacing: .45em;
        font-family: ui-monospace, Menlo, monospace; outline: none;
    }
    .pin-row input:focus { border-color: #30d158; }
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
    #go:disabled { opacity: .45; }
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
    <a href="/food-edit" style="color:#cdb88e;font-size:14px;margin:10px 0 20px">编辑已有美食照片 →</a>
    <p class="sub">输入电脑终端显示的 4 位配对码连接，<br>照片原样上传（保留拍摄定位），传完自动构建，git push 即可发布。</p>

    <div class="pin-row">
        <span class="mono">PIN</span>
        <input id="pin" inputmode="numeric" maxlength="4" placeholder="····" autocomplete="off">
    </div>

    <label for="collection" style="margin-bottom:20px">上传到
        <select id="collection" style="font:inherit;padding:10px;background:#242426;color:white;border-radius:8px">
            <option value="photos">摄影集</option><option value="food">深夜食堂</option>
        </select>
    </label>
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
const pin = document.getElementById('pin');
const go = document.getElementById('go');
const list = document.getElementById('list');
const summary = document.getElementById('summary');
const collection = document.getElementById('collection');
if (new URLSearchParams(location.search).get('collection') === 'food') collection.value = 'food';
const pinOk = () => /^\\d{4}$/.test(pin.value);

function refresh() {
    const ready = pinOk() && input.files.length;
    go.style.display = input.files.length ? 'block' : 'none';
    go.disabled = !ready;
}
pin.addEventListener('input', refresh);
input.addEventListener('change', () => {
    document.getElementById('n').textContent = input.files.length;
    list.innerHTML = ''; summary.textContent = '';
    refresh();
});

go.addEventListener('click', async () => {
    if (!pinOk()) { summary.textContent = '请先输入配对码。'; return; }
    go.disabled = true; go.textContent = '上传中…';
    const destination = collection.value;
    collection.disabled = true;
    let ok = 0, fail = 0, badPin = false;
    for (const f of input.files) {
        const row = document.createElement('div');
        const filename = document.createElement('span'); filename.textContent = f.name;
        const status = document.createElement('span'); status.className = 'doing'; status.textContent = '…';
        row.append(filename, status);
        list.appendChild(row);
        try {
            const r = await fetch('/upload?name=' + encodeURIComponent(f.name) + '&collection=' + destination + '&pin=' + pin.value,
                                  { method: 'POST', body: f });
            if (r.status === 403) { badPin = true; throw new Error(403); }
            if (!r.ok) throw new Error(r.status);
            row.lastChild.className = 'ok'; row.lastChild.textContent = 'OK'; ok++;
        } catch (e) {
            row.lastChild.className = 'fail';
            row.lastChild.textContent = badPin ? '配对码错误' : '失败';
            fail++;
        }
        if (badPin) break;
    }
    let total = '';
    if (!badPin) {
        try {
            const r = await fetch('/upload?done=1&collection=' + destination + '&pin=' + pin.value, { method: 'POST' });
            if (!r.ok) throw new Error(r.status);
            const j = await r.json();
            if (!j.ok) throw new Error('build');
            total = destination === 'food' ? `深夜食堂现共 <b>${j.total}</b> 张照片 · <b>${j.meals}</b> 张小票` : `相册现共 <b>${j.total}</b> 张（${j.located} 张有定位）`;
        } catch (e) { total = '构建未完成，请在电脑上手动运行 build.py'; }
        summary.innerHTML = `上传完成：<b>${ok}</b> 张成功${fail ? `，<b style="color:#ff453a">${fail}</b> 张失败` : ''}。<br>${total}<br>在电脑上 <span class="mono">git add -A && git commit && git push</span> 即可发布。`;
    } else {
        summary.innerHTML = '<b style="color:#ff453a">配对码不正确</b>，请核对电脑终端显示的 4 位数字。';
    }
    collection.disabled = false;
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
_build_timers = {}
_build_lock = threading.Lock()
_execution_lock = threading.Lock()


def run_build(collection='photos'):
    with _execution_lock:
        r = subprocess.run([sys.executable, 'food_build.py' if collection == 'food' else 'build.py'], cwd=ROOT, capture_output=True, text=True)
    print(r.stdout or r.stderr, flush=True)


def schedule_build(collection='photos'):
    with _build_lock:
        timer = _build_timers.get(collection)
        if timer:
            timer.cancel()
        timer = threading.Timer(4.0, run_build, args=(collection,))
        _build_timers[collection] = timer
        timer.start()


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
        parsed = urlparse(self.path)
        if parsed.path == '/music-edit':
            assets = Path(ROOT) / 'assets/music'
            version = hashlib.sha256((assets/'editor.css').read_bytes() + (assets/'editor.js').read_bytes()).hexdigest()[:12]
            page = (Path(ROOT)/'tools/music-editor.html').read_text(encoding='utf-8').replace('__EDITOR_ASSET_VERSION__', version)
            self._send(200, page, 'text/html; charset=utf-8')
            return
        if parsed.path == '/api/music-edit':
            if self.headers.get('X-Edit-Pin') != PIN:
                self._send(403, json.dumps({'error': '配对码不正确'}), 'application/json')
                return
            from music_editor import read_state
            with _execution_lock:
                self._send(200, json.dumps(read_state(ROOT)), 'application/json')
            return
        if parsed.path == '/food-edit':
            self._send(200, (Path(ROOT)/'tools/food-editor.html').read_text(encoding='utf-8'), 'text/html; charset=utf-8')
            return
        if parsed.path == '/api/food-edit':
            if self.headers.get('X-Edit-Pin') != PIN:
                self._send(403, json.dumps({'error': '配对码不正确'}), 'application/json')
                return
            from food_editor import read_state
            with _execution_lock:
                self._send(200, json.dumps(read_state(ROOT)), 'application/json')
            return
        if parsed.path == '/upload':
            self._send(200, UPLOAD_PAGE, 'text/html; charset=utf-8')
            return
        if parsed.path == '/favicon.ico':
            self._send(404, '', 'text/plain')
            return
        if not _get_allowed(parsed.path):
            self._send(404, 'not found', 'text/plain; charset=utf-8')
            return
        super().do_GET()

    def _edit_food(self):
        if self.headers.get('X-Edit-Pin') != PIN:
            self._send(403, json.dumps({'error': '配对码不正确'}), 'application/json')
            return
        from food_editor import save_edits, EditConflict
        try:
            length = int(self.headers.get('Content-Length', '0'))
            if not 0 < length <= 2 * 1024 * 1024:
                raise ValueError('保存内容为空或过大')
            payload = json.loads(self.rfile.read(length))
            with _execution_lock:
                state = save_edits(ROOT, payload)
            self._send(200, json.dumps(state), 'application/json')
        except EditConflict as error:
            self._send(409, json.dumps({'error': str(error)}), 'application/json')
        except (ValueError, UnicodeDecodeError) as error:
            self._send(400, json.dumps({'error': str(error)}), 'application/json')
        except Exception:
            self._send(500, json.dumps({'error': '保存或构建失败，原有说明已保留，请检查终端后重试。'}), 'application/json')

    def _music_request(self, recognize_only=False):
        if self.headers.get('X-Edit-Pin') != PIN:
            self._send(403, json.dumps({'error': '配对码不正确'}), 'application/json')
            return
        from music_editor import save_edit, recognize, EditConflict
        try:
            length = int(self.headers.get('Content-Length', '0'))
            if not 0 < length <= 256 * 1024:
                raise ValueError('内容为空或过大。')
            payload = json.loads(self.rfile.read(length))
            if not isinstance(payload, dict):
                raise ValueError('内容格式不正确。')
            if recognize_only:
                state = recognize(payload.get('text'))
            else:
                with _execution_lock:
                    state = save_edit(ROOT, payload)
            self._send(200, json.dumps(state), 'application/json')
        except EditConflict as error:
            self._send(409, json.dumps({'error': str(error)}), 'application/json')
        except (ValueError, UnicodeDecodeError) as error:
            self._send(400, json.dumps({'error': str(error)}), 'application/json')
        except Exception:
            self._send(500, json.dumps({'error': '操作失败，当前输入已保留，请检查终端后重试。'}), 'application/json')

    def do_POST(self):
        parsed = urlparse(self.path)
        if parsed.path in ('/api/music-edit', '/api/music-recognize'):
            self._music_request(parsed.path == '/api/music-recognize')
            return
        if parsed.path == '/api/food-edit':
            self._edit_food()
            return
        if parsed.path != '/upload':
            self._send(404, '{"ok":false}', 'application/json')
            return
        query = parse_qs(parsed.query)

        if query.get('pin', [''])[0] != PIN:
            self._send(403, json.dumps({'ok': False, 'error': '配对码不正确'}), 'application/json')
            return

        collection = query.get('collection', ['photos'])[0]
        if collection not in ('photos', 'food'):
            self._send(400, '{"ok":false}', 'application/json')
            return
        src_dir = SRC_DIR if collection == 'photos' else os.path.join(ROOT, 'food', 'src')

        if query.get('done'):
            # 手机端的“完成”信号：立即构建（若自动构建已在计时则取消）
            with _build_lock:
                timer = _build_timers.pop(collection, None)
                if timer:
                    timer.cancel()
            print('—— 收到完成信号，开始构建 ——', flush=True)
            with _execution_lock:
                r = subprocess.run([sys.executable, 'food_build.py' if collection == 'food' else 'build.py'], cwd=ROOT, capture_output=True, text=True)
            print(r.stdout or r.stderr, flush=True)
            try:
                if collection == 'food':
                    meals = json.load(open(os.path.join(ROOT, 'food.json'), encoding='utf-8'))
                    self._send(200, json.dumps({'ok': r.returncode == 0, 'total': sum(len(m['photos']) for m in meals), 'meals': len(meals)}), 'application/json')
                    return
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
        if length <= 0:
            self._send(400, json.dumps({'ok': False, 'error': '空文件'}), 'application/json')
            return
        if length > MAX_UPLOAD:
            self._send(413, json.dumps({'ok': False, 'error': '文件过大（上限 80MB）'}), 'application/json')
            return
        data = self.rfile.read(length)

        os.makedirs(src_dir, exist_ok=True)
        target = os.path.join(src_dir, name)
        digest = hashlib.sha256(data).hexdigest()
        collision = os.path.exists(target) and Path(target).read_bytes() != data
        # Other devices sync the index, not originals. Respect their identities too.
        index_path = Path(ROOT) / 'food.json'
        if collection == 'food' and index_path.exists():
            indexed = json.loads(index_path.read_text(encoding='utf-8'))
            previous = next((p for meal in indexed for p in meal['photos'] if p['file'] == name), None)
            if previous and previous.get('sha256') != digest:
                collision = True
        if collision:
            base, e = os.path.splitext(name)
            target = os.path.join(src_dir, f"{base}_{digest[:16]}{e}")
        with open(target, 'wb') as f:
            f.write(data)
        print(f'已保存 {os.path.basename(target)}（{len(data) / 1e6:.1f}MB）', flush=True)
        schedule_build(collection)
        self._send(200, json.dumps({'ok': True, 'saved': os.path.basename(target)}), 'application/json')


def main():
    os.makedirs(SRC_DIR, exist_ok=True)
    ip = lan_ip()
    server = ThreadingHTTPServer(('0.0.0.0', PORT), Handler)
    print(f"""
照片直传服务已启动（仅限局域网使用，Ctrl+C 停止）：

  本机预览   http://127.0.0.1:{PORT}/gallery.html
  手机直传   http://{ip}:{PORT}/upload      <- 手机与电脑连同一 Wi-Fi，浏览器打开

  美食编辑   http://127.0.0.1:{PORT}/food-edit
  音乐编辑   http://127.0.0.1:{PORT}/music-edit
  留声室     http://127.0.0.1:{PORT}/music/

  本次配对码（手机页面上输入）：{PIN}
  手机也可以打开 http://{ip}:{PORT}/gallery.html 先预览当前相册。
  首次运行如弹出防火墙提示，请选择「允许」。
""")
    try:
        server.serve_forever()
    except KeyboardInterrupt:
        print('\n服务已停止。')


if __name__ == '__main__':
    main()
