(() => {
    const root = document.documentElement;
    const railway = document.querySelector('.railway');
    const neighbors = [...document.querySelectorAll('[data-neighbor]')];
    const systemTheme = matchMedia('(prefers-color-scheme: dark)');
    const toggle = document.getElementById('theme-toggle');
    const isDark = () => root.dataset.theme === 'dark' || (!root.dataset.theme && systemTheme.matches);
    function updateTheme() {
        const dark = isDark();
        toggle.setAttribute('aria-label', dark ? '切换到日间联络站' : '切换到夜间联络站');
        toggle.title = toggle.getAttribute('aria-label');
        document.querySelector('meta[name="theme-color"]').content = dark ? '#0a0a0c' : '#f2f2f5';
    }
    toggle.addEventListener('click', () => {
        root.dataset.theme = isDark() ? 'light' : 'dark';
        try { localStorage.setItem('theme', root.dataset.theme); } catch (_) {}
        updateTheme();
    });
    systemTheme.addEventListener('change', updateTheme);
    updateTheme();
    let pointerStation = null;
    let focusedStation = null;
    let previousStation = null;
    const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)');
    function updateRailway() {
        const active = pointerStation || focusedStation;
        if (active) railway.dataset.active = active;
        else delete railway.dataset.active;
        if (active && active !== previousStation && !reducedMotion.matches) {
            // Send one small light down the branch as a greeting, then let it settle.
            try { document.getElementById(`trip-${active}`).beginElement(); } catch (_) {}
        }
        previousStation = active;
    }
    neighbors.forEach(station => {
        station.addEventListener('pointerenter', event => {
            if (event.pointerType === 'touch') return;
            pointerStation = station.dataset.neighbor;
            updateRailway();
        });
        station.addEventListener('pointerleave', () => { pointerStation = null; updateRailway(); });
        station.addEventListener('focus', () => { focusedStation = station.dataset.neighbor; updateRailway(); });
        station.addEventListener('blur', () => { focusedStation = null; updateRailway(); });
    });
})();
