"""Building on one device must preserve photos imported on other devices."""
import json
from pathlib import Path
import sys
import tempfile
import unittest
from unittest.mock import patch

from PIL import Image

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
import build


class PhotoBuildTest(unittest.TestCase):
    def test_partial_or_empty_source_keeps_existing_photos_and_assets(self):
        for local_source in ("empty", "new", "unreadable"):
            with self.subTest(local_source=local_source), tempfile.TemporaryDirectory() as directory:
                root = Path(directory)
                src = root / "src"
                src.mkdir()
                web = root / "web"
                thumb = root / "thumb"
                web.mkdir()
                thumb.mkdir()
                old = {
                    "file": "other-device.jpg", "web": str(web / "old.webp"),
                    "thumb": str(thumb / "old.webp"), "date": "2026-01-01",
                    "lat": 31.2, "lng": 121.5, "city": "Shanghai",
                }
                Image.new("RGB", (12, 8), "blue").save(old["web"], "WEBP")
                Image.new("RGB", (6, 4), "blue").save(old["thumb"], "WEBP")
                original_assets = {key: Path(old[key]).read_bytes() for key in ("web", "thumb")}
                index = root / "photos.json"
                index.write_text(json.dumps([old]), encoding="utf-8")
                if local_source == "new":
                    Image.new("RGB", (10, 10), "red").save(src / "new.jpg")
                elif local_source == "unreadable":
                    (src / old["file"]).write_bytes(b"invalid image")
                with patch.multiple(
                    build, PHOTOS_SRC=str(src), PHOTOS_WEB=str(web),
                    PHOTOS_THUMB=str(thumb), PHOTOS_JSON=str(index),
                    MANUAL_JSON=str(root / "manual.json"), ADMIN_DATA_BASE="",
                ):
                    build.build_photos()
                    first = json.loads(index.read_text(encoding="utf-8"))
                    build.build_photos()
                result = json.loads(index.read_text(encoding="utf-8"))
                self.assertEqual(first, result)
                self.assertIn(old, result)
                self.assertEqual(len(result), 2 if local_source == "new" else 1)
                for key, content in original_assets.items():
                    self.assertEqual(Path(old[key]).read_bytes(), content)
                for entry in result:
                    for key in ("web", "thumb"):
                        self.assertTrue(Path(entry[key]).is_file())


if __name__ == "__main__":
    unittest.main()
