import json
from pathlib import Path
import sys
import tempfile
import unittest
import shutil
import subprocess
import xml.etree.ElementTree as ET
from html.parser import HTMLParser
from unittest.mock import patch

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
import build


class Tags(HTMLParser):
    def __init__(self, text):
        super().__init__()
        self.tags = []
        self.feed(text)

    def handle_starttag(self, tag, attrs):
        self.tags.append((tag, dict(attrs)))


class ProgressiveBuildTest(unittest.TestCase):
    def test_current_site_builds_in_isolation_with_all_public_content(self):
        source = Path(__file__).resolve().parents[1]
        with tempfile.TemporaryDirectory() as directory:
            root = Path(directory)
            for name in ['build.py', 'food_build.py', 'music_build.py', 'posts.json', 'photos.json', 'food.json', 'essays.html', 'gallery.html', 'food.html']:
                shutil.copy2(source / name, root / name)
            shutil.copytree(source / 'posts', root / 'posts')
            result = subprocess.run([sys.executable, 'build.py'], cwd=root, capture_output=True)
            self.assertEqual(result.returncode, 0, result.stderr.decode('utf8', errors='replace'))
            posts = json.loads((root / 'posts.json').read_text(encoding='utf8'))
            essays = [p for p in posts if p.get('category') == 'essay']
            self.assertEqual(len(list((root / 'post').glob('*/index.html'))), len(essays))
            for post in essays:
                self.assertTrue((root / post['url'] / 'index.html').is_file())
            photos = json.loads((root / 'photos.json').read_text(encoding='utf8'))
            self.assertEqual(photos, json.loads((source / 'photos.json').read_text(encoding='utf8')))
            self.assertEqual(len([a for tag, a in Tags((root / 'gallery.html').read_text(encoding='utf8')).tags if tag == 'img' and a.get('loading') == 'lazy']), len(photos))
            sitemap = ET.parse(root / 'sitemap.xml')
            urls = [el.text for el in sitemap.findall('.//{*}loc')]
            self.assertIn('https://inwt233.cn/food.html', urls)
            self.assertFalse(any('/resume' in url or '/xsy' in url for url in urls))
            self.assertEqual(len(ET.parse(root / 'feed.xml').findall('.//item')), min(20, len(essays)))

    def test_generated_regions_escape_text_and_preserve_surrounding_html(self):
        with tempfile.TemporaryDirectory() as directory:
            root = Path(directory)
            essays, gallery, photos, food = root / 'essays.html', root / 'gallery.html', root / 'photos.json', root / 'food.html'
            for file, marker in [(essays, 'ESSAY LINKS'), (gallery, 'PHOTO LINKS'), (food, 'FOOD LINKS')]:
                file.write_bytes(f'Before\r\n<!-- BEGIN {marker} -->\r\nOld\r\n<!-- END {marker} -->\r\nAfter'.encode())
            photos.write_text(json.dumps([{'web': 'photos/a.webp', 'thumb': 'photos/a-small.webp', 'title': '"<photo>&'}]), encoding='utf8')
            posts = [{'category': 'essay', 'file': 'a&b.md', 'title': '"<title>&', 'summary': '"<summary>&', 'date': '2026-01-02'}]
            with patch.multiple(build, ESSAYS_PAGE=str(essays), GALLERY_PAGE=str(gallery), FOOD_PAGE=str(food), PHOTOS_JSON=str(photos)):
                build.build_fallbacks(posts)
                initial = essays.read_bytes(), gallery.read_bytes()
                build.build_fallbacks(posts)
                self.assertEqual(initial, (essays.read_bytes(), gallery.read_bytes()))
            self.assertTrue(essays.read_bytes().startswith(b'Before\r\n'))
            self.assertTrue(essays.read_bytes().endswith(b'\r\nAfter'))
            self.assertNotIn('<title>', essays.read_text(encoding='utf8'))
            image = next(attrs for tag, attrs in Tags(gallery.read_text(encoding='utf8')).tags if tag == 'img')
            self.assertEqual(image['alt'], '"<photo>&')
            self.assertNotIn('onerror', image)

    def test_article_attributes_survive_quotes_and_escaped_summary_cutoff(self):
        with tempfile.TemporaryDirectory() as directory:
            root = Path(directory)
            source, output = root / 'source', root / 'post'
            source.mkdir()
            file = 'sample.md'
            (source / file).write_text('Body', encoding='utf8')
            title = 'A "quoted" title & <text>'
            summary = 'x' * 149 + '& beyond the cutoff'
            post = {'file': file, 'title': title, 'summary': summary, 'category': 'essay', 'date': '2026-01-02'}
            with patch.multiple(build, POSTS_DIR=str(source), POST_PAGES_DIR=str(output)):
                build.build_post_pages([post])
            tags = Tags((output / 'sample' / 'index.html').read_text(encoding='utf8')).tags
            description = next(attrs for tag, attrs in tags if tag == 'meta' and attrs.get('name') == 'description')
            self.assertEqual(description['content'], summary[:150])
            script = next(attrs for tag, attrs in tags if tag == 'script')
            self.assertEqual(script['data-title'], title)


if __name__ == '__main__':
    unittest.main()
