/**
 * Before/After Slider — touch + mouse drag + keyboard.
 * Handle is WAI-ARIA slider (role="slider" + aria-valuenow). Keyboard
 * users can move with Arrow/Home/End/PageUp/PageDown. Re-inits on
 * shopify:section:load.
 */
(function () {
  'use strict';

  /* WeakMap<slider, { onMouseUp, onTouchEnd }> — window-level listeners
     we attached per instance. We need to be able to remove them on
     shopify:section:unload to keep the editor from accumulating a
     stranded mouseup/touchend listener every time the section is
     removed or re-added. */
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

    /* Pointer Events — unified mouse / touch / pen. setPointerCapture
       on the slider keeps the drag tracking even when the cursor /
       finger leaves the slider's bounding rect, so a fast horizontal
       flick doesn't drop the drag mid-motion (visible jank). The
       previous mouse + touch split missed pen input entirely (Surface,
       iPad pencil) and dropped drags when the pointer left the slider
       on the mouse path. */
    /* Track the currently-captured pointerId so shopify:section:unload
       can release it deterministically before the slider element is
       detached. Without this the editor's host iframe could end up
       sitting on a captured pointer that targets an orphaned DOM
       node — the suspected cause of the "scroll won't reach the
       footer after I drop in then remove a before/after section"
       symptom. */
    var capturedPointerId = null;

    slider.addEventListener('pointerdown', function (e) {
      dragging = true;
      capturedPointerId = e.pointerId;
      try { slider.setPointerCapture(e.pointerId); } catch (_) { /* ignore */ }
      updateFromX(e.clientX);
    });

    var onPointerUp = function (e) {
      dragging = false;
      try { slider.releasePointerCapture(e.pointerId); } catch (_) { /* ignore */ }
      capturedPointerId = null;
    };

    /* Document-level for safety — pointercancel fires when the OS
       interrupts the gesture (e.g. iOS pull-to-refresh, Android
       app-switch). Clearing dragging there prevents a "stuck" handle
       state when the user returns to the page. */
    slider.addEventListener('pointerup', onPointerUp);
    slider.addEventListener('pointercancel', onPointerUp);
    slider.addEventListener('pointerleave', function () { dragging = false; });

    slider.addEventListener('pointermove', function (e) {
      if (dragging) updateFromX(e.clientX);
    }, { passive: true });

    windowHandlers.set(slider, {
      onPointerUp: onPointerUp,
      /* Getter so the unload listener reads the live id at teardown
         time, not whatever value was current when initSlider ran. */
      getCapturedPointerId: function () { return capturedPointerId; }
    });

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

  /* Pointer-up / cancel listeners are scoped to the slider element
     itself (not window), so they GC with the DOM when shopify:section
     :unload removes the section. We still release any active pointer
     capture here so the editor's host iframe doesn't end up holding a
     captured pointer on an element that's about to be detached — a
     stranded capture is the most plausible cause of the reported
     "page won't scroll to the footer after I drop in (and then
     remove) the before/after section" symptom: the editor's drag
     interaction at the moment of removal silently kept the capture,
     blocking subsequent scroll events on the surrounding chrome.
     try/catch wraps the release because the spec lets the browser
     have already auto-released it. */
  document.addEventListener('shopify:section:unload', function (e) {
    if (!e.target || !e.target.querySelector) return;
    var slider = e.target.querySelector('[data-before-after]');
    if (!slider) return;
    var entry = windowHandlers.get(slider);
    if (entry && typeof entry.getCapturedPointerId === 'function') {
      var id = entry.getCapturedPointerId();
      if (id != null) {
        try { slider.releasePointerCapture(id); } catch (_) { /* ignore */ }
      }
    }
    windowHandlers.delete(slider);
  });
})();
