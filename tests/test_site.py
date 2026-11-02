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


def test_xsy_page_is_private_and_loads_its_collection_module():
    html = (ROOT / "xsy" / "index.html").read_text(encoding="utf-8")
    assert '<meta name="robots" content="noindex, nofollow">' in html
    assert '<script type="module" src="app.mjs"></script>' in html
    assert 'data-favorite-count' in html
    assert 'data-favorites' in html


def test_xsy_page_has_no_public_site_entry():
    assert "/xsy" not in (ROOT / "index.html").read_text(encoding="utf-8")
    assert "/xsy" not in (ROOT / "sitemap.xml").read_text(encoding="utf-8")


def test_xsy_has_one_accessible_exhibit_dialog():
    html = (ROOT / "xsy" / "index.html").read_text(encoding="utf-8")
    assert 'id="exhibit-dialog"' in html
    assert 'role="dialog"' in html
    assert 'aria-modal="true"' in html
    assert 'id="exhibit-dialog-title"' in html


def test_friends_page_lists_every_neighbour_as_a_safe_external_link():
    html = (ROOT / "friends.html").read_text(encoding="utf-8")
    assert html.count('class="neighbor"') == 3
    for href in ("http://andysgz.top", "https://chrmysle.cn/", "https://koitown.cn/"):
        assert f'href="{href}" target="_blank" rel="noopener"' in html
    for branch in ("andy", "koitown", "chrmysle"):
        assert f'data-branch="{branch}"' in html
        assert f'id="trip-{branch}"' in html


def test_friends_railway_is_straight_and_stations_step_down_along_it():
    css = (ROOT / "assets" / "friends.css").read_text(encoding="utf-8")
    assert ".railway::before" in css
    assert "cubic-bezier" in css
    assert "grid-template-columns: minmax(0, 1fr) 52px minmax(0, 1fr)" in css
    assert ".railway::after" not in css
    assert ".neighbor:nth-child(odd) { grid-column: 1; }" in css
    assert ".neighbor:nth-child(even) { grid-column: 3; }" in css
    assert ".neighbor:nth-child(2) { margin-top: 42px; }" in css
    assert ".neighbor:nth-child(3) { margin-top: 84px; }" in css


def test_koitown_station_uses_orange_koi_and_centered_signage():
    html = (ROOT / "friends.html").read_text(encoding="utf-8")
    css = (ROOT / "assets" / "friends.css").read_text(encoding="utf-8")
    assert '<text x="260" y="162" text-anchor="middle" class="scene-label">KOITOWN</text>' in html
    assert ".station-scene .koi { fill: #f28c38;" in css
    assert "grid-template-columns: minmax(0, 1fr) 52px minmax(0, 1fr)" in css
