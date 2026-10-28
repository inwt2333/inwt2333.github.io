"""Optional book metadata must survive the site's small front-matter parser."""
import json
from pathlib import Path
import sys
import tempfile
import unittest
from unittest.mock import patch

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
import build


class BookMetadataTest(unittest.TestCase):
    def test_optional_book_fields_are_unquoted_and_preserved(self):
        with tempfile.TemporaryDirectory() as directory:
            root = Path(directory)
            (root / "sample.md").write_text(
                '---\ntitle: Sample\ndate: 2026-10-28\ncategory: essay\n'
                'motif: mountain\naccent: "#71808b"\n'
                "note: 'A note: with punctuation'\n"
                'cover_image: "assets/essay-covers/sample.svg"\n---\nBody',
                encoding="utf-8",
            )
            with patch.object(build, "POSTS_DIR", str(root)), patch.object(
                build, "OUTPUT_FILE", str(root / "posts.json")
            ), patch.object(build, "_md_available", return_value=True):
                posts = build.build_index()
            self.assertEqual(posts[0]["motif"], "mountain")
            self.assertEqual(posts[0]["accent"], "#71808b")
            self.assertEqual(posts[0]["note"], "A note: with punctuation")
            self.assertEqual(posts[0]["cover_image"], "assets/essay-covers/sample.svg")
            self.assertEqual(posts[0]["url"], "post/sample/")
            self.assertEqual(json.loads((root / "posts.json").read_text(encoding="utf-8")), posts)

    def test_existing_articles_do_not_require_book_metadata(self):
        with tempfile.TemporaryDirectory() as directory:
            root = Path(directory)
            (root / "sample.md").write_text(
                "---\ntitle: Sample\ndate: 2026-10-28\ncategory: essay\n---\nBody",
                encoding="utf-8",
            )
            with patch.object(build, "POSTS_DIR", str(root)), patch.object(
                build, "OUTPUT_FILE", str(root / "posts.json")
            ), patch.object(build, "_md_available", return_value=False):
                post = build.build_index()[0]
            self.assertEqual(post["title"], "Sample")
            self.assertTrue(all(key not in post for key in ("motif", "accent", "note", "cover_image", "url")))


if __name__ == "__main__":
    unittest.main()
