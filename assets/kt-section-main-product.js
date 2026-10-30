(function () {
  'use strict';

  function showImmediately(els) {
    if (!els || !els.forEach) return;
    els.forEach(function (el) {
      el.style.opacity = '1';
      el.style.transform = 'none';
    });
  }

  function initPdpAnim(scope) {
    var root = scope || document;
    var sections = root.querySelectorAll('[data-section-type="main-product"]');
    sections.forEach(function (section) {
      if (section.dataset.kitcheroPdpAnim === 'inited') return;
      section.dataset.kitcheroPdpAnim = 'inited';

      var els = section.querySelectorAll('[data-kt-pdp-anim-group] > *');
      if (!els.length) return;

      var reduceMotion = window.matchMedia &&
        window.matchMedia('(prefers-reduced-motion: reduce)').matches;

      if (window.gsap && !reduceMotion) {
        window.gsap.fromTo(
          els,
          { y: 30, opacity: 0 },
          { y: 0, opacity: 1, duration: 1, stagger: 0.1, ease: 'power3.out', delay: 0.1 }
        );
      } else if (window.gsap && reduceMotion) {
        window.gsap.fromTo(
          els,
          { opacity: 0 },
          { opacity: 1, duration: 0.4, stagger: 0.04, ease: 'power1.out' }
        );
      } else {
        showImmediately(els);
      }
    });
  }

  /* Sticky columns: each [data-kt-sticky-fit] element gets its height in
     --kt-sticky-h, so the CSS can let a column taller than the screen
     scroll to its end before it sticks. */
  var stickyObserver = null;

  function initStickyFit(scope) {
    if (!('ResizeObserver' in window)) return;
    if (!stickyObserver) {
      stickyObserver = new ResizeObserver(function (entries) {
        entries.forEach(function (entry) {
          entry.target.style.setProperty('--kt-sticky-h', Math.ceil(entry.target.offsetHeight) + 'px');
        });
      });
    }
    (scope || document).querySelectorAll('[data-kt-sticky-fit]').forEach(function (el) {
      stickyObserver.observe(el);
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', function () {
      initStickyFit();
      (window.ktWhenMotion || function (cb) { cb(); })(initPdpAnim);
    });
  } else {
    initStickyFit();
    (window.ktWhenMotion || function (cb) { cb(); })(initPdpAnim);
  }

  document.addEventListener('shopify:section:load', function (e) {
    var section = e.target.querySelector
      ? e.target.querySelector('[data-section-type="main-product"]')
      : null;
    if (section) delete section.dataset.kitcheroPdpAnim;
    initStickyFit(e.target);
    initPdpAnim(e.target);
  });

  document.addEventListener('shopify:section:unload', function (e) {
    if (!stickyObserver || !e.target.querySelectorAll) return;
    e.target.querySelectorAll('[data-kt-sticky-fit]').forEach(function (el) {
      stickyObserver.unobserve(el);
    });
  });

  document.addEventListener('shopify:block:select', function (event) {
    if (!event || !event.target) return;
    var blockEl = event.target;

    var detailsEl = blockEl.matches && blockEl.matches('details[data-product-accordion]')
      ? blockEl
      : (blockEl.querySelector && blockEl.querySelector('details[data-product-accordion]'));
    if (detailsEl && !detailsEl.open) {
      detailsEl.open = true;
    }
  });
})();
