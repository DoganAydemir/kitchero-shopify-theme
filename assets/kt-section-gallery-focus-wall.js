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
      placeholder: '[data-focus-placeholder]',
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
      var placeholder = state.lightbox.querySelector(SELECTORS.placeholder);
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
        if (src) {
          /* Real merchant image: show the <img>, hide the placeholder slot. */
          img.setAttribute('src', src);
          img.setAttribute('alt', alt);
          img.hidden = false;
          if (placeholder) {
            placeholder.hidden = true;
            placeholder.innerHTML = '';
          }
        } else {
          /* No image picked yet — clone the tile's own placeholder SVG
             (Shopify's `lifestyle-1` / `product-1` etc. illustrations)
             into the lightbox slot so the merchant sees the same artwork
             they see in the grid, not a black void. Previously the JS
             only set visibility:hidden on the <img>, which left an
             empty lightbox visible while the tile-source had a valid
             placeholder waiting to be reused. */
          img.removeAttribute('src');
          img.setAttribute('alt', '');
          img.hidden = true;
          if (placeholder) {
            placeholder.innerHTML = '';
            var tilePh = tile.querySelector('.placeholder-svg');
            if (tilePh) {
              var clone = tilePh.cloneNode(true);
              /* Strip the tile-scoped class so the lightbox's own
                 sizing rules win; keep the generic `placeholder-svg`
                 class so Shopify's stock-illustration styles still
                 apply (currentColor strokes, viewBox, etc.). */
              clone.classList.remove('kt-gallery-focus__placeholder-svg');
              clone.classList.remove('kt-gallery-focus__image');
              clone.classList.add('kt-gallery-focus-lightbox__placeholder-svg');
              placeholder.appendChild(clone);
            }
            placeholder.hidden = false;
          }
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
        /* In the theme editor, intercepting the canvas click steals
           focus from Shopify's "select the block in the sidebar"
           behavior — the merchant clicks a tile to edit it and
           instead gets a fullscreen lightbox blocking the canvas.
           Skip the open() call entirely when designMode is on and
           let Shopify's native block-select flow run. */
        if (window.Shopify && window.Shopify.designMode) return;
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
        if (window.Kitchero && Kitchero.focusTrap && Kitchero.focusTrap.shouldSuppressEscape && Kitchero.focusTrap.shouldSuppressEscape(active.lightbox)) return;
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
      /* Handlers are delegated, so nothing to re-bind. BUT: if the
         merchant uploads an image to a tile, Shopify re-renders the
         section — and if the old `active` ref pointed at a now-removed
         lightbox DOM node, `e.target.contains(active.lightbox)` would
         return false (the new lightbox is a different node) and the
         scrollLock would never release. That's the "page jumps to the
         bottom after picking an image" bug: body stays position:fixed
         with a negative `top`, so the viewport is anchored at the saved
         scroll offset instead of where the merchant left it.

         Fix: when *our* section type reloads, force-release the scroll
         lock and clear active state unconditionally. Unlock is
         idempotent (no-op if we never locked), so this is safe. */
      if (!e.target) return;
      var ourSection = e.target.matches && e.target.matches(SELECTORS.section)
        ? e.target
        : e.target.querySelector && e.target.querySelector(SELECTORS.section);
      if (!ourSection) return;
      active = null;
      if (window.Kitchero && Kitchero.scrollLock) {
        Kitchero.scrollLock.unlock('gallery-focus-wall');
      } else {
        document.body.style.overflow = '';
      }
    });

    document.addEventListener('shopify:section:unload', function (e) {
      if (!e.target) return;
      var ourSection = e.target.matches && e.target.matches(SELECTORS.section)
        ? e.target
        : e.target.querySelector && e.target.querySelector(SELECTORS.section);
      if (!ourSection) return;
      if (active && active.lightbox) {
        active.lightbox.setAttribute('aria-hidden', 'true');
      }
      active = null;
      if (window.Kitchero && Kitchero.scrollLock) {
        Kitchero.scrollLock.unlock('gallery-focus-wall');
      } else {
        document.body.style.overflow = '';
      }
    });

    /* R103 (reverted) — earlier this handler opened the tile's
       lightbox on `shopify:block:select` as a "click-flow preview"
       for merchants editing from the sidebar. In practice it
       *blocked* editing: every time the merchant clicked an image
       block to change its settings, the lightbox covered the
       canvas and the sidebar inputs lost relevance. The merchant
       just wants to edit the block — Shopify already scrolls the
       block into view on select, so no JS hook is needed here.
       Keeping the close-on-deselect would be useless without a
       matching open, so both handlers are removed. */
  })();
}
