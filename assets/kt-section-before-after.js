/**
 * Before/After Slider — touch + mouse drag + keyboard.
 * Handle is WAI-ARIA slider (role="slider" + aria-valuenow). Keyboard
 * users can move with Arrow/Home/End/PageUp/PageDown. Re-inits on
 * shopify:section:load.
 */
(function () {
  'use strict';

  function initSlider(container) {
    var slider = container.querySelector('[data-before-after]');
    if (!slider) return;

    var clip = slider.querySelector('[data-before-clip]');
    var line = slider.querySelector('[data-before-line]');
    var handle = slider.querySelector('[data-before-handle]');
    if (!clip || !line || !handle) return;

    var dragging = false;
    var pct = 50;

    function render() {
      clip.style.clipPath = 'inset(0 ' + (100 - pct) + '% 0 0)';
      line.style.left = pct + '%';
      handle.style.left = pct + '%';
      handle.setAttribute('aria-valuenow', Math.round(pct));
    }

    function setPct(next) {
      pct = Math.min(Math.max(next, 0), 100);
      render();
    }

    function updateFromX(x) {
      var rect = slider.getBoundingClientRect();
      if (rect.width <= 0) return;
      setPct((x - rect.left) / rect.width * 100);
    }

    /* Mouse */
    slider.addEventListener('mousedown', function (e) {
      dragging = true;
      updateFromX(e.clientX);
    });
    window.addEventListener('mouseup', function () { dragging = false; });
    slider.addEventListener('mousemove', function (e) {
      if (dragging) updateFromX(e.clientX);
    });

    /* Touch */
    slider.addEventListener('touchstart', function (e) {
      dragging = true;
      if (e.touches[0]) updateFromX(e.touches[0].clientX);
    }, { passive: true });
    window.addEventListener('touchend', function () { dragging = false; });
    slider.addEventListener('touchmove', function (e) {
      if (dragging && e.touches[0]) updateFromX(e.touches[0].clientX);
    }, { passive: true });

    /* Click — jump to position */
    slider.addEventListener('click', function (e) { updateFromX(e.clientX); });

    /* Keyboard (WAI-ARIA slider pattern).
       Arrow = ±5%, PageUp/Down = ±10%, Home/End = 0/100. */
    handle.addEventListener('keydown', function (e) {
      var handled = true;
      switch (e.key) {
        case 'ArrowLeft':
        case 'ArrowDown': setPct(pct - 5); break;
        case 'ArrowRight':
        case 'ArrowUp':   setPct(pct + 5); break;
        case 'PageDown':  setPct(pct - 10); break;
        case 'PageUp':    setPct(pct + 10); break;
        case 'Home':      setPct(0); break;
        case 'End':       setPct(100); break;
        default:          handled = false;
      }
      if (handled) {
        e.preventDefault();
        e.stopPropagation();
      }
    });

    /* Keyboard drag must not also fire the slider click handler. */
    handle.addEventListener('click', function (e) { e.stopPropagation(); });

    render();
  }

  document.querySelectorAll('[data-section-type="before-after"]').forEach(function (el) {
    initSlider(el);
  });

  document.addEventListener('shopify:section:load', function (e) {
    var ba = e.target.querySelector('[data-section-type="before-after"]');
    if (ba) initSlider(ba);
  });
})();
