# inwt2333.github.io

个人主页：[inwt233.cn](https://inwt233.cn)。纯静态站点（GitHub Pages），无框架、无 CI、无访问统计。

## 页面

| 页面 | 说明 |
|---|---|
| `index.html` | 主页（Inwt 铁路图导航门厅：线路命名与图例、发车信息牌、hover 联动聚焦、昼夜换肤、按 1–4 进站） |
| `resume/` | 简历页（**不公开**：无任何入口链接，已加 noindex 禁止搜索引擎收录，地址自留） |
| `essays.html` | 随笔（按年份分组；链接指向静态文章页） |
| `article.html` | 文章阅读页兜底（`?file=` 查询串模式；正式链接走 `post/<slug>/` 静态页） |
| `post/<slug>/` | 每篇随笔的静态页（build.py 生成，SEO 友好的独立 URL，含目录/进度条/上下篇） |
| `gallery.html` | 摄影集（沉浸式封面 + 章节流 + 足迹地图；灯箱含 EXIF 器材信息与原图下载） |
| `about.html` | 关于页 |
| `404.html` | 404 页（铁路主题） |
| `locate.html` | 照片定位标注工具（仅本地使用） |
| `feed.xml` / `sitemap.xml` / `robots.txt` | build.py 自动生成 |

## 随笔：如何添加文章

1. 在 `posts/` 新建 Markdown 文件，开头写 front matter：

   ```
   ---
   title: 文章标题
   date: 2025-08-24
   summary: 摘要（列表页显示）
   category: essay
   ---
   ```

   `category: essay` 的文章才会出现在随笔页；不写 category 视为笔记，不上列表。
2. 运行 `python build.py`，脚本会重新生成：
   - `posts.json`（索引，含每篇随笔的静态页地址 `url` 字段）；
   - `post/<slug>/`（每篇随笔的静态 HTML，正文预渲染，公式由页面检测到后按需加载 MathJax）；
   - `feed.xml`（RSS 订阅，最新 20 篇）与 `sitemap.xml`；
   - 照片相关产物（见下）。
3. 提示：新文章标题里的生僻字如果要出现在主页发车信息牌上，重跑一次
   `tools/make_fonts.py` 更新主页字体子集（子集未覆盖的字会回退系统字体，不影响功能）。

## 摄影集：如何添加照片

### 方式一：手机直传（推荐）

电脑上运行（手机与电脑连同一 Wi-Fi）：

```bash
.venv/Scripts/python serve.py
```

按打印的提示用手机浏览器打开 `http://<电脑局域网IP>:8199/upload`，**输入终端显示的 4 位配对码**后选择照片上传——照片以**原始文件**直传（EXIF 定位完整保留），传完自动构建索引，之后在电脑上 `git add -A && git commit && git push` 即可发布。手机也可以打开 `http://<IP>:8199/gallery.html` 预览当前相册。

服务每次启动生成新配对码；静态预览只暴露站点白名单目录（`.git/`、`photos/src/`、脚本等一律不可读），单文件上限 80MB。

### 方式二：电脑导入

1. 把照片放入 `photos/src/`（支持 JPG / PNG / HEIC；**iPhone 用数据线或 iCloud 下载导入可保留定位，微信/QQ 传输会丢失 EXIF 定位**）。
2. 运行 `python build.py`，脚本会自动：
   - 从 EXIF 提取拍摄时间、GPS 坐标与器材参数（机身 / 镜头 / 光圈 / 快门 / ISO，灯箱中展示）；
   - 生成网页版（`photos/web/`，WebP，长边上限 2560px）与缩略图（`photos/thumb/`，仅用于网格与地图）；
   - 更新 `photos.json`，并在控制台列出缺定位的照片。
3. 相机拍摄等无 GPS 的照片：本地起服务（`python -m http.server`）打开 `locate.html`，选中照片后在地图上点选位置，下载 `manual.json` 放入 `photos/`，重新运行 `python build.py`。
4. 想给照片加标题 / 地名 / 描述，或覆盖某张照片的坐标、指定相册封面，编辑 `photos/manual.json`：

    ```json
    {
      "cover": "IMG_0001.HEIC",
      "IMG_0001.HEIC": { "title": "外滩", "location": "上海", "lat": 31.24, "lng": 121.50, "desc": "", "date": "2025-05-01" }
    }
    ```

    字段均可省略；坐标优先级为 EXIF > manual.json > 上次索引；`cover` 指定封面照片（不指定则每次随机，并按屏幕方向只抽横版或竖版照片）。

### 首次准备构建环境

```bash
python -m venv .venv
.venv/Scripts/pip install pillow pillow-heif markdown   # macOS/Linux 为 .venv/bin/pip
```

之后构建用 `.venv/Scripts/python build.py`（未装依赖时运行 `python build.py` 仍会构建文章索引，只是跳过照片与静态文章页）。

### 说明

- 网页版图片长边上限 2560px（`build.py` 顶部 `WEB_MAX`，`None` 为保留原始分辨率；修改后需删除 `photos/web/` 里的旧图再重新构建）。2560px 足够全屏观看，单张约 0.4–1.2MB，仓库体积可控。
- `photos/src/`（原图）已加入 `.gitignore` 不入库——网页版已足够清晰，入库原图只会让体积翻倍（HEIC 还存在浏览器兼容问题），原图请自行备份。
- 在新电脑克隆仓库后重跑 `build.py`，已有的 `photos.json` 不会被清空。
- `photos.json` 对外公开且含坐标，敏感位置可在 `manual.json` 中覆盖为粗略坐标。

## 静态资产与工具

| 路径 | 说明 |
|---|---|
| `assets/fonts/` | 主页/404/关于页的自托管字体子集（Noto Sans SC 4 字重 + Space Mono，`tools/make_fonts.py` 生成）——大陆访问者不再依赖 Google Fonts |
| `assets/vendor/` | Leaflet / markercluster / marked 自托管副本（替代 unpkg / jsdelivr） |
| `assets/article.css` `assets/article.js` | 文章页共享样式与逻辑（查询串模式与静态页共用） |
| `assets/favicon.svg` 等 | 站点图标与 `og.png` 分享卡（`tools/make_assets.py` 生成） |
| `tools/fonts-src/` | 字体源文件（gitignore），重跑 `tools/make_fonts.py` 前确保存在 |

其余页面（随笔/文章/摄影集）的 Google 字体均为非阻塞加载：大陆访问者会立即看到系统字体版式，字体加载成功后无感替换。

## 隐私边界

- 公开身份只有 **Inwt**；`resume/` 为私有路径，无入口链接 + noindex，请勿在任何公开页面添加指向它的链接。
- 站点无访问统计、无第三方追踪脚本；MathJax 仅在文章含公式时按需加载（jsdelivr）。
