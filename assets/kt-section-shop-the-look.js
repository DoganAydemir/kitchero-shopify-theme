/**
 * Shop The Look — hotspot toggle, desktop popup, mobile bottom sheet
 * Birebir from ShopTheLookHome.tsx
 */
(function () {
  'use strict';

  /* Map<section, keydownHandler> so shopify:section:unload can detach
     the document-level Escape listener we attached on init. Without
     this, each re-render leaves a stranded listener referencing a
     stale `section` closure. */
  var keydownHandlers = new WeakMap();

  function init(container) {
    var section = container.querySelector('[data-section-type="shop-the-look"]');
    if (!section) return;
    if (section.dataset.shopTheLookBound === 'true') return;
    section.dataset.shopTheLookBound = 'true';

    var activeId = null;
    var mobileSheet = section.querySelector('[data-mobile-sheet]');
    var mobileClose = section.querySelector('[data-mobile-sheet-close]');
    var mobileImg = section.querySelector('[data-mobile-sheet-img]');
    var mobileName = section.querySelector('[data-mobile-sheet-name]');
    var mobilePrice = section.querySelector('[data-mobile-sheet-price]');
    var mobileLink = section.querySelector('[data-mobile-sheet-link]');

    function closeAll() {
      section.querySelectorAll('.kt-shop-the-look__hotspot--active').forEach(function (btn) {
        btn.classList.remove('kt-shop-the-look__hotspot--active');
      });
      section.querySelectorAll('.kt-shop-the-look__popup--visible').forEach(function (p) {
        p.classList.remove('kt-shop-the-look__popup--visible');
        /* R97 — close-direction `inert` so the now-hidden popup's
           link / close-on-second-tap CTAs are removed from sequential
           focus + AT tree. Pairs with the open-branch removeAttribute
           below. CSS opacity/transform alone leaves them tabbable. */
        p.setAttribute('inert', '');
        p.setAttribute('aria-hidden', 'true');
      });
      if (mobileSheet) {
        mobileSheet.classList.remove('kt-shop-the-look__mobile-sheet--visible');
        mobileSheet.setAttribute('inert', '');
        mobileSheet.setAttribute('aria-hidden', 'true');
      }
      activeId = null;
    }

    function openHotspot(id) {
      closeAll();
      activeId = id;

      var btn = section.querySelector('[data-hotspot-toggle="' + id + '"]');
      var popup = section.querySelector('[data-hotspot-popup="' + id + '"]');

      if (btn) btn.classList.add('kt-shop-the-look__hotspot--active');
      if (popup) {
        popup.classList.add('kt-shop-the-look__popup--visible');
        /* R97 — open-direction: drop `inert` + flip aria-hidden so
           the now-visible popup's content (image, name, link) is
           reachable via Tab and announced by AT. */
        popup.removeAttribute('inert');
        popup.setAttribute('aria-hidden', 'false');
      }

      /* Mobile bottom sheet */
      if (mobileSheet && window.innerWidth < 750) {
        var wrap = section.querySelector('[data-hotspot-id="' + id + '"]');
        if (!wrap) return;
        var block = wrap.closest('[data-hotspot-id]');
        var hotspotBtn = block.querySelector('[data-hotspot-toggle]');

        /* Read data from popup */
        var popupEl = block.querySelector('[data-hotspot-popup]');
        if (popupEl) {
          var nameEl = popupEl.querySelector('.kt-shop-the-look__popup-name');
          var priceEl = popupEl.querySelector('.kt-shop-the-look__popup-price');
          var linkEl = popupEl.querySelector('.kt-shop-the-look__popup-link');
          var imgEl = popupEl.querySelector('.kt-shop-the-look__popup-image');

          if (mobileName && nameEl) mobileName.textContent = nameEl.textContent;
          if (mobilePrice && priceEl) mobilePrice.textContent = priceEl.textContent;
          /* Mirror the desktop popup link into the mobile sheet. When the
             merchant has not configured a product URL for this hotspot,
             the desktop popup link is absent — hide the mobile CTA too so
             shoppers never tap a "View Product" button that does nothing
             useful. `hidden` is the cleanest toggle: it zeroes rendering,
             removes the element from the tab order, and is trivially
             overridden by CSS when we need custom animation later. */
          if (mobileLink) {
            if (linkEl) {
              mobileLink.href = linkEl.href;
              mobileLink.removeAttribute('hidden');
            } else {
              mobileLink.setAttribute('hidden', '');
            }
          }
          if (mobileImg && imgEl) {
            /* Build the image node via DOM (not innerHTML interpolation)
               so an alt attribute containing HTML-active characters can
               never be parsed as markup. Clear existing children first. */
            while (mobileImg.firstChild) mobileImg.removeChild(mobileImg.firstChild);
            /* R215 — desktop popup falls through to a Shopify
               `placeholder_svg_tag` when the merchant hasn't picked
               a product image, so `imgEl` can be either an `<img>`
               or an `<svg>`. Previously this branch always created
               an `<img>` and assigned `imgEl.src` — which is
               undefined on an SVG node, leaving the cloned `<img>`
               with no source and the browser painting a broken-
               image icon in the mobile sheet. Now branch on the
               element's tag: real images get cloned as `<img>`
               with src/alt copied; SVG placeholders get cloned as
               an SVG node, with width/height styles re-applied so
               the mobile sheet keeps the same square layout. */
            var tag = imgEl.tagName && imgEl.tagName.toLowerCase();
            if (tag === 'img') {
              var cloneImg = document.createElement('img');
              cloneImg.src = imgEl.src;
              cloneImg.alt = imgEl.alt || '';
              cloneImg.style.width = '100%';
              cloneImg.style.height = '100%';
              cloneImg.style.objectFit = 'cover';
              mobileImg.appendChild(cloneImg);
            } else {
              var cloneSvg = imgEl.cloneNode(true);
              cloneSvg.style.width = '100%';
              cloneSvg.style.height = '100%';
              mobileImg.appendChild(cloneSvg);
            }
          }
        }

        mobileSheet.classList.add('kt-shop-the-look__mobile-sheet--visible');
        /* R97 — mobile bottom-sheet open-direction: drop inert so
           the close button + product link land in tab order. */
        mobileSheet.removeAttribute('inert');
        mobileSheet.setAttribute('aria-hidden', 'false');
      }
    }

    /* Hotspot toggle buttons */
    section.querySelectorAll('[data-hotspot-toggle]').forEach(function (btn) {
      btn.addEventListener('click', function () {
        var id = btn.dataset.hotspotToggle;
        if (activeId === id) {
          closeAll();
        } else {
          openHotspot(id);
        }
      });
    });

    /* Expose open/close on the section node so the document-level
       editor block:select handler can drive the popup state without
       reaching into our IIFE closure. Premium Theme-Store reviewers
       click hotspot blocks expecting the popup to open in the preview
       — without this they see the block highlight (from global.js)
       but the actual popup stays closed. */
    section._ktShopTheLook = { open: openHotspot, closeAll: closeAll };

    /* Mobile close */
    if (mobileClose) {
      mobileClose.addEventListener('click', closeAll);
    }

    /* Escape key — stored in a WeakMap so unload can remove it. */
    var onKeydown = function (e) {
      if (e.code === 'Escape' && activeId) closeAll();
    };
    document.addEventListener('keydown', onKeydown);
    keydownHandlers.set(section, onKeydown);
  }

  document.querySelectorAll('[data-section-type="shop-the-look"]').forEach(function (el) {
    init(el.closest('.shopify-section') || el);
  });

  /* R275 — Scroll-position guard for the theme editor.

     When the merchant drags a hotspot's `horizontal_position` or
     `vertical_position` slider in the right panel and releases,
     Shopify re-renders the section via the Section Rendering API
     and then internally calls `scrollIntoView()` (or equivalent)
     on the currently-selected block to re-anchor the editor's
     "focus on this block" affordance.

     The hotspot block element is `position: absolute` inside an
     `aspect-ratio`-sized image wrap. Some Section Rendering re-
     paints leave the wrap's offset uncomputed at the exact frame
     Shopify reads `block.getBoundingClientRect()`, and the
     compounded miscalculation lands the scroll target near the
     bottom of the page — reporter: "slider çubuğunu çekip
     bıraktığım an sayfa en alt kısma scroll yapıyor."

     Defensive guard: in design_mode, snapshot the iframe's scroll
     position right before the load/select handlers run, and if
     the page has drifted by more than a small threshold by the
     next-next animation frame (after Shopify's auto-scroll has
     fired), snap back to the saved Y. The threshold avoids
     fighting legitimate scrolls (e.g. the merchant clicks a
     section in the sidebar — we DO want that to scroll the
     iframe to the section). Live storefront flow is unaffected
     because the guard is gated behind `Shopify.designMode`. */
  function guardScroll() {
    if (!(window.Shopify && Shopify.designMode)) return;
    var savedY = window.pageYOffset || document.documentElement.scrollTop || 0;
    requestAnimationFrame(function () {
      requestAnimationFrame(function () {
        var currentY = window.pageYOffset || document.documentElement.scrollTop || 0;
        var drift = Math.abs(currentY - savedY);
        /* 200px tolerance — a legitimate "scroll to this block"
           that lands within ~200px of where we were is left
           alone; anything bigger gets snapped back because it's
           almost certainly the bottom-of-page miscalculation. */
        if (drift > 200) {
          window.scrollTo({ top: savedY, left: 0, behavior: 'instant' });
        }
      });
    });
  }

  document.addEventListener('shopify:section:load', function (e) {
    /* :load fires on settings changes without a paired :unload.
       The keydown handler bound at line 129 is on document (not on
       the section node) so it does NOT GC when the section DOM is
       replaced — without explicit removal we accumulate stranded
       document-level keydown handlers each save. Tear down any
       pre-existing handler for this section before re-init. */
    if (e.target && e.target.querySelector) {
      var existing = e.target.querySelector('[data-section-type="shop-the-look"]');
      if (existing) {
        var prevHandler = keydownHandlers.get(existing);
        if (prevHandler) {
          document.removeEventListener('keydown', prevHandler);
          keydownHandlers.delete(existing);
        }
      }
    }
    init(e.target);
    /* Snapshot scroll BEFORE the editor's post-load auto-scroll
       has a chance to fire — restore on next-next frame if drift
       exceeds the tolerance. Scoped to this section's load events
       only so other sections re-rendering elsewhere on the page
       don't pay the cost. */
    if (e.target && e.target.querySelector && e.target.querySelector('[data-section-type="shop-the-look"]')) {
      guardScroll();
    }
  });

  document.addEventListener('shopify:section:unload', function (e) {
    if (!e.target || !e.target.querySelector) return;
    var section = e.target.querySelector('[data-section-type="shop-the-look"]');
    if (!section) return;
    var handler = keydownHandlers.get(section);
    if (handler) {
      document.removeEventListener('keydown', handler);
      keydownHandlers.delete(section);
    }
  });

  /* Theme-editor: highlight the dot that matches the merchant's
     selected hotspot block.

     R275 — Previously this handler called `_ktShopTheLook.open()`,
     which added the `--visible` class to BOTH the desktop popup
     and (on mobile preview) the mobile bottom-sheet, AND removed
     `inert` from those panels so their contents became focusable.
     Reporter saw: "soldan hotspot item'a tıklayınca / sağdaki ayarı
     değiştirdiğimde sayfa direk aşağı scroll ediyor dibe kadar."

     Root cause: opening the mobile sheet (`position: fixed; inset:
     auto 0 0 0; transform: translateY(100%)`) made its descendants
     newly focusable while the sheet was still translated below the
     viewport during its 0.4s slide-in transition. Shopify's editor
     auto-focus / scroll-into-view for the freshly-tab-able region
     then yanked the iframe scroll all the way down to chase the
     not-yet-painted-in-place focusable target. Same shape on the
     desktop popup when `--below` placement pushed its bounding box
     past the image's bottom edge.

     Fix: in design_mode we ONLY toggle the dot's `--active` class
     (scale + plus→× rotation = clear visual feedback for which
     hotspot the merchant just selected) without revealing the
     popup or sheet. Merchants can still tap the actual dot in the
     preview to see the live popup state — that flow goes through
     the regular click handler which keeps scroll behavior sane
     because nothing changes about Shopify's scroll-to-block
     calculus when there's no popup expansion in the same frame. */
  function highlightDotOnly(section, id) {
    if (!section) return;
    section.querySelectorAll('.kt-shop-the-look__hotspot--active').forEach(function (btn) {
      btn.classList.remove('kt-shop-the-look__hotspot--active');
    });
    var dot = section.querySelector('[data-hotspot-toggle="' + id + '"]');
    if (dot) dot.classList.add('kt-shop-the-look__hotspot--active');
  }

  function clearDotHighlights(section) {
    if (!section) return;
    section.querySelectorAll('.kt-shop-the-look__hotspot--active').forEach(function (btn) {
      btn.classList.remove('kt-shop-the-look__hotspot--active');
    });
  }

  document.addEventListener('shopify:block:select', function (e) {
    var block = e.target;
    if (!block || !block.closest) return;
    var section = block.closest('[data-section-type="shop-the-look"]');
    if (!section || !section._ktShopTheLook) return;
    var hotspotEl = block.matches('[data-hotspot-id]')
      ? block
      : block.querySelector('[data-hotspot-id]');
    if (!hotspotEl) return;
    highlightDotOnly(section, hotspotEl.dataset.hotspotId);
    /* Same scroll guard as section:load — Shopify can fire
       scrollIntoView on the block element here too, particularly
       on the post-rerender re-select after the merchant releases
       a position slider. */
    guardScroll();
  });

  document.addEventListener('shopify:block:deselect', function (e) {
    var block = e.target;
    if (!block || !block.closest) return;
    var section = block.closest('[data-section-type="shop-the-look"]');
    if (!section || !section._ktShopTheLook) return;
    clearDotHighlights(section);
  });
})();
