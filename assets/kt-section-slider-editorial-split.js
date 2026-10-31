if (!window.__kitcheroSliderEditorialLoaded) {
  window.__kitcheroSliderEditorialLoaded = true;

  (function () {
    'use strict';

    var prefersReducedMotion = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    var instances = new Map();

    function initSection(section) {
      if (!section) return;
      var sectionId = section.getAttribute('data-section-id');
      if (!sectionId) return;

      destroySection(sectionId);

      var interval = parseFloat(section.getAttribute('data-autoplay-interval') || '0');
      var total = parseInt(section.getAttribute('data-total-slides') || '0', 10);

      var imageSlides = section.querySelectorAll('[data-editorial-image]');
      var copySlides = section.querySelectorAll('[data-editorial-copy]');
      var navBtns = section.querySelectorAll('[data-editorial-nav]');
      var progressBar = section.querySelector('[data-editorial-progress]');

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
          el.toggleAttribute('inert', !on);
        });

        copySlides.forEach(function (el, i) {
          el.classList.toggle('is-active', i === nextIndex);
          el.setAttribute('aria-hidden', i === nextIndex ? 'false' : 'true');
          el.toggleAttribute('inert', i !== nextIndex);
        });

        navBtns.forEach(function (btn, i) {
          var on = i === nextIndex;
          btn.classList.toggle('is-active', on);

          btn.setAttribute('aria-selected', on ? 'true' : 'false');
          btn.setAttribute('tabindex', on ? '0' : '-1');
        });

        activeIndex = nextIndex;
        restartProgress();
      }

      function restartProgress() {
        if (!progressBar) return;

        progressBar.classList.remove('is-running');

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

        if (window.Shopify && window.Shopify.designMode) return;

        restartProgress();
      }

      function stopAutoplay() {
        if (timer) {
          window.clearInterval(timer);
          timer = null;
        }

        if (progressBar) progressBar.classList.remove('is-running');
      }

      if (progressBar) {
        progressBar.addEventListener('animationend', function (e) {
          if (e.animationName !== 'kt-editorial-progress') return;
          if (userPaused || prefersReducedMotion) return;
          if (window.Shopify && window.Shopify.designMode) return;
          if (total < 2) return;
          advance();
        });
      }

      var playToggle = section.querySelector('[data-editorial-play-toggle]');
      var userPaused = false;
      function syncPlayToggleState() {
        if (!playToggle) return;
        playToggle.setAttribute('aria-pressed', userPaused ? 'false' : 'true');
      }
      if (playToggle) {
        playToggle.addEventListener('click', function () {
          userPaused = !userPaused;
          if (userPaused) {
            stopAutoplay();
          } else if (!prefersReducedMotion && interval > 0 && total > 1) {
            startAutoplay();
          }
          syncPlayToggleState();
        });
      }

      section.addEventListener('focusin', function () {
        stopAutoplay();
      });
      section.addEventListener('focusout', function (e) {
        if (e.relatedTarget && section.contains(e.relatedTarget)) return;
        if (userPaused || prefersReducedMotion || interval <= 0 || total < 2) return;
        startAutoplay();
      });

      navBtns.forEach(function (btn) {
        btn.addEventListener('click', function () {
          var idx = parseInt(btn.getAttribute('data-editorial-nav'), 10);
          if (isNaN(idx)) return;
          setActive(idx);

          if (!userPaused && !prefersReducedMotion && interval > 0 && total > 1) {
            startAutoplay();
          }
        });
      });

      var swipeStartX = 0, swipeStartY = 0, swipeMoved = false;
      var SWIPE_THRESHOLD = 50;
      section.addEventListener('touchstart', function (e) {
        if (e.touches.length !== 1) return;
        swipeStartX = e.touches[0].clientX;
        swipeStartY = e.touches[0].clientY;
        swipeMoved = false;
        stopAutoplay();
      }, { passive: true });
      section.addEventListener('touchmove', function () {
        swipeMoved = true;
      }, { passive: true });
      section.addEventListener('touchend', function (e) {
        if (!swipeMoved || !e.changedTouches[0]) {
          if (!prefersReducedMotion && interval > 0 && total > 1) startAutoplay();
          return;
        }
        var dx = e.changedTouches[0].clientX - swipeStartX;
        var dy = e.changedTouches[0].clientY - swipeStartY;
        if (Math.abs(dx) >= SWIPE_THRESHOLD && Math.abs(dx) > Math.abs(dy)) {
          if (dx < 0) {
            setActive(activeIndex + 1);
          } else {
            setActive(activeIndex - 1);
          }
          if (!prefersReducedMotion && interval > 0 && total > 1) startAutoplay();
        } else {
          if (!prefersReducedMotion && interval > 0 && total > 1) startAutoplay();
        }
      }, { passive: true });

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

      restartProgress();

      instances.set(sectionId, {
        section: section,
        timer: function () { return timer; },

        setActive: setActive,
        stopAutoplay: stopAutoplay,
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

    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', initAll);
    } else {
      initAll();
    }

    document.addEventListener('shopify:section:load', function (e) {
      var section = document.querySelector('[data-section-id="' + e.detail.sectionId + '"][data-section-type="slider-editorial-split"]');
      if (section) initSection(section);
    });

    document.addEventListener('shopify:section:unload', function (e) {
      destroySection(e.detail.sectionId);
    });

    document.addEventListener('shopify:block:select', function (e) {
      var sectionId = e.detail && e.detail.sectionId;
      if (!sectionId) return;
      var inst = instances.get(sectionId);
      if (!inst) return;
      var block = e.target;
      if (!block) return;
      var raw = block.getAttribute('data-editorial-copy') || block.getAttribute('data-editorial-image');
      var idx = parseInt(raw, 10);
      if (isNaN(idx)) return;
      inst.stopAutoplay();
      inst.setActive(idx);
    });
  })();
}
