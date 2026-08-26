# inwt2333.github.io

个人主页：[inwt233.cn](https://inwt233.cn)。纯静态站点（GitHub Pages），无框架、无 CI。

## 页面

| 页面 | 说明 |
|---|---|
| `index.html` | 主页（Inwt 铁路图导航门厅，动态显示最新随笔与照片统计） |
| `resume/` | 简历页（**不公开**：无任何入口链接，已加 noindex 禁止搜索引擎收录，地址自留） |
| `essays.html` | 随笔 |
| `article.html` | 文章阅读页（Markdown + LaTeX） |
| `gallery.html` | 摄影集（沉浸式封面 + 章节流 + 足迹地图） |
| `locate.html` | 照片定位标注工具（仅本地使用） |

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
2. 运行 `python build.py` 重新生成索引。

## 摄影集：如何添加照片

### 方式一：手机直传（推荐）

电脑上运行（手机与电脑连同一 Wi-Fi）：

```bash
.venv/Scripts/python serve.py
```

按打印的提示用手机浏览器打开 `http://<电脑局域网IP>:8199/upload`，选择照片上传——照片以**原始文件**直传（EXIF 定位完整保留），传完自动构建索引，之后在电脑上 `git add -A && git commit && git push` 即可发布。手机也可以打开 `http://<IP>:8199/gallery.html` 预览当前相册。

### 方式二：电脑导入

1. 把照片放入 `photos/src/`（支持 JPG / PNG / HEIC；**iPhone 用数据线或 iCloud 下载导入可保留定位，微信/QQ 传输会丢失 EXIF 定位**）。
2. 运行 `python build.py`，脚本会自动：
   - 从 EXIF 提取拍摄时间与 GPS 坐标；
   - 生成网页版（`photos/web/`，**保留原始分辨率**的高保真 JPEG，lightbox 中加载的就是它）与缩略图（`photos/thumb/`，仅用于网格与地图）；
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
.venv/Scripts/pip install pillow pillow-heif   # macOS/Linux 为 .venv/bin/pip
```

之后构建用 `.venv/Scripts/python build.py`（未装依赖时运行 `python build.py` 仍会构建文章索引，只是跳过照片）。

### 说明

- 网页版图片保留原始分辨率（可在 `build.py` 顶部改 `WEB_MAX` / `WEB_QUALITY`；修改后需删除 `photos/web/` 里的旧图再重新构建）。
- 体积参考：全分辨率高质量 JPEG 每张约 3–8MB，GitHub 100MB 软限制约可容纳 15–30 张、1GB 硬限制约 150–300 张。照片再多时，可把 `WEB_MAX` 调回 4096 之类，或改用图床（`photos.json` 里存的是路径，换成外部 URL 页面代码无需改动）。
- `photos/src/`（原图）已加入 `.gitignore` 不入库——网页版已是原始分辨率，入库原图只会让体积翻倍（HEIC 还存在浏览器兼容问题），原图请自行备份。
- 在新电脑克隆仓库后重跑 `build.py`，已有的 `photos.json` 不会被清空。
- `photos.json` 对外公开且含坐标，敏感位置可在 `manual.json` 中覆盖为粗略坐标。
