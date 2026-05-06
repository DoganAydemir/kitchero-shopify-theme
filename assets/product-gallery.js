/**
 * Product Gallery — thumbnail switching + fullscreen lightbox
 * Birebir from product/[id]/page.tsx gallery behavior.
 * Re-inits on shopify:section:load.
 */
(function () {
  'use strict';

  /* Devices with a fine pointer (mouse / trackpad) get the
     magnifier-style mouse-follow pan when the lightbox image is
     zoomed. Touch-only devices fall back to the default overflow
     scroll so users can drag the image with their finger. */
  var hasFinePointer =
    window.matchMedia && window.matchMedia('(pointer: fine)').matches;

  function initGallery(container) {
    var gallery = container.querySelector('[data-product-gallery]');
    if (!gallery) return;

    var slides = gallery.querySelectorAll('[data-gallery-slide]');
    var thumbs = gallery.querySelectorAll('[data-gallery-thumb-btn]');
    var mainArea = gallery.querySelector('[data-gallery-main]');
    var lightbox = gallery.querySelector('[data-lightbox]');
    var lightboxImage = gallery.querySelector('[data-lightbox-image]');
    var lightboxViewport = gallery.querySelector('[data-lightbox-viewport]');
    var lightboxClose = gallery.querySelector('[data-lightbox-close]');
    var lightboxPrev = gallery.querySelector('[data-lightbox-prev]');
    var lightboxNext = gallery.querySelector('[data-lightbox-next]');

    var currentIndex = 0;
    var totalSlides = slides.length;
    var imageUrls = [];
    var imageAlts = [];

    /* Collect image URLs for lightbox (use the largest srcset candidate
       when available, otherwise fall back to src) */
    slides.forEach(function (slide) {
      var img = slide.querySelector('img');
      if (!img) return;
      var url = img.src;
      if (img.srcset) {
        var candidates = img.srcset.split(',').map(function (s) { return s.trim(); });
        var last = candidates[candidates.length - 1];
        if (last) url = last.split(' ')[0];
      }
      imageUrls.push(url);
      imageAlts.push(img.alt || '');
    });

    /* Lightbox image load/loading state handling — show spinner until
       the new image's `load` event fires, then fade it in.
       Matches the product/[id]/page.tsx isImageLoading behavior. */
    function setLightboxImage(url, alt) {
      if (!lightboxImage) return;

      // Reset to loading state: hide image, show spinner, clear any
      // leftover zoom pan transform from the previous image, and exit
      // zoom mode so the new image starts at its fit-to-viewport size.
      lightboxImage.classList.remove('is-loaded');
      lightboxImage.style.transform = '';
      if (lightboxViewport) {
        lightboxViewport.classList.add('is-loading');
        lightboxViewport.classList.remove('kt-lightbox__viewport--zoomed');
      }

      // Detach previous onload to avoid stale callbacks.
      lightboxImage.onload = null;
      lightboxImage.onerror = null;

      lightboxImage.onload = function () {
        lightboxImage.classList.add('is-loaded');
        if (lightboxViewport) lightboxViewport.classList.remove('is-loading');
      };
      lightboxImage.onerror = function () {
        // Still hide the spinner on error so the user isn't stuck staring
        // at an endlessly spinning circle — we leave the image invisible.
        if (lightboxViewport) lightboxViewport.classList.remove('is-loading');
      };

      lightboxImage.alt = alt || '';
      lightboxImage.src = url || '';

      // If the browser already has the image cached, `load` may never fire
      // (Firefox). Fall back to `complete`.
      if (lightboxImage.complete && lightboxImage.naturalWidth > 0) {
        lightboxImage.onload();
      }
    }

    /* Switch to slide by index */
    function goTo(index) {
      if (index < 0) index = totalSlides - 1;
      if (index >= totalSlides) index = 0;
      currentIndex = index;

      slides.forEach(function (s) { s.classList.remove('kt-gallery__slide--active'); });
      /* R92 — flip aria-current alongside the visual --active class so
         SR users hear the active thumb announcement, not just the
         visually-styled state. Liquid renders the initial
         aria-current on the active thumb (product-media-gallery.liquid)
         but variant change / user click must keep it in sync. */
      thumbs.forEach(function (t) {
        t.classList.remove('kt-gallery__thumb--active');
        t.removeAttribute('aria-current');
      });

      if (slides[index]) slides[index].classList.add('kt-gallery__slide--active');
      if (thumbs[index]) {
        thumbs[index].classList.add('kt-gallery__thumb--active');
        thumbs[index].setAttribute('aria-current', 'true');
        /* Scroll thumb into view */
        thumbs[index].scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'nearest' });
      }

      /* Update lightbox image if open */
      if (lightbox && lightbox.getAttribute('aria-hidden') === 'false' && lightboxImage) {
        setLightboxImage(imageUrls[index], imageAlts[index]);
      }
    }

    /* Thumb click */
    thumbs.forEach(function (thumb) {
      thumb.addEventListener('click', function () {
        var idx = parseInt(thumb.dataset.mediaIndex, 10);
        goTo(idx);
      });
    });

    /* External variant-swap sync — product-form.js dispatches
       `gallery:goto` with the newly selected variant's media ID when
       the customer picks an option. We look up the matching slide by
       `data-media-id` and delegate to `goTo(index)` so slide, thumb,
       and lightbox `currentIndex` all stay in step. Decoupling via a
       CustomEvent means product-form.js never reaches into gallery
       internals, and the gallery never cares why the index changed. */
    gallery.addEventListener('gallery:goto', function (e) {
      var mediaId = e.detail && e.detail.mediaId;
      if (!mediaId) return;
      /* Coerce both sides to strings — CSS attribute selectors are
         string-typed, and `variant.featured_media.id` arrives as a
         number from the variant JSON. */
      var targetSlide = gallery.querySelector(
        '[data-gallery-slide][data-media-id="' + String(mediaId) + '"]'
      );
      if (!targetSlide) return;
      var targetIndex = parseInt(targetSlide.dataset.gallerySlide, 10);
      if (!isNaN(targetIndex)) goTo(targetIndex);
    });

    /* Main image area click → open lightbox (E-commerce PDP wrapper) */
    if (mainArea) {
      mainArea.addEventListener('click', function () {
        openLightbox();
      });

      /* Touch swipe between slides on mobile. The lightbox already has
         its own swipe (lines 234+); this is the inline gallery
         equivalent so phone users don't have to tap thumbs to navigate.
         50px horizontal threshold + dY-bias guard so vertical scroll
         isn't hijacked. Without this, mobile users can only tap thumbs
         (or open the lightbox) to navigate the gallery — Theme-Store
         reviewers test this on real iPhone and expect swipe parity
         with native shop apps. */
      var inlineSwipeStartX = 0, inlineSwipeStartY = 0, inlineSwipeMoved = false;
      var INLINE_SWIPE_THRESHOLD = 50;
      mainArea.addEventListener('touchstart', function (e) {
        if (e.touches.length !== 1) return;
        inlineSwipeStartX = e.touches[0].clientX;
        inlineSwipeStartY = e.touches[0].clientY;
        inlineSwipeMoved = false;
      }, { passive: true });
      mainArea.addEventListener('touchmove', function () {
        inlineSwipeMoved = true;
      }, { passive: true });
      mainArea.addEventListener('touchend', function (e) {
        if (!inlineSwipeMoved || !e.changedTouches[0]) return;
        var dx = e.changedTouches[0].clientX - inlineSwipeStartX;
        var dy = e.changedTouches[0].clientY - inlineSwipeStartY;
        if (Math.abs(dx) < INLINE_SWIPE_THRESHOLD) return;
        if (Math.abs(dy) > Math.abs(dx)) return; // vertical scroll
        /* Suppress the click handler that fires on touchend (would
           otherwise open the lightbox unintentionally during a swipe).
           A subsequent click is suppressed via a one-shot capture
           listener — released on the next tick so genuine taps work. */
        var suppressClick = function (ev) { ev.preventDefault(); ev.stopPropagation(); };
        mainArea.addEventListener('click', suppressClick, { capture: true, once: true });
        setTimeout(function () {
          mainArea.removeEventListener('click', suppressClick, { capture: true });
        }, 350);
        if (dx < 0) {
          /* Swipe left → next slide */
          if (currentIndex + 1 < slides.length) goTo(currentIndex + 1);
        } else {
          /* Swipe right → previous slide */
          if (currentIndex > 0) goTo(currentIndex - 1);
        }
      }, { passive: true });
    }

    /* Slide click → open lightbox to that specific image (Showroom PDP
       uses inline gallery without a single [data-gallery-main] wrapper,
       so each slide needs its own click handler). Works for E-commerce
       too: clicking the currently-active slide opens the lightbox.

       Gated on `data-media-type === 'image'`. Video and 3D-model slides
       skip the lightbox entirely — `<video>`/`<model-viewer>` ship
       their own controls and the lightbox only knows how to render an
       <img>, so opening it on non-image media would present an empty
       viewer.

       Keyboard parity: Enter/Space on a focused image slide fires the
       same openLightbox path. Image slides ship tabindex="0" +
       role="button" from the Liquid template; non-image slides don't,
       so this listener no-ops on them naturally. */
    slides.forEach(function (slide, slideIdx) {
      var openFromSlide = function () {
        /* Skip ONLY when the slide explicitly declares a non-image
           media type. `dataset.mediaType` is `undefined` on layouts
           that don't emit the attribute (the showroom PDP iterates
           images-only and historically didn't set the attribute), so
           the previous strict equality `!== 'image'` rejected those
           legitimate image slides. The defensive form below treats
           undefined / empty string as "image by default" and only
           bails on explicit `video` / `model` / `external_video`. */
        var t = slide.dataset.mediaType;
        if (t && t !== 'image') return;
        var targetIndex = parseInt(slide.dataset.gallerySlide, 10);
        if (isNaN(targetIndex)) targetIndex = slideIdx;
        goTo(targetIndex);
        openLightbox();
      };

      slide.addEventListener('click', function () {
        // Avoid double-firing when the click already bubbles up to mainArea.
        if (mainArea && mainArea.contains(slide)) return;
        openFromSlide();
      });

      slide.addEventListener('keydown', function (e) {
        if (e.key === 'Enter' || e.key === ' ' || e.key === 'Spacebar') {
          e.preventDefault();
          openFromSlide();
        }
      });
    });

    /* Gallery-level delegated click — backup for the showroom layout
       where slides are nested inside multiple wrappers
       (`.kt-showroom__gallery-desktop` > `.kt-showroom__gallery-pair`
       > `.kt-showroom__gallery-half`, etc.). The per-slide listener
       above works in isolation but can race against parent-DOM
       click handlers in custom layouts; the delegated listener here
       guarantees that ANY click landing on (or inside) a
       `[data-gallery-slide]` opens the lightbox even when the
       per-slide handler hasn't bound for any reason. Idempotent:
       openLightbox checks aria-hidden and skips if already open.

       Selector intentionally drops the `[data-media-type="image"]`
       requirement — showroom slides historically don't carry that
       attribute. The mediaType check happens inside the handler
       (defensive: only skip on explicit video / model declaration).

       Capture-phase = false (default bubble) — fires AFTER the
       per-slide handlers, so when both succeed the second call
       finds an already-open lightbox and is a no-op. */
    gallery.addEventListener('click', function (e) {
      var slide = e.target.closest('[data-gallery-slide]');
      if (!slide || !gallery.contains(slide)) return;
      var t = slide.dataset.mediaType;
      if (t && t !== 'image') return;
      if (mainArea && mainArea.contains(slide)) return;
      if (lightbox && lightbox.getAttribute('aria-hidden') === 'false') return;
      var targetIndex = parseInt(slide.dataset.gallerySlide, 10);
      if (!isNaN(targetIndex)) goTo(targetIndex);
      openLightbox();
    });

    /* Lightbox open */
    function openLightbox() {
      if (!lightbox || !lightboxImage) return;
      setLightboxImage(imageUrls[currentIndex], imageAlts[currentIndex]);
      lightbox.setAttribute('aria-hidden', 'false');
      /* Remove inert so the close/prev/next buttons re-enter the
         focus chain. Pairs with closeLightbox() re-applying inert.
         Markup default state is `inert` + `aria-hidden=true`. */
      lightbox.removeAttribute('inert');
      if (window.Kitchero && Kitchero.scrollLock) {
        Kitchero.scrollLock.lock('product-gallery-lightbox');
      } else {
        document.body.style.overflow = 'hidden';
      }
      if (window.Kitchero && Kitchero.focusTrap) Kitchero.focusTrap.enable(lightbox);
    }

    /* Lightbox close */
    function closeLightbox() {
      if (!lightbox) return;
      lightbox.setAttribute('aria-hidden', 'true');
      /* Re-apply inert so the closed lightbox subtree leaves the
         focus chain. Mirrored on openLightbox(). */
      lightbox.setAttribute('inert', '');
      if (window.Kitchero && Kitchero.scrollLock) {
        Kitchero.scrollLock.unlock('product-gallery-lightbox');
      } else {
        document.body.style.overflow = '';
      }
      if (lightboxViewport) {
        lightboxViewport.classList.remove('kt-lightbox__viewport--zoomed');
        lightboxViewport.classList.remove('is-loading');
      }
      if (lightboxImage) {
        lightboxImage.classList.remove('is-loaded');
        lightboxImage.style.transform = '';
      }
      if (window.Kitchero && Kitchero.focusTrap) Kitchero.focusTrap.disable(lightbox);
    }

    if (lightboxClose) lightboxClose.addEventListener('click', closeLightbox);
    if (lightboxPrev) lightboxPrev.addEventListener('click', function () { goTo(currentIndex - 1); });
    if (lightboxNext) lightboxNext.addEventListener('click', function () { goTo(currentIndex + 1); });

    /* Touch swipe — swipe left/right on the lightbox viewport to advance
       to the next/previous image. Threshold 50px; only triggers on a
       mostly-horizontal gesture (dx > dy) so vertical scrolling / pinch
       zoom don't accidentally switch images. Disabled while the image
       is in the zoomed state because the user is then panning. */
    if (lightboxViewport) {
      var touchStartX = 0;
      var touchStartY = 0;
      var touchStartTime = 0;
      var touchActive = false;

      lightboxViewport.addEventListener('touchstart', function (e) {
        if (lightboxViewport.classList.contains('kt-lightbox__viewport--zoomed')) return;
        if (!e.touches || e.touches.length !== 1) return;
        touchActive = true;
        touchStartX = e.touches[0].clientX;
        touchStartY = e.touches[0].clientY;
        touchStartTime = Date.now();
      }, { passive: true });

      lightboxViewport.addEventListener('touchend', function (e) {
        if (!touchActive) return;
        touchActive = false;
        if (lightboxViewport.classList.contains('kt-lightbox__viewport--zoomed')) return;

        var touch = (e.changedTouches && e.changedTouches[0]) || null;
        if (!touch) return;

        var dx = touch.clientX - touchStartX;
        var dy = touch.clientY - touchStartY;
        var absDx = Math.abs(dx);
        var absDy = Math.abs(dy);
        var elapsed = Date.now() - touchStartTime;

        /* Require a meaningful horizontal swing, mostly horizontal direction,
           and a reasonable duration (flick = <600ms). Tapping to zoom
           toggles is handled by the click event — this only fires on a
           real swipe. */
        if (absDx < 50) return;
        if (absDx < absDy * 1.2) return;
        if (elapsed > 600) return;

        if (dx < 0) {
          goTo(currentIndex + 1);
        } else {
          goTo(currentIndex - 1);
        }
      }, { passive: true });

      lightboxViewport.addEventListener('touchcancel', function () {
        touchActive = false;
      }, { passive: true });
    }

    /* Update the zoomed image's translate so the area under the
       cursor is what's visible. Called on click-to-zoom (using the
       click coordinates for the initial position) and on mousemove
       while zoomed. No-op on touch devices — those still use the
       native overflow scroll. */
    function updateZoomPan(clientX, clientY) {
      if (!lightboxImage || !lightboxViewport) return;
      if (!lightboxViewport.classList.contains('kt-lightbox__viewport--zoomed')) return;

      var rect = lightboxViewport.getBoundingClientRect();
      var px = (clientX - rect.left) / rect.width;
      var py = (clientY - rect.top) / rect.height;

      // Clamp to [0, 1] so the edges of the image stay pinned to the
      // edges of the viewport — no black gap on aggressive cursor moves.
      px = Math.max(0, Math.min(1, px));
      py = Math.max(0, Math.min(1, py));

      var imgRect = lightboxImage.getBoundingClientRect();
      var overflowX = Math.max(0, imgRect.width - rect.width);
      var overflowY = Math.max(0, imgRect.height - rect.height);

      var tx = -px * overflowX;
      var ty = -py * overflowY;

      lightboxImage.style.transform = 'translate(' + tx + 'px, ' + ty + 'px)';
    }

    /* Lightbox zoom toggle — clicking anywhere inside the viewport
       (image, padding area, or loaded image bounds) toggles the zoomed
       state. The prev/next/close buttons are siblings of the viewport
       so they never fire this handler. The spinner has pointer-events
       none so it's invisible to clicks. */
    if (lightboxViewport) {
      lightboxViewport.addEventListener('click', function (e) {
        // Only toggle once the image has finished loading, otherwise the
        // very first click (while still loading) would zoom into nothing.
        if (lightboxViewport.classList.contains('is-loading')) return;

        var isNowZoomed = lightboxViewport.classList.toggle('kt-lightbox__viewport--zoomed');

        if (!isNowZoomed) {
          // Un-zoomed → reset inline transform so the next zoom starts fresh.
          if (lightboxImage) lightboxImage.style.transform = '';
        } else if (hasFinePointer) {
          // Initial pan based on where the user clicked — so the clicked
          // spot is what remains visible after the zoom-in.
          updateZoomPan(e.clientX, e.clientY);
        }
      });

      /* Mouse-follow pan — desktop/trackpad only. Moving the cursor
         translates the image so the hovered area is visible. */
      if (hasFinePointer) {
        lightboxViewport.addEventListener('mousemove', function (e) {
          updateZoomPan(e.clientX, e.clientY);
        });
      }
    }

    /* Keyboard: Escape close, arrows navigate */
    function onKeydown(e) {
      if (!lightbox || lightbox.getAttribute('aria-hidden') !== 'false') return;
      if (e.code === 'Escape') closeLightbox();
      if (e.code === 'ArrowLeft') goTo(currentIndex - 1);
      if (e.code === 'ArrowRight') goTo(currentIndex + 1);
    }
    document.addEventListener('keydown', onKeydown);

    return function destroy() {
      document.removeEventListener('keydown', onKeydown);
      /* Defensive: if the section unloads while the lightbox is
         open (editor re-render during zoom), the previous close()
         path never ran, so body.style.overflow stays 'hidden' and
         Kitchero.focusTrap keeps an active trap on the now-detached
         lightbox node. Force the cleanup here so the next section
         load starts from a clean state. */
      if (lightbox && lightbox.getAttribute('aria-hidden') === 'false') {
        lightbox.setAttribute('aria-hidden', 'true');
        /* Match the close path: re-apply inert so the detached
           lightbox doesn't leave any focusable descendant in the
           page's focus chain after section unload. */
        lightbox.setAttribute('inert', '');
        if (window.Kitchero && Kitchero.scrollLock) {
          Kitchero.scrollLock.unlock('product-gallery-lightbox');
        } else {
          document.body.style.overflow = '';
        }
        if (window.Kitchero && Kitchero.focusTrap) Kitchero.focusTrap.disable(lightbox);
      }
    };
  }

  /* Init */
  var destroyers = {};
  document.querySelectorAll('[data-product-gallery]').forEach(function (el) {
    var section = el.closest('.shopify-section') || el;
    var id = section.id || 'gallery';
    destroyers[id] = initGallery(section);
  });

  document.addEventListener('shopify:section:load', function (e) {
    var id = e.target.id;
    if (destroyers[id]) destroyers[id]();
    destroyers[id] = initGallery(e.target);
  });

  document.addEventListener('shopify:section:unload', function (e) {
    var id = e.target.id;
    if (destroyers[id]) destroyers[id]();
    delete destroyers[id];
  });
})();
