/*
 * Parallax CTA — scroll-linked background reveal.
 *
 * The headline uses `background-clip: text` so the image shows through
 * the glyphs. The original effect relied on `background-attachment:
 * fixed`, which Chrome renders incorrectly with clip:text (it shears
 * the trailing glyphs) and iOS Safari ignores entirely. So CSS keeps
 * `background-attachment: scroll` and we drive the reveal here by
 * shifting `background-position-y` as the section travels through the
 * viewport — the same "window onto a moving image" feel, with no
 * shearing, and it works on touch devices.
 *
 * Progressive enhancement: with JS disabled (or prefers-reduced-motion)
 * the image is simply centered and static — nothing looks broken.
 */
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
      // 0 as the element's top reaches the viewport bottom,
      // 1 once its bottom has passed the viewport top.
      var p = (vh - r.top) / (vh + r.height);
      if (p < 0) p = 0; else if (p > 1) p = 1;
      // Pan across the vertical slack a `cover` image leaves.
      el.style.backgroundPosition = 'center ' + (p * 100).toFixed(2) + '%';
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

  // Theme editor: re-scan when this section is (re)rendered or removed.
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
