/**
 * Before/After Slider — touch + mouse drag
 * Re-inits on shopify:section:load.
 */
(function () {
  'use strict';

  function initSlider(container) {
    var slider = container.querySelector('[data-before-after]');
    if (!slider) return;

    var clip = slider.querySelector('[data-before-clip]');
    var line = slider.querySelector('[data-before-line]');
    var handle = slider.querySelector('[data-before-handle]');
    var dragging = false;

    function update(x) {
      var rect = slider.getBoundingClientRect();
      var pct = Math.min(Math.max((x - rect.left) / rect.width * 100, 0), 100);
      clip.style.clipPath = 'inset(0 ' + (100 - pct) + '% 0 0)';
      line.style.left = pct + '%';
      handle.style.left = pct + '%';
    }

    slider.addEventListener('mousedown', function () { dragging = true; });
    window.addEventListener('mouseup', function () { dragging = false; });
    slider.addEventListener('mousemove', function (e) {
      if (dragging) update(e.clientX);
    });

    slider.addEventListener('touchstart', function () { dragging = true; }, { passive: true });
    window.addEventListener('touchend', function () { dragging = false; });
    slider.addEventListener('touchmove', function (e) {
      if (dragging && e.touches[0]) update(e.touches[0].clientX);
    }, { passive: true });

    slider.addEventListener('click', function (e) { update(e.clientX); });
  }

  document.querySelectorAll('[data-section-type="before-after"]').forEach(function (el) {
    initSlider(el);
  });

  document.addEventListener('shopify:section:load', function (e) {
    var ba = e.target.querySelector('[data-section-type="before-after"]');
    if (ba) initSlider(ba);
  });
})();
