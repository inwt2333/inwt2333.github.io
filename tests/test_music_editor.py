import json
from pathlib import Path
import sys
import tempfile
import unittest
from unittest.mock import patch

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
import music_editor as editor
from music_build import build_music


class MusicEditorTest(unittest.TestCase):
    def setUp(self):
        self.directory = tempfile.TemporaryDirectory()
        self.addCleanup(self.directory.cleanup)
        self.root = Path(self.directory.name)
        self.track = {'title': '小提琴协奏曲', 'artist': '演奏者', 'room': 'classical', 'note': '第一行\n第二行 <script>只是文字</script>', 'excerpt': '喜欢的一小段', 'tags': ['协奏曲'], 'sourceId': '186016'}

    def save(self, **changes):
        return editor.save_edit(self.root, {'revision': editor.read_state(self.root)['revision'], 'track': {**self.track, **changes}})

    def test_link_forms_and_untrusted_urls(self):
        for text in ['186016', 'https://music.163.com/song?id=186016', 'https://music.163.com/#/song?id=186016', '分享歌曲 https://music.163.com/m/song?id=186016&userid=1 （来自网易云）', 'https://music.163.com/song/186016/']:
            self.assertEqual(editor.extract_song_id(text), '186016')
        for text in ['https://example.com/song?id=186016', 'https://music.163.com/playlist?id=186016', 'https://music.163.com.evil.test/song?id=186016', 'https://music.163.com:8080/song?id=186016', 'https://127.0.0.1/song?id=186016']:
            with self.assertRaises(ValueError):
                editor.extract_song_id(text)

    def test_save_edit_delete_and_build(self):
        state = self.save()
        identifier = state['tracks'][0]['id']
        self.assertEqual(json.loads((self.root/'music/collection.json').read_text(encoding='utf8'))['tracks'][0]['note'], self.track['note'])
        self.assertEqual(json.loads((self.root/'music/collection.json').read_text(encoding='utf8'))['tracks'][0]['excerpt'], self.track['excerpt'])
        for path in ['music/index.html', 'music/classical/index.html', 'music/japanese/index.html']:
            self.assertTrue((self.root/path).is_file())
        edited = editor.save_edit(self.root, {'revision':state['revision'], 'id':identifier, 'track':{**self.track, 'note':''}})
        self.assertEqual(edited['tracks'][0]['note'], '')
        deleted = editor.save_edit(self.root, {'revision':edited['revision'], 'id':identifier, 'action':'delete'})
        self.assertEqual(deleted['tracks'], [])

    def test_conflict_duplicate_and_featured(self):
        self.save(featured=True)
        with self.assertRaises(editor.EditConflict):
            editor.save_edit(self.root, {'revision':'stale', 'track':self.track})
        with self.assertRaises(ValueError):
            self.save()
        state = self.save(sourceId='186017', featured=True)
        self.assertEqual(sum(t['featured'] for t in state['tracks']), 1)

    def test_failed_build_keeps_original_library_and_index(self):
        self.save()
        files = [self.root/'music/library.json', self.root/'music/collection.json']
        before = [f.read_bytes() for f in files]
        with patch.object(editor, 'build_music', side_effect=OSError('disk full')):
            with self.assertRaises(OSError):
                self.save(sourceId='186017')
        self.assertEqual([f.read_bytes() for f in files], before)

    def test_invalid_metadata_is_rejected_before_writing(self):
        for change in [{'title':''}, {'room':'other'}, {'cover':'javascript:alert(1)'}, {'url':'https://example.com'}, {'url':'https://music.163.com/song?id=1'}, {'tags':'not a list'}, {'duration':-1}, {'date':'2026-02-30'}, {'excerpt':'a' * 601}]:
            with self.assertRaises(ValueError):
                self.save(**change)
        self.assertFalse((self.root/'music/library.json').exists())

    def test_redirect_cannot_leave_music_hosts(self):
        with self.assertRaises(ValueError):
            editor.MusicRedirect().redirect_request(None, None, 302, '', {}, 'http://127.0.0.1/private')

    def test_empty_build_has_no_fabricated_collection(self):
        build_music(self.root)
        self.assertEqual(json.loads((self.root/'music/collection.json').read_text(encoding='utf8'))['tracks'], [])


if __name__ == '__main__':
    unittest.main()
