from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]


def test_homepage_has_no_ai_learning_entry_or_metadata():
    html = (ROOT / "index.html").read_text(encoding="utf-8")

    for text in ("AI-Learning", "ai-learning", "AI·LEARN", "AI 学习"):
        assert text not in html


def test_green_line_still_serves_the_training_gym():
    html = (ROOT / "index.html").read_text(encoding="utf-8")

    assert 'id="line-green"' in html
    assert 'href="gym/"' in html
    assert "训练馆" in html
