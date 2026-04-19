/**
 * Slider — Editorial Split
 *
 * Wires up the two-pane cross-fade carousel:
 *   - Image pane fades between slides (CSS transition on `.is-active`)
 *   - Copy pane cross-fades with staggered reveal for eyebrow/heading/
 *     description/CTA via `[data-editorial-anim]` + `--anim-delay`
 *   - Numbered nav (`[data-editorial-nav]`) swaps slides
 *   - Progress bar (`[data-editorial-progress]`) resets + re-runs its
 *     CSS keyframe each advance so the fill stays in sync with the JS
 *     `setInterval` that drives autoplay
 *   - Respects `prefers-reduced-motion` (no autoplay, instant swaps)
 *   - Safe for Shopify theme editor via shopify:section:load/unload
 *   - Idempotent load-guard: tolerates double <script> injection
 */
if (!window.__kitcheroSliderEditorialLoaded) {
  window.__kitcheroSliderEditorialLoaded = true;

  (function () {
    'use strict';

    var prefersReducedMotion = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    /** Map<sectionId, { timer, section, cleanup }> */
    var instances = new Map();

    function initSection(section) {
      if (!section) return;
      var sectionId = section.getAttribute('data-section-id');
      if (!sectionId) return;

      /* If already initialised (editor reload), tear down first */
      destroySection(sectionId);

      var interval = parseFloat(section.getAttribute('data-autoplay-interval') || '0');
      var total = parseInt(section.getAttribute('data-total-slides') || '0', 10);

      var imageSlides = section.querySelectorAll('[data-editorial-image]');
      var copySlides = section.querySelectorAll('[data-editorial-copy]');
      var navBtns = section.querySelectorAll('[data-editorial-nav]');
      var progressBar = section.querySelector('[data-editorial-progress]');

      /* Assign --anim-delay once from each element's data-delay so CSS
         can stagger the reveal without a per-slide class. */
      section.querySelectorAll('[data-editorial-anim]').forEach(function (el) {
        var delay = parseInt(el.getAttribute('data-delay') || '0', 10);
        el.style.setProperty('--anim-delay', delay);
      });

      var activeIndex = 0;
      var timer = null;

      function setActive(nextIndex) {
        if (total < 1) return;
        nextIndex = ((nextIndex % total) + total) % total;
        if (nextIndex === activeIndex) return;

        imageSlides.forEach(function (el, i) {
          var on = i === nextIndex;
          el.classList.toggle('is-active', on);
          el.setAttribute('aria-hidden', on ? 'false' : 'true');
        });

        copySlides.forEach(function (el, i) {
          el.classList.toggle('is-active', i === nextIndex);
          el.setAttribute('aria-hidden', i === nextIndex ? 'false' : 'true');
        });

        navBtns.forEach(function (btn, i) {
          var on = i === nextIndex;
          btn.classList.toggle('is-active', on);
          /* role="tab" ARIA pattern — aria-selected + roving tabindex so
             only the active tab is reachable by a single Tab press. Arrow
             keys move between tabs (see tablist keydown handler below). */
          btn.setAttribute('aria-selected', on ? 'true' : 'false');
          btn.setAttribute('tabindex', on ? '0' : '-1');
        });

        activeIndex = nextIndex;
        restartProgress();
      }

      function restartProgress() {
        if (!progressBar) return;
        /* Cancel & re-add the CSS animation: remove class, force reflow,
           add class. The animation `duration` reads the CSS custom
           property `--kt-editorial-interval` set on the section root. */
        progressBar.classList.remove('is-running');
        // Force reflow so the next class addition starts a fresh animation
        void progressBar.offsetWidth;
        progressBar.classList.add('is-running');
      }

      function advance() {
        setActive(activeIndex + 1);
      }

      function startAutoplay() {
        stopAutoplay();
        if (prefersReducedMotion) return;
        if (!interval || interval <= 0) return;
        if (total < 2) return;
        timer = window.setInterval(advance, interval * 1000);
        restartProgress();
      }

      function stopAutoplay() {
        if (timer) {
          window.clearInterval(timer);
          timer = null;
        }
      }

      /* Wire nav clicks: swap slide + restart autoplay timer */
      navBtns.forEach(function (btn) {
        btn.addEventListener('click', function () {
          var idx = parseInt(btn.getAttribute('data-editorial-nav'), 10);
          if (isNaN(idx)) return;
          setActive(idx);
          /* Restart so user click gets full interval before next auto-advance */
          if (!prefersReducedMotion && interval > 0 && total > 1) {
            startAutoplay();
          }
        });
      });

      /* Keyboard nav on the tablist — WAI-ARIA Authoring Practices tab
         pattern: ArrowLeft/Right cycle, Home/End jump to ends. Activates
         the target tab (automatic activation) and moves DOM focus so the
         roving tabindex follows the user. */
      var tablist = section.querySelector('[role="tablist"]');
      if (tablist) {
        tablist.addEventListener('keydown', function (event) {
          var key = event.key;
          if (key !== 'ArrowLeft' && key !== 'ArrowRight' &&
              key !== 'Home' && key !== 'End') return;
          if (total < 2) return;
          event.preventDefault();
          var next = activeIndex;
          if (key === 'ArrowLeft')  next = (activeIndex - 1 + total) % total;
          if (key === 'ArrowRight') next = (activeIndex + 1) % total;
          if (key === 'Home')       next = 0;
          if (key === 'End')        next = total - 1;
          setActive(next);
          if (!prefersReducedMotion && interval > 0 && total > 1) {
            startAutoplay();
          }
          var target = section.querySelector('[data-editorial-nav="' + next + '"]');
          if (target) target.focus();
        });
      }

      /* Pause autoplay when the section is off-screen (saves CPU) */
      var observer = null;
      if ('IntersectionObserver' in window && !prefersReducedMotion && interval > 0 && total > 1) {
        observer = new IntersectionObserver(function (entries) {
          entries.forEach(function (entry) {
            if (entry.isIntersecting) {
              startAutoplay();
            } else {
              stopAutoplay();
            }
          });
        }, { threshold: 0.25 });
        observer.observe(section);
      } else {
        startAutoplay();
      }

      /* Kick off progress bar on mount */
      restartProgress();

      instances.set(sectionId, {
        section: section,
        timer: function () { return timer; },
        cleanup: function () {
          stopAutoplay();
          if (observer) {
            observer.disconnect();
            observer = null;
          }
        },
      });
    }

    function destroySection(sectionId) {
      var inst = instances.get(sectionId);
      if (!inst) return;
      inst.cleanup();
      instances.delete(sectionId);
    }

    function initAll() {
      document
        .querySelectorAll('[data-section-type="slider-editorial-split"]')
        .forEach(initSection);
    }

    /* Initial mount */
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', initAll);
    } else {
      initAll();
    }

    /* Theme editor lifecycle */
    document.addEventListener('shopify:section:load', function (e) {
      var section = document.querySelector('[data-section-id="' + e.detail.sectionId + '"][data-section-type="slider-editorial-split"]');
      if (section) initSection(section);
    });

    document.addEventListener('shopify:section:unload', function (e) {
      destroySection(e.detail.sectionId);
    });
  })();
}
