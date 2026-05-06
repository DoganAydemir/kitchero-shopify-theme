/**
 * Gallery Focus Wall — Style 03
 *
 * Behavior:
 *   - [data-focus-tile] buttons open the lightbox with their data-tile-index
 *   - [data-focus-lightbox] is the modal container (aria-hidden toggled)
 *   - Prev/next arrows wrap around the tile list (scoped per section)
 *   - Esc closes. Arrow keys navigate. Tab is focus-trapped inside the modal.
 *   - Body scroll is locked while open. Focus restored to opener on close.
 *   - Basic touch swipe: left → next, right → prev.
 *   - Idempotent load guard; re-init on shopify:section:load.
 */
if (!window.__kitcheroGalleryFocusLoaded) {
  window.__kitcheroGalleryFocusLoaded = true;

  (function () {
    'use strict';

    var SELECTORS = {
      section: '[data-section-type="gallery-focus-wall"]',
      tile: '[data-focus-tile]',
      lightbox: '[data-focus-lightbox]',
      image: '[data-focus-image]',
      title: '[data-focus-title]',
      description: '[data-focus-description]',
      counter: '[data-focus-counter]',
      close: '[data-focus-close]',
      prev: '[data-focus-prev]',
      next: '[data-focus-next]',
    };

    /* Track the currently-open lightbox state globally so the one set of
       keyboard/document listeners can operate on it. */
    var active = null; /* { section, lightbox, tiles, index, opener } */

    function pad(n) {
      return n < 10 ? '0' + n : String(n);
    }

    function getFocusable(container) {
      if (!container) return [];
      var sel = [
        'button:not([disabled])',
        '[href]',
        'input:not([disabled])',
        'select:not([disabled])',
        'textarea:not([disabled])',
        '[tabindex]:not([tabindex="-1"])',
      ].join(',');
      return Array.prototype.slice.call(container.querySelectorAll(sel));
    }

    function render(state) {
      if (!state) return;
      var tile = state.tiles[state.index];
      if (!tile) return;

      var img = state.lightbox.querySelector(SELECTORS.image);
      var title = state.lightbox.querySelector(SELECTORS.title);
      var desc = state.lightbox.querySelector(SELECTORS.description);
      var counter = state.lightbox.querySelector(SELECTORS.counter);

      var src = tile.getAttribute('data-tile-image') || '';
      var alt = tile.getAttribute('data-tile-image-alt') || '';
      var t = tile.getAttribute('data-tile-title') || '';
      var d = tile.getAttribute('data-tile-description') || '';

      if (img) {
        /* brief opacity swap for a smooth transition */
        img.classList.add('kt-gallery-focus-lightbox__image--swapping');
        /* If there's no merchant image (placeholder-only block), fall back to
           showing nothing rather than a broken image. */
        if (src) {
          img.setAttribute('src', src);
          img.setAttribute('alt', alt);
          img.style.visibility = '';
        } else {
          img.removeAttribute('src');
          img.setAttribute('alt', '');
          img.style.visibility = 'hidden';
        }
        /* Allow the browser to paint the new src before fading in */
        window.requestAnimationFrame(function () {
          window.requestAnimationFrame(function () {
            img.classList.remove('kt-gallery-focus-lightbox__image--swapping');
          });
        });
      }
      if (title) title.textContent = t;
      if (desc) desc.textContent = d;
      if (counter) {
        counter.textContent = pad(state.index + 1) + ' / ' + pad(state.tiles.length);
      }
    }

    function open(section, index, opener) {
      if (!section) return;
      var lightbox = section.querySelector(SELECTORS.lightbox);
      if (!lightbox) return;

      var tiles = Array.prototype.slice.call(section.querySelectorAll(SELECTORS.tile));
      if (tiles.length === 0) return;
      if (index < 0 || index >= tiles.length) index = 0;

      active = {
        section: section,
        lightbox: lightbox,
        tiles: tiles,
        index: index,
        opener: opener || tiles[index],
      };

      render(active);
      lightbox.setAttribute('aria-hidden', 'false');
      /* R97 — drop `inert` so the lightbox is focusable + reachable
         by AT. Pairs with the close branch which re-applies it. */
      lightbox.removeAttribute('inert');
      if (window.Kitchero && Kitchero.scrollLock) {
        Kitchero.scrollLock.lock('gallery-focus-wall');
      } else {
        document.body.style.overflow = 'hidden';
      }

      /* Focus close button so keyboard users land on something useful */
      var closeBtn = lightbox.querySelector(SELECTORS.close + ':not([data-focus-close=""])')
        || lightbox.querySelector('.kt-gallery-focus-lightbox__close');
      if (closeBtn) {
        setTimeout(function () { closeBtn.focus(); }, 80);
      }
    }

    function close() {
      if (!active) return;
      active.lightbox.setAttribute('aria-hidden', 'true');
      /* R97 — apply `inert` so the closed lightbox's close button
         + image + arrow controls are removed from sequential focus
         and the AT tree. Without this, screen-reader users can still
         tab into the (visually hidden via CSS) modal contents. */
      active.lightbox.setAttribute('inert', '');
      if (window.Kitchero && Kitchero.scrollLock) {
        Kitchero.scrollLock.unlock('gallery-focus-wall');
      } else {
        document.body.style.overflow = '';
      }

      var opener = active.opener;
      active = null;

      if (opener && typeof opener.focus === 'function') {
        opener.focus();
      }
    }

    function navigate(direction) {
      if (!active) return;
      var n = active.tiles.length;
      active.index = (active.index + direction + n) % n;
      render(active);
    }

    /* ── Delegated click handler ─────────────────────────────────────── */

    document.addEventListener('click', function (e) {
      /* Close — fires for backdrop or close button */
      var closer = e.target.closest(SELECTORS.close);
      if (closer && active && active.lightbox.contains(closer)) {
        e.preventDefault();
        close();
        return;
      }

      /* Prev */
      var prev = e.target.closest(SELECTORS.prev);
      if (prev && active && active.lightbox.contains(prev)) {
        e.preventDefault();
        navigate(-1);
        return;
      }

      /* Next */
      var next = e.target.closest(SELECTORS.next);
      if (next && active && active.lightbox.contains(next)) {
        e.preventDefault();
        navigate(1);
        return;
      }

      /* Tile opener */
      var tile = e.target.closest(SELECTORS.tile);
      if (tile) {
        var section = tile.closest(SELECTORS.section);
        if (!section) return;
        var idx = parseInt(tile.getAttribute('data-tile-index'), 10);
        if (isNaN(idx)) idx = 0;
        e.preventDefault();
        open(section, idx, tile);
      }
    });

    /* ── Keyboard ─────────────────────────────────────────────────────── */

    document.addEventListener('keydown', function (e) {
      if (!active) return;

      if (e.key === 'Escape' || e.code === 'Escape') {
        e.preventDefault();
        close();
        return;
      }
      if (e.key === 'ArrowRight') {
        e.preventDefault();
        navigate(1);
        return;
      }
      if (e.key === 'ArrowLeft') {
        e.preventDefault();
        navigate(-1);
        return;
      }
      if (e.key === 'Tab') {
        var focusable = getFocusable(active.lightbox);
        if (!focusable.length) return;
        var first = focusable[0];
        var last = focusable[focusable.length - 1];
        if (e.shiftKey && document.activeElement === first) {
          e.preventDefault();
          last.focus();
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault();
          first.focus();
        }
      }
    });

    /* ── Touch swipe ──────────────────────────────────────────────────── */

    var touchStartX = 0;
    var touchStartY = 0;
    var TOUCH_THRESHOLD = 40;

    document.addEventListener(
      'touchstart',
      function (e) {
        if (!active) return;
        if (!e.touches || e.touches.length === 0) return;
        touchStartX = e.touches[0].clientX;
        touchStartY = e.touches[0].clientY;
      },
      { passive: true },
    );

    document.addEventListener(
      'touchend',
      function (e) {
        if (!active) return;
        if (!e.changedTouches || e.changedTouches.length === 0) return;
        var dx = e.changedTouches[0].clientX - touchStartX;
        var dy = e.changedTouches[0].clientY - touchStartY;
        /* Only treat as horizontal swipe if the x-delta dominates. */
        if (Math.abs(dx) < TOUCH_THRESHOLD) return;
        if (Math.abs(dx) < Math.abs(dy)) return;
        if (dx < 0) {
          navigate(1);
        } else {
          navigate(-1);
        }
      },
      { passive: true },
    );

    /* ── Theme-editor lifecycle ───────────────────────────────────────── */

    document.addEventListener('shopify:section:load', function (e) {
      /* Nothing heavy to re-init — handlers are delegated — but if a
         lightbox was open and the section re-rendered, close it to avoid
         dangling state pointing at a removed node. */
      if (active && e.target && e.target.contains(active.lightbox)) {
        active = null;
        if (window.Kitchero && Kitchero.scrollLock) {
          Kitchero.scrollLock.unlock('gallery-focus-wall');
        } else {
          document.body.style.overflow = '';
        }
      }
    });

    document.addEventListener('shopify:section:unload', function (e) {
      if (active && e.target && e.target.contains(active.lightbox)) {
        active.lightbox.setAttribute('aria-hidden', 'true');
        if (window.Kitchero && Kitchero.scrollLock) {
          Kitchero.scrollLock.unlock('gallery-focus-wall');
        } else {
          document.body.style.overflow = '';
        }
        active = null;
      }
    });
  })();
}
