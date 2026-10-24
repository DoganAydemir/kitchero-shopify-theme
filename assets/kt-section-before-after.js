(function () {
  'use strict';

  var windowHandlers = new WeakMap();

  function initSlider(container) {
    var slider = container.querySelector('[data-before-after]');
    if (!slider) return;
    if (slider.dataset.beforeAfterBound === 'true') return;
    slider.dataset.beforeAfterBound = 'true';

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

    var capturedPointerId = null;

    slider.addEventListener('pointerdown', function (e) {
      dragging = true;
      capturedPointerId = e.pointerId;
      try { slider.setPointerCapture(e.pointerId); } catch (_) {  }
      updateFromX(e.clientX);
    });

    var onPointerUp = function (e) {
      dragging = false;
      try { slider.releasePointerCapture(e.pointerId); } catch (_) {  }
      capturedPointerId = null;
    };

    slider.addEventListener('pointerup', onPointerUp);
    slider.addEventListener('pointercancel', onPointerUp);
    slider.addEventListener('pointerleave', function () { dragging = false; });

    slider.addEventListener('pointermove', function (e) {
      if (dragging) updateFromX(e.clientX);
    }, { passive: true });

    windowHandlers.set(slider, {
      onPointerUp: onPointerUp,

      getCapturedPointerId: function () { return capturedPointerId; }
    });

    slider.addEventListener('click', function (e) { updateFromX(e.clientX); });

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

  document.addEventListener('shopify:section:unload', function (e) {
    if (!e.target || !e.target.querySelector) return;
    var slider = e.target.querySelector('[data-before-after]');
    if (!slider) return;
    var entry = windowHandlers.get(slider);
    if (entry && typeof entry.getCapturedPointerId === 'function') {
      var id = entry.getCapturedPointerId();
      if (id != null) {
        try { slider.releasePointerCapture(id); } catch (_) {  }
      }
    }
    windowHandlers.delete(slider);
  });
})();
