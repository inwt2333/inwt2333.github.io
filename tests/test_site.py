from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]


def test_shared_site_styles_are_loaded_on_primary_pages():
    for name in ("index.html", "about.html", "essays.html", "gallery.html"):
        html = (ROOT / name).read_text(encoding="utf-8")
        assert 'assets/site.css' in html


def test_homepage_has_live_platform_panel_with_fallback_copy():
    html = (ROOT / "index.html").read_text(encoding="utf-8")
    assert 'id="platform-panel"' in html
    assert 'id="platform-latest"' in html
    assert '最新动态暂不可用' in html


def test_homepage_data_loader_exposes_update_timestamp():
    html = (ROOT / "index.html").read_text(encoding="utf-8")
    assert 'id="platform-updated"' in html
    assert 'platform-updated' in html
    assert 'STATION BOARD · 站台播报' in html
    assert '更新 ' in html


def test_mobile_station_labels_do_not_expand_and_footer_year_is_current():
    html = (ROOT / "index.html").read_text(encoding="utf-8")
    assert ".station .st-name { font-size: 24px; }" in html
    assert "EST. 2026" in html
    assert "EST. 2024" not in html
