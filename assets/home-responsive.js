(() => {
    const map = document.querySelector('.map');
    const narrow = matchMedia('(max-width: 700px), (max-height: 500px), (min-aspect-ratio: 2/1)');
    function layout() {
        map.setAttribute('viewBox', narrow.matches ? '400 80 650 750' : '0 0 1440 900');
        map.setAttribute('preserveAspectRatio', narrow.matches ? 'xMidYMid meet' : 'xMidYMid slice');
    }
    narrow.addEventListener('change', layout);
    layout();
    const reduce = matchMedia('(prefers-reduced-motion: reduce)');
    function motion() {
        if (document.hidden || reduce.matches) map.pauseAnimations();
        else map.unpauseAnimations();
    }
    document.addEventListener('visibilitychange', motion);
    reduce.addEventListener('change', motion);
    motion();
})();
