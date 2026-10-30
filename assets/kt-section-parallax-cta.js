(function () {
  var REDUCE = window.matchMedia('(prefers-reduced-motion: reduce)');
  var items = [];
  var ticking = false;

  function render() {
    ticking = false;
    var vh = window.innerHeight || document.documentElement.clientHeight;
    for (var i = 0; i < items.length; i++) {
      var el = items[i];
      var r = el.getBoundingClientRect();
      if (r.bottom < 0 || r.top > vh) continue;

      var p = (vh - r.top) / (vh + r.height);
      if (p < 0) p = 0; else if (p > 1) p = 1;

      el.style.backgroundPosition = (el.getAttribute('data-focal-x') || 'center') + ' ' + (p * 100).toFixed(2) + '%';
    }
  }

  function onScroll() {
    if (ticking) return;
    ticking = true;
    requestAnimationFrame(render);
  }

  function collect() {
    items = [];
    if (REDUCE.matches) return;
    var nodes = document.querySelectorAll('.kt-parallax-cta__title[data-parallax-bg]');
    for (var i = 0; i < nodes.length; i++) items.push(nodes[i]);
  }

  function init() {
    collect();
    if (items.length) render();
  }

  window.addEventListener('scroll', onScroll, { passive: true });
  window.addEventListener('resize', onScroll, { passive: true });

  if (document.readyState !== 'loading') {
    init();
  } else {
    document.addEventListener('DOMContentLoaded', init);
  }

  document.addEventListener('shopify:section:load', function (e) {
    if (e.target && e.target.querySelector && e.target.querySelector('.kt-parallax-cta__title')) {
      init();
    }
  });
  document.addEventListener('shopify:section:unload', function (e) {
    if (e.target && e.target.querySelector && e.target.querySelector('.kt-parallax-cta__title')) {
      collect();
    }
  });
})();
