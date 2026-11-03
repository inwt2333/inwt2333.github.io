import json
import tempfile
import unittest
from pathlib import Path
import sys
sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

class FoodEditorTest(unittest.TestCase):
    def test_save_clear_and_date_without_originals(self):
        import food_editor
        with tempfile.TemporaryDirectory() as tmp:
            root = Path(tmp)
            (root/'food').mkdir()
            photo = {'file':'remote.HEIC','web':'food/web/a.webp','thumb':'food/thumb/a.webp','source_date':'2026-11-01','date':'2026-11-01'}
            (root/'food.json').write_text(json.dumps([{'date':'2026-11-01','photos':[photo]}]))
            (root/'food/manual.json').write_text(json.dumps({'meals':{'2026-11-01':{'note':'保留整日备注'}},'photos':{}}))
            state=food_editor.read_state(root)
            result=food_editor.save_edits(root, {'revision':state['revision'],'photos':[{'file':'remote.HEIC','date':'2026-11-02','location':'街边店','dish':'牛肉面','note':'<script>文字</script>'}]})
            saved=result['photos'][0]
            self.assertEqual(saved['date'],'2026-11-02')
            self.assertEqual(saved['dish'],'牛肉面')
            self.assertEqual(saved['note'],'<script>文字</script>')
            manual=json.loads((root/'food/manual.json').read_text())
            self.assertEqual(manual['meals']['2026-11-01']['note'],'保留整日备注')
            with self.assertRaises(food_editor.EditConflict):
                food_editor.save_edits(root, {'revision':state['revision'],'photos':[]})
            result=food_editor.save_edits(root, {'revision':result['revision'],'photos':[{'file':'remote.HEIC','date':'','location':'','dish':'','note':''}]})
            self.assertEqual(result['photos'][0]['date'],'2026-11-01')
            self.assertEqual(result['photos'][0]['dish'],'')
            for invalid in [{'file':'unknown.jpg','dish':'x'},{'file':'remote.HEIC','date':'2026-02-30'},{'file':'remote.HEIC','note':3}]:
                before=(root/'food/manual.json').read_bytes()
                with self.assertRaises(ValueError):
                    food_editor.save_edits(root, {'revision':result['revision'],'photos':[invalid]})
                self.assertEqual(before,(root/'food/manual.json').read_bytes())

    def test_multiple_dishes_legacy_and_clear(self):
        import food_editor
        with tempfile.TemporaryDirectory() as tmp:
            root=Path(tmp); (root/'food').mkdir()
            (root/'food.json').write_text(json.dumps([{'photos':[{'file':'a.jpg','date':'2026-11-01','source_date':'2026-11-01','dish':'旧菜名'}]}]))
            (root/'food/manual.json').write_text(json.dumps({'photos':{'a.jpg':{'dish':'旧菜名'}}}))
            state=food_editor.read_state(root)
            self.assertEqual(state['photos'][0]['dishes'],[{'name':'旧菜名','price':'','note':''}])
            saved=food_editor.save_edits(root,{'revision':state['revision'],'photos':[{'file':'a.jpg','dishes':[{'name':' 牛肉面 ','price':'18.50'},{'name':'小笼包','price':''}]}]})
            self.assertEqual(saved['photos'][0]['dishes'],[{'name':'牛肉面','price':'18.50','note':''},{'name':'小笼包','price':'','note':''}])
            for invalid in ['牛肉面',[3],['x'*201],[{'name':'面','price':'-1'}],[{'name':'面','price':'1.234'}]]:
                with self.assertRaises(ValueError):
                    food_editor.save_edits(root,{'revision':saved['revision'],'photos':[{'file':'a.jpg','dishes':invalid}]})
            cleared=food_editor.save_edits(root,{'revision':saved['revision'],'photos':[{'file':'a.jpg','dishes':[]}]})
            self.assertEqual(cleared['photos'][0]['dishes'],[])
            self.assertEqual(cleared['photos'][0]['dish'],'')

    def test_dish_notes_and_shared_meal_note(self):
        import food_editor
        with tempfile.TemporaryDirectory() as tmp:
            root=Path(tmp);(root/'food').mkdir()
            (root/'food.json').write_text(json.dumps([{'date':'2026-11-01','photos':[{'file':name,'date':'2026-11-01','source_date':'2026-11-01'} for name in ['a.jpg','b.jpg']]}]))
            state=food_editor.read_state(root)
            saved=food_editor.save_edits(root,{'revision':state['revision'],'photos':[{'file':'a.jpg','dishes':[{'name':'面','price':'12','note':'汤很好喝'}]}],'meals':[{'date':'2026-11-01','note':'整顿饭很满意'}]})
            self.assertEqual(saved['photos'][0]['dishes'][0]['note'],'汤很好喝')
            self.assertEqual(saved['meals'][0]['note'],'整顿饭很满意')
            cleared=food_editor.save_edits(root,{'revision':saved['revision'],'photos':[],'meals':[{'date':'2026-11-01','note':''}]})
            self.assertEqual(cleared['meals'][0]['note'],'')

    def test_http_requires_pin_and_persists_valid_edits(self):
        import serve
        import threading
        import urllib.request
        import urllib.error
        from unittest.mock import patch
        with tempfile.TemporaryDirectory() as tmp:
            root=Path(tmp)
            (root/'food').mkdir()
            (root/'food/manual.json').write_text('{"photos":{},"meals":{}}')
            (root/'food.json').write_text(json.dumps([{'photos':[{'file':'a.jpg','date':'2026-11-01','source_date':'2026-11-01','web':'food/web/a.webp','thumb':'food/thumb/a.webp'}]}]))
            with patch.object(serve,'ROOT',tmp):
                server=serve.ThreadingHTTPServer(('127.0.0.1',0),serve.Handler)
                thread=threading.Thread(target=server.serve_forever,daemon=True);thread.start()
                url=f'http://127.0.0.1:{server.server_port}/api/food-edit'
                def request(method='GET',payload=None,pin=None):
                    req=urllib.request.Request(url, data=json.dumps(payload).encode() if payload is not None else None, method=method,headers={'X-Edit-Pin':pin or ''})
                    try:
                        with urllib.request.urlopen(req) as r: return r.status,json.load(r)
                    except urllib.error.HTTPError as error: return error.code,json.load(error)
                try:
                    self.assertEqual(request()[0],403)
                    code,state=request(pin=serve.PIN);self.assertEqual(code,200)
                    payload={'revision':state['revision'],'photos':[{'file':'a.jpg','dish':'热面','location':'上海','note':'雨天'}]}
                    self.assertEqual(request('POST',payload)[0],403)
                    code,result=request('POST',payload,serve.PIN)
                    self.assertEqual(code,200);self.assertEqual(result['photos'][0]['dish'],'热面')
                    self.assertEqual(request('POST',payload,serve.PIN)[0],409)
                    self.assertEqual(request('POST',{'revision':result['revision'],'photos':[{'file':'a.jpg','date':'not-a-date'}]},serve.PIN)[0],400)
                finally:
                    server.shutdown();server.server_close();thread.join()
