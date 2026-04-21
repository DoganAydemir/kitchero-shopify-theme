/**
 * Drag Carousel — Slider Style 02
 *
 * Horizontal scroll-snap carousel with pointer-drag support.
 * - Pointer drag: mousedown tracks startX + startScroll; mousemove sets
 *   scrollLeft = startScroll - (currentX - startX).
 * - Swaps cursor grab <-> grabbing.
 * - Suppresses click events if the user dragged more than the threshold
 *   (avoids accidental navigation when the item is a link).
 * - Arrow buttons scroll by one item's outerWidth + gap with smooth behavior.
 * - Enables/disables arrows based on scroll position.
 * - Re-inits on shopify:section:load for the matching section.
 * - Cleans up on shopify:section:unload.
 *
 * Idempotent: guarded by window.__kitcheroSliderDragLoaded.
 */

if (!window.__kitcheroSliderDragLoaded) {
  window.__kitcheroSliderDragLoaded = true;

  (function () {
    'use strict';

    var DRAG_THRESHOLD = 5; /* px — below this counts as a click, not a drag */
    var SCROLL_EDGE_EPSILON = 4;

    /* Respect prefers-reduced-motion by substituting 'auto' for 'smooth'
       behavior on all programmatic scrollBy/scrollTo calls. Drag is
       user-direct and unaffected. Re-queried per call so a customer
       toggling OS-level reduce-motion mid-session picks up live. */
    function scrollBehavior() {
      try {
        return window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth';
      } catch (e) {
        return 'smooth';
      }
    }

    /* Registry of teardown fns, keyed by section id */
    var teardowns = Object.create(null);

    function getGapPx(el) {
      var styles = window.getComputedStyle(el);
      var gap = parseFloat(styles.columnGap || styles.gap || '0');
      return isNaN(gap) ? 0 : gap;
    }

    function getStep(track) {
      var firstItem = track.querySelector('[data-carousel-item]');
      if (!firstItem) return track.clientWidth * 0.8;
      return firstItem.getBoundingClientRect().width + getGapPx(track);
    }

    function updateArrowState(section) {
      var track = section.querySelector('[data-carousel-track]');
      var prev = section.querySelector('[data-carousel-prev]');
      var next = section.querySelector('[data-carousel-next]');
      if (!track) return;

      var canPrev = track.scrollLeft > SCROLL_EDGE_EPSILON;
      var canNext =
        track.scrollLeft + track.clientWidth <
        track.scrollWidth - SCROLL_EDGE_EPSILON;

      if (prev) {
        prev.disabled = !canPrev;
        prev.setAttribute('aria-disabled', String(!canPrev));
      }
      if (next) {
        next.disabled = !canNext;
        next.setAttribute('aria-disabled', String(!canNext));
      }
    }

    function initSection(section) {
      if (!section) return;
      if (section.dataset.kcDragInited === 'true') return;

      var track = section.querySelector('[data-carousel-track]');
      if (!track) return;

      var prevBtn = section.querySelector('[data-carousel-prev]');
      var nextBtn = section.querySelector('[data-carousel-next]');

      section.dataset.kcDragInited = 'true';

      /* ---------- Pointer drag ---------- */
      var isDown = false;
      var startX = 0;
      var startScroll = 0;
      var moved = false;

      function onPointerDown(e) {
        /* Only primary mouse button; allow touch + pen */
        if (e.pointerType === 'mouse' && e.button !== 0) return;
        isDown = true;
        moved = false;
        startX = e.pageX;
        startScroll = track.scrollLeft;
        track.classList.add('is-dragging');
      }

      function onPointerMove(e) {
        if (!isDown) return;
        var dx = e.pageX - startX;
        if (Math.abs(dx) > DRAG_THRESHOLD) moved = true;
        track.scrollLeft = startScroll - dx;
      }

      function onPointerUp() {
        if (!isDown) return;
        isDown = false;
        track.classList.remove('is-dragging');
        /* Reset `moved` on the next tick so click handler can read it */
        window.setTimeout(function () {
          moved = false;
        }, 0);
      }

      function onClickCapture(e) {
        if (moved) {
          e.preventDefault();
          e.stopPropagation();
        }
      }

      function onDragStart(e) {
        /* Prevent native image drag ghost */
        e.preventDefault();
      }

      track.addEventListener('pointerdown', onPointerDown);
      window.addEventListener('pointermove', onPointerMove);
      window.addEventListener('pointerup', onPointerUp);
      window.addEventListener('pointercancel', onPointerUp);
      track.addEventListener('click', onClickCapture, true);
      track.addEventListener('dragstart', onDragStart);

      /* ---------- Arrows ---------- */
      function scrollBySteps(dir) {
        var step = getStep(track);
        track.scrollBy({ left: dir * step, behavior: scrollBehavior() });
      }

      function onPrevClick() {
        scrollBySteps(-1);
      }

      function onNextClick() {
        scrollBySteps(1);
      }

      if (prevBtn) prevBtn.addEventListener('click', onPrevClick);
      if (nextBtn) nextBtn.addEventListener('click', onNextClick);

      /* ---------- Scroll state ---------- */
      function onScroll() {
        updateArrowState(section);
      }
      function onResize() {
        updateArrowState(section);
      }

      track.addEventListener('scroll', onScroll, { passive: true });
      window.addEventListener('resize', onResize);

      updateArrowState(section);

      /* ---------- Teardown ---------- */
      teardowns[section.dataset.sectionId || section.id || 'anon'] =
        function teardown() {
          track.removeEventListener('pointerdown', onPointerDown);
          window.removeEventListener('pointermove', onPointerMove);
          window.removeEventListener('pointerup', onPointerUp);
          window.removeEventListener('pointercancel', onPointerUp);
          track.removeEventListener('click', onClickCapture, true);
          track.removeEventListener('dragstart', onDragStart);
          if (prevBtn) prevBtn.removeEventListener('click', onPrevClick);
          if (nextBtn) nextBtn.removeEventListener('click', onNextClick);
          track.removeEventListener('scroll', onScroll);
          window.removeEventListener('resize', onResize);
          section.dataset.kcDragInited = 'false';
        };
    }

    function initAll(root) {
      var scope = root || document;
      var sections = scope.querySelectorAll
        ? scope.querySelectorAll('[data-section-type="slider-drag-carousel"]')
        : [];
      sections.forEach(initSection);
    }

    function teardownSection(sectionId) {
      var fn = teardowns[sectionId];
      if (typeof fn === 'function') {
        fn();
        delete teardowns[sectionId];
      }
    }

    /* ---------- Boot ---------- */
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', function () {
        initAll();
      });
    } else {
      initAll();
    }

    /* ---------- Shopify theme editor hooks ---------- */
    document.addEventListener('shopify:section:load', function (event) {
      var section = event.target.querySelector(
        '[data-section-type="slider-drag-carousel"]'
      );
      if (
        !section &&
        event.target.matches &&
        event.target.matches('[data-section-type="slider-drag-carousel"]')
      ) {
        section = event.target;
      }
      if (section) initSection(section);
    });

    document.addEventListener('shopify:section:unload', function (event) {
      var sectionId = event.detail && event.detail.sectionId;
      if (sectionId) teardownSection(sectionId);
    });

    /* Theme editor: when the merchant clicks a carousel item block in
       the sidebar, smooth-scroll the track so that block is in view.
       event.target is the block element itself (has [data-carousel-item]). */
    document.addEventListener('shopify:block:select', function (event) {
      var block = event.target;
      if (!block || !block.matches || !block.matches('[data-carousel-item]')) return;
      var track = block.closest('[data-carousel-track]');
      if (!track) return;
      /* Use scrollTo with an offset calculation rather than scrollIntoView
         — scrollIntoView scrolls the page vertically, which is jarring. */
      var trackRect = track.getBoundingClientRect();
      var blockRect = block.getBoundingClientRect();
      var currentScroll = track.scrollLeft;
      var delta = blockRect.left - trackRect.left;
      track.scrollTo({ left: currentScroll + delta, behavior: scrollBehavior() });
    });
  })();
}
