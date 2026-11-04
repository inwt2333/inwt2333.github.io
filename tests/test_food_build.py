import json
import tempfile
import unittest
from pathlib import Path
import sys
from PIL import Image, TiffImagePlugin
sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

class FoodBuildTest(unittest.TestCase):
    def test_gps_only_for_named_places_and_preserved_without_originals(self):
        import food_build
        with tempfile.TemporaryDirectory() as tmp:
            root = Path(tmp)
            source = root / 'food/src'
            source.mkdir(parents=True)
            gps = Image.Exif()
            gps[0x8825] = {
                1: 'N', 2: tuple(TiffImagePlugin.IFDRational(v, 1) for v in (31, 14, 0)),
                3: 'E', 4: tuple(TiffImagePlugin.IFDRational(v, 1) for v in (121, 28, 0)),
            }
            for name, exif in [('named.jpg', gps), ('unnamed.jpg', gps), ('missing.jpg', Image.Exif())]:
                Image.new('RGB', (40, 60)).save(source / name, exif=exif)
            (root / 'food/manual.json').write_text(json.dumps({'photos': {
                'named.jpg': {'location': '测试餐厅'},
                'missing.jpg': {'location': '另一家店'},
            }}))
            food_build.build_food(root)
            photos = {p['file']: p for meal in json.loads((root / 'food.json').read_text()) for p in meal['photos']}
            self.assertEqual((photos['named.jpg']['lat'], photos['named.jpg']['lng']), (31.233333, 121.466667))
            self.assertNotIn('lat', photos['unnamed.jpg'])
            self.assertNotIn('lat', photos['missing.jpg'])
            for file in source.iterdir(): file.unlink()
            food_build.build_food(root)
            photos = {p['file']: p for meal in json.loads((root / 'food.json').read_text()) for p in meal['photos']}
            self.assertEqual((photos['named.jpg']['lat'], photos['named.jpg']['lng']), (31.233333, 121.466667))

    def test_dates_merge_preserve_and_override(self):
        import food_build
        with tempfile.TemporaryDirectory() as tmp:
            root = Path(tmp)
            (root / 'food/src').mkdir(parents=True)
            for name, date in [('a.jpg','2026:10:02 23:01:00'), ('b.jpg','2026:10:02 12:00:00'), ('c.jpg','2026:10:03 01:00:00'), ('missing.jpg',None)]:
                exif = Image.Exif()
                if date: exif[36867] = date
                Image.new('RGB', (40, 60)).save(root / 'food/src' / name, exif=exif)
            food_build.build_food(root)
            result = json.loads((root/'food.json').read_text(encoding='utf-8'))
            self.assertEqual(len(next(m for m in result if m['date']=='2026-10-02')['photos']), 2)
            first = (root/'food.json').read_text(encoding='utf-8')
            food_build.build_food(root)
            self.assertEqual(first, (root/'food.json').read_text(encoding='utf-8'))
            for file in (root/'food/src').iterdir(): file.unlink()
            (root/'food/manual.json').write_text(json.dumps({'photos': {'a.jpg': {'date':'2026-10-03'}}, 'meals': {'2026-10-03': {'title':'晚饭','note':'好吃','cover':'a.jpg'}}}))
            food_build.build_food(root)
            meals = json.loads((root/'food.json').read_text(encoding='utf-8'))
            meal = next(m for m in meals if m['date']=='2026-10-03')
            self.assertEqual(meal['title'], '晚饭')
            self.assertEqual(meal['cover'], 'a.jpg')
            self.assertEqual(len(meal['photos']), 2)
            self.assertEqual(sum(len(m['photos']) for m in meals), 4)
            self.assertTrue(all((root/p['web']).exists() for m in meals for p in m['photos']))

    def test_food_public_files_but_not_originals(self):
        import serve
        self.assertTrue(serve._get_allowed('/food.json'))
        self.assertTrue(serve._get_allowed('/food/web/a.webp'))
        for path in ['/food/src/a.jpg', '/food/manual.json', '/food/web/../src/a.jpg', '/food/web/%2e%2e/src/a.jpg']:
            self.assertFalse(serve._get_allowed(path))

class FoodUploadTest(unittest.TestCase):
    def test_upload_routing_without_pin_and_same_size_collision(self):
        import serve
        import threading
        import urllib.request
        import urllib.error
        from unittest.mock import patch
        with tempfile.TemporaryDirectory() as tmp:
            root = Path(tmp)
            with patch.multiple(serve, ROOT=tmp, SRC_DIR=str(root/'photos/src')), patch.object(serve, 'schedule_build'):
                server = serve.ThreadingHTTPServer(('127.0.0.1', 0), serve.Handler)
                thread = threading.Thread(target=server.serve_forever, daemon=True)
                thread.start()
                base = f'http://127.0.0.1:{server.server_port}'
                def post(query, data=b'first', origin=None):
                    request = urllib.request.Request(base+'/upload?'+query, data=data, headers={'Origin': origin} if origin else {})
                    try:
                        with urllib.request.urlopen(request) as response:
                            return response.status, json.load(response)
                    except urllib.error.HTTPError as error:
                        return error.code, None
                try:
                    self.assertEqual(post('name=a.jpg&collection=unknown')[0],400)
                    self.assertEqual(post('name=a.jpg&collection=food',origin='https://other.example')[0],403)
                    status, first = post('name=a.jpg&collection=food')
                    self.assertEqual(status,200)
                    self.assertTrue((root/'food/src/a.jpg').exists())
                    self.assertFalse((root/'photos/src/a.jpg').exists())
                    _, duplicate = post('name=a.jpg&collection=food')
                    self.assertEqual(first['saved'],duplicate['saved'])
                    _, different = post('name=a.jpg&collection=food',b'other')
                    self.assertNotEqual(first['saved'],different['saved'])
                    self.assertEqual((root/'food/src/a.jpg').read_bytes(),b'first')
                    self.assertEqual(post('name=p.jpg')[0],200)
                    self.assertTrue((root/'photos/src/p.jpg').exists())
                    # A synced index exists, but the other device's source does not.
                    (root/'food.json').write_text(json.dumps([{'photos':[{'file':'remote.jpg', 'sha256':'unknown'}]}]))
                    _, remote = post('name=remote.jpg&collection=food')
                    self.assertNotEqual(remote['saved'], 'remote.jpg')

                    try:
                        urllib.request.urlopen(base+'/food/src/a.jpg')
                        self.fail('originals exposed')
                    except urllib.error.HTTPError as error:
                        self.assertEqual(error.code,404)
                finally:
                    server.shutdown(); server.server_close(); thread.join()
