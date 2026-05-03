/**
 * Slider — Cinematic Hero
 *
 * Cross-fade slider with Ken Burns zoom on active slide.
 *
 * - Advance by swapping `--active` class on slide + text nodes.
 * - Autoplay via setInterval, configurable via data-autoplay-interval.
 * - Pause on hover (optional), prev/next arrows, dot pagination, play/pause toggle.
 * - Honors prefers-reduced-motion: no autoplay, instant cross-fade, no Ken Burns.
 * - Re-initializes on shopify:section:load, cleans on shopify:section:unload.
 *
 * Wrapped in a load-guard so the same script can be included more than once
 * (Section Rendering API, theme editor rehydration) without double-binding.
 */
if (!window.__kitcheroSliderCinematicLoaded) {
  window.__kitcheroSliderCinematicLoaded = true;

  (function () {
    'use strict';

    var SECTION_SELECTOR = '[data-section-type="slider-cinematic-hero"]';
    var instances = new Map(); // sectionId -> controller

    var reducedMotion = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    function setActive(root, index) {
      var slides = root.querySelectorAll('[data-slide-index]');
      var texts = root.querySelectorAll('[data-slide-text]');
      var dots = root.querySelectorAll('[data-slide-dot]');

      slides.forEach(function (el) {
        var isActive = Number(el.dataset.slideIndex) === index;
        el.classList.toggle('kt-slider-cinematic__slide--active', isActive);
        el.setAttribute('aria-hidden', isActive ? 'false' : 'true');
      });

      texts.forEach(function (el) {
        var isActive = Number(el.dataset.slideText) === index;
        el.classList.toggle('kt-slider-cinematic__text--active', isActive);
      });

      dots.forEach(function (el) {
        var isActive = Number(el.dataset.slideDot) === index;
        el.classList.toggle('kt-slider-cinematic__dot--active', isActive);
        /* role="tab" ARIA pattern — use aria-selected (not aria-current) and
           roving tabindex so only the active tab is in the tab sequence. */
        el.setAttribute('aria-selected', isActive ? 'true' : 'false');
        el.setAttribute('tabindex', isActive ? '0' : '-1');
      });
    }

    function init(root) {
      if (!root || root.__kitcheroSliderInit) return;
      root.__kitcheroSliderInit = true;

      var slides = root.querySelectorAll('[data-slide-index]');
      var length = slides.length;
      if (length === 0) return;

      var interval = Number(root.dataset.autoplayInterval || 0);
      var pauseOnHover = root.dataset.pauseOnHover === 'true';
      var current = 0;
      var playing = interval > 0 && !reducedMotion;
      var timerId = null;

      var controller = {
        go: function (i) {
          current = ((i % length) + length) % length;
          setActive(root, current);
        },
        next: function () {
          controller.go(current + 1);
        },
        prev: function () {
          controller.go(current - 1);
        },
        start: function () {
          if (!interval || reducedMotion) return;
          controller.stop();
          playing = true;
          timerId = setInterval(controller.next, interval * 1000);
          updateToggle();
        },
        stop: function () {
          if (timerId) {
            clearInterval(timerId);
            timerId = null;
          }
          playing = false;
          updateToggle();
        },
        reset: function () {
          if (!interval || reducedMotion) return;
          if (playing) {
            controller.stop();
            playing = true;
            timerId = setInterval(controller.next, interval * 1000);
            updateToggle();
          }
        },
        destroy: function () {
          controller.stop();
          if (pauseOnHover) {
            root.removeEventListener('mouseenter', onEnter);
            root.removeEventListener('mouseleave', onLeave);
          }
          root.__kitcheroSliderInit = false;
        },
      };

      var toggleBtn = root.querySelector('[data-slider-play-toggle]');
      function updateToggle() {
        if (!toggleBtn) return;
        toggleBtn.setAttribute('aria-pressed', playing ? 'true' : 'false');
      }

      function onEnter() {
        if (playing) controller.stop();
      }
      function onLeave() {
        if (!reducedMotion && interval > 0) {
          controller.start();
        }
      }

      /* Wire controls */
      var prevBtn = root.querySelector('[data-slider-prev]');
      var nextBtn = root.querySelector('[data-slider-next]');
      if (prevBtn) {
        prevBtn.addEventListener('click', function () {
          controller.prev();
          controller.reset();
        });
      }
      if (nextBtn) {
        nextBtn.addEventListener('click', function () {
          controller.next();
          controller.reset();
        });
      }

      /* Touch swipe on mobile. Same horizontal-bias pattern as the
         hero slider — 50px threshold + dY-vs-dX guard so vertical
         page scroll isn't hijacked. Pauses autoplay on touch start
         so the slide doesn't advance under the user's finger. */
      var swipeStartX = 0, swipeStartY = 0, swipeMoved = false;
      var SWIPE_THRESHOLD = 50;
      root.addEventListener('touchstart', function (e) {
        if (e.touches.length !== 1) return;
        swipeStartX = e.touches[0].clientX;
        swipeStartY = e.touches[0].clientY;
        swipeMoved = false;
        controller.stop();
      }, { passive: true });
      root.addEventListener('touchmove', function () {
        swipeMoved = true;
      }, { passive: true });
      root.addEventListener('touchend', function (e) {
        if (!swipeMoved || !e.changedTouches[0]) {
          if (!reducedMotion && interval > 0) controller.start();
          return;
        }
        var dx = e.changedTouches[0].clientX - swipeStartX;
        var dy = e.changedTouches[0].clientY - swipeStartY;
        if (Math.abs(dx) >= SWIPE_THRESHOLD && Math.abs(dx) > Math.abs(dy)) {
          if (dx < 0) controller.next(); else controller.prev();
          controller.reset();
        } else {
          if (!reducedMotion && interval > 0) controller.start();
        }
      }, { passive: true });

      var dotList = root.querySelectorAll('[data-slide-dot]');
      dotList.forEach(function (dot) {
        dot.addEventListener('click', function () {
          controller.go(Number(dot.dataset.slideDot));
          controller.reset();
        });
      });

      /* Keyboard navigation for the tablist — ArrowLeft/Right cycles tabs,
         Home/End jumps to first/last. Roving tabindex (set in setActive)
         means only the selected tab is focusable; arrows then move focus
         AND select the next tab (automatic activation). */
      var tablist = root.querySelector('[role="tablist"]');
      if (tablist) {
        tablist.addEventListener('keydown', function (event) {
          var key = event.key;
          if (key !== 'ArrowLeft' && key !== 'ArrowRight' &&
              key !== 'Home' && key !== 'End') return;
          event.preventDefault();
          var next = current;
          if (key === 'ArrowLeft')  next = (current - 1 + length) % length;
          if (key === 'ArrowRight') next = (current + 1) % length;
          if (key === 'Home')       next = 0;
          if (key === 'End')        next = length - 1;
          controller.go(next);
          controller.reset();
          var target = root.querySelector('[data-slide-dot="' + next + '"]');
          if (target) target.focus();
        });
      }

      if (toggleBtn) {
        toggleBtn.addEventListener('click', function () {
          if (playing) {
            controller.stop();
          } else if (!reducedMotion && interval > 0) {
            controller.start();
          }
        });
      }

      if (pauseOnHover && !reducedMotion) {
        root.addEventListener('mouseenter', onEnter);
        root.addEventListener('mouseleave', onLeave);
      }

      /* Theme editor — react to block select */
      root.addEventListener('shopify:block:select', function (event) {
        var target = event.target && event.target.closest
          ? event.target.closest('[data-slide-index]')
          : null;
        if (target) {
          controller.go(Number(target.dataset.slideIndex));
          controller.stop();
        }
      });

      /* Initial state */
      setActive(root, 0);
      updateToggle();

      if (playing) {
        timerId = setInterval(controller.next, interval * 1000);
      }

      instances.set(root.dataset.sectionId, controller);
    }

    function initAll() {
      document.querySelectorAll(SECTION_SELECTOR).forEach(init);
    }

    function teardown(sectionId) {
      var controller = instances.get(sectionId);
      if (controller) {
        controller.destroy();
        instances.delete(sectionId);
      }
    }

    /* Initial load */
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', initAll);
    } else {
      initAll();
    }

    document.addEventListener('shopify:section:load', function (event) {
      var root = event.target.querySelector
        ? event.target.querySelector(SECTION_SELECTOR)
        : null;
      if (root) init(root);
    });

    document.addEventListener('shopify:section:unload', function (event) {
      var root = event.target.querySelector
        ? event.target.querySelector(SECTION_SELECTOR)
        : null;
      if (root && root.dataset.sectionId) {
        teardown(root.dataset.sectionId);
      }
    });
  })();
}
