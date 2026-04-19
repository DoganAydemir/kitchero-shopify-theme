/**
 * Gallery — Stack Carousel (Style 02)
 *
 * Manages activeIndex per section. Each card gets one of:
 *   - is-active    (activeIndex)
 *   - is-prev      (activeIndex - 1, wrapped)
 *   - is-next      (activeIndex + 1, wrapped)
 *   - is-hidden-left  / is-hidden-right  (everything else; side chosen by
 *     shortest path so cards exit toward the correct edge)
 *
 * Controls:
 *   - Arrow buttons (prev / next)
 *   - Numbered index list (click to jump)
 *   - Clicking a prev/next card pulls it to center
 *
 * Autoplay is optional (per-section setting). It pauses on hover, focus-in,
 * tab visibility change, and reduced-motion.
 *
 * The outer `if (!window.__kitcheroGalleryStackLoaded)` guard prevents
 * double-binding if the same script ends up on the page twice (Section
 * Rendering API, editor rehydration).
 */
if (!window.__kitcheroGalleryStackLoaded) {
  window.__kitcheroGalleryStackLoaded = true;

  (function () {
    'use strict';

    var SELECTOR = '[data-section-type="gallery-stack"]';
    var instances = new Map(); /* sectionId -> instance */

    var reducedMotion =
      typeof window.matchMedia === 'function' &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    function pad(n) {
      return String(n).padStart(2, '0');
    }

    function getCardSide(cardIndex, activeIndex, total) {
      /* Returns 'prev', 'next', 'active', 'hidden-left', or 'hidden-right'
       * based on the shortest signed distance around the ring. */
      if (cardIndex === activeIndex) return 'active';

      var diff = cardIndex - activeIndex;
      var half = total / 2;
      /* Wrap into [-half, half] */
      if (diff > half) diff -= total;
      else if (diff < -half) diff += total;

      if (diff === -1) return 'prev';
      if (diff === 1) return 'next';
      return diff < 0 ? 'hidden-left' : 'hidden-right';
    }

    function applyState(instance) {
      var activeIndex = instance.activeIndex;
      var total = instance.total;

      instance.cards.forEach(function (card, i) {
        card.classList.remove(
          'is-active',
          'is-prev',
          'is-next',
          'is-hidden',
          'is-hidden-left',
          'is-hidden-right'
        );
        var side = getCardSide(i, activeIndex, total);
        if (side === 'active') {
          card.classList.add('is-active');
          card.setAttribute('aria-current', 'true');
          card.setAttribute('tabindex', '0');
        } else {
          card.removeAttribute('aria-current');
          card.setAttribute('tabindex', '-1');
          if (side === 'prev') card.classList.add('is-prev');
          else if (side === 'next') card.classList.add('is-next');
          else if (side === 'hidden-left')
            card.classList.add('is-hidden', 'is-hidden-left');
          else if (side === 'hidden-right')
            card.classList.add('is-hidden', 'is-hidden-right');
        }
      });

      instance.indexButtons.forEach(function (btn, i) {
        if (i === activeIndex) {
          btn.classList.add('is-active');
          btn.setAttribute('aria-current', 'true');
        } else {
          btn.classList.remove('is-active');
          btn.removeAttribute('aria-current');
        }
      });

      instance.captionItems.forEach(function (item, i) {
        if (i === activeIndex) {
          item.classList.add('is-active');
          item.removeAttribute('aria-hidden');
        } else {
          item.classList.remove('is-active');
          item.setAttribute('aria-hidden', 'true');
        }
      });

      if (instance.currentLabel) {
        instance.currentLabel.textContent = pad(activeIndex + 1);
      }
    }

    function goTo(instance, next) {
      var total = instance.total;
      if (total <= 0) return;
      var clamped = ((next % total) + total) % total;
      if (clamped === instance.activeIndex) return;
      instance.activeIndex = clamped;
      applyState(instance);
    }

    function startAutoplay(instance) {
      if (!instance.autoplay || reducedMotion) return;
      stopAutoplay(instance);
      instance.intervalId = setInterval(function () {
        goTo(instance, instance.activeIndex + 1);
      }, instance.autoplayInterval);
    }

    function stopAutoplay(instance) {
      if (instance.intervalId) {
        clearInterval(instance.intervalId);
        instance.intervalId = null;
      }
    }

    function bind(section) {
      var sectionId = section.dataset.sectionId;
      if (!sectionId) return null;

      /* If this section is already bound, tear it down first. */
      if (instances.has(sectionId)) {
        teardown(sectionId);
      }

      var cards = Array.prototype.slice.call(
        section.querySelectorAll('[data-stack-card]')
      );
      if (cards.length === 0) return null;

      var total = cards.length;
      var autoplay = section.dataset.autoplay === 'true';
      var autoplayInterval =
        (parseInt(section.dataset.autoplayInterval, 10) || 6) * 1000;

      var instance = {
        section: section,
        sectionId: sectionId,
        cards: cards,
        indexButtons: Array.prototype.slice.call(
          section.querySelectorAll('[data-stack-index-button]')
        ),
        captionItems: Array.prototype.slice.call(
          section.querySelectorAll('[data-caption-item]')
        ),
        prevBtn: section.querySelector('[data-stack-prev]'),
        nextBtn: section.querySelector('[data-stack-next]'),
        currentLabel: section.querySelector('[data-stack-current]'),
        activeIndex: 0,
        total: total,
        autoplay: autoplay,
        autoplayInterval: autoplayInterval,
        intervalId: null,
        listeners: []
      };

      function on(el, event, handler) {
        if (!el) return;
        el.addEventListener(event, handler);
        instance.listeners.push({ el: el, event: event, handler: handler });
      }

      /* Arrow buttons */
      on(instance.prevBtn, 'click', function () {
        goTo(instance, instance.activeIndex - 1);
        startAutoplay(instance);
      });
      on(instance.nextBtn, 'click', function () {
        goTo(instance, instance.activeIndex + 1);
        startAutoplay(instance);
      });

      /* Index buttons */
      instance.indexButtons.forEach(function (btn) {
        on(btn, 'click', function () {
          var idx = parseInt(btn.dataset.index, 10);
          if (isNaN(idx)) return;
          goTo(instance, idx);
          startAutoplay(instance);
        });
      });

      /* Click-to-activate on cards (only if they're prev/next) */
      cards.forEach(function (card) {
        on(card, 'click', function () {
          var idx = parseInt(card.dataset.cardIndex, 10);
          if (isNaN(idx)) return;
          if (idx === instance.activeIndex) return;
          goTo(instance, idx);
          startAutoplay(instance);
        });

        on(card, 'keydown', function (event) {
          if (event.key === 'ArrowLeft') {
            event.preventDefault();
            goTo(instance, instance.activeIndex - 1);
            startAutoplay(instance);
          } else if (event.key === 'ArrowRight') {
            event.preventDefault();
            goTo(instance, instance.activeIndex + 1);
            startAutoplay(instance);
          }
        });
      });

      /* Pause autoplay on hover / focus */
      on(section, 'mouseenter', function () {
        stopAutoplay(instance);
      });
      on(section, 'mouseleave', function () {
        startAutoplay(instance);
      });
      on(section, 'focusin', function () {
        stopAutoplay(instance);
      });
      on(section, 'focusout', function (event) {
        if (!section.contains(event.relatedTarget)) {
          startAutoplay(instance);
        }
      });

      /* Pause when tab is hidden */
      instance.visibilityHandler = function () {
        if (document.hidden) {
          stopAutoplay(instance);
        } else {
          startAutoplay(instance);
        }
      };
      document.addEventListener('visibilitychange', instance.visibilityHandler);

      instances.set(sectionId, instance);

      applyState(instance);
      startAutoplay(instance);

      return instance;
    }

    function teardown(sectionId) {
      var instance = instances.get(sectionId);
      if (!instance) return;
      stopAutoplay(instance);
      instance.listeners.forEach(function (entry) {
        entry.el.removeEventListener(entry.event, entry.handler);
      });
      if (instance.visibilityHandler) {
        document.removeEventListener(
          'visibilitychange',
          instance.visibilityHandler
        );
      }
      instances.delete(sectionId);
    }

    function initAll(root) {
      var scope = root || document;
      scope.querySelectorAll(SELECTOR).forEach(function (section) {
        bind(section);
      });
    }

    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', function () {
        initAll();
      });
    } else {
      initAll();
    }

    /* Theme editor: rebind only the reloaded section */
    document.addEventListener('shopify:section:load', function (event) {
      var target = event.target;
      if (!target) return;
      var section = target.matches && target.matches(SELECTOR)
        ? target
        : target.querySelector && target.querySelector(SELECTOR);
      if (section) bind(section);
    });

    document.addEventListener('shopify:section:unload', function (event) {
      var sectionId = event.detail && event.detail.sectionId;
      if (sectionId) teardown(sectionId);
    });

    document.addEventListener('shopify:section:select', function (event) {
      var sectionId = event.detail && event.detail.sectionId;
      var instance = sectionId && instances.get(sectionId);
      if (instance) stopAutoplay(instance);
    });

    document.addEventListener('shopify:section:deselect', function (event) {
      var sectionId = event.detail && event.detail.sectionId;
      var instance = sectionId && instances.get(sectionId);
      if (instance) startAutoplay(instance);
    });

    /* Theme editor: when the merchant selects an image block in the
       sidebar, pull that card to center. event.target is the block
       element (the <button data-stack-card data-card-index>). */
    document.addEventListener('shopify:block:select', function (event) {
      var sectionId = event.detail && event.detail.sectionId;
      var instance = sectionId && instances.get(sectionId);
      if (!instance) return;
      var block = event.target;
      if (!block) return;
      var card = block.matches && block.matches('[data-stack-card]')
        ? block
        : block.querySelector && block.querySelector('[data-stack-card]');
      if (!card) return;
      var idx = parseInt(card.dataset.cardIndex, 10);
      if (isNaN(idx)) return;
      stopAutoplay(instance);
      goTo(instance, idx);
    });

    document.addEventListener('shopify:block:deselect', function (event) {
      var sectionId = event.detail && event.detail.sectionId;
      var instance = sectionId && instances.get(sectionId);
      if (instance) startAutoplay(instance);
    });
  })();
}
