/**
 * Announcement Banner — offset measurement.
 *
 * The banner renders first in the header-group (above the fixed
 * header). The header defaults to `position: fixed; top: 0` which
 * would otherwise sit ON TOP of the banner visually, hiding the
 * promo strip.
 *
 * Fix: measure the banner's rendered outer height (including margin
 * box) and publish it as `--kt-announcement-banner-height` on the
 * document root. The header's CSS reads this variable as its `top`
 * offset so it floats below the banner instead of over it. Spacer
 * height picks it up too so below-fold content starts at the right
 * y-coordinate.
 *
 * Re-measures on:
 *   - DOMContentLoaded: initial paint
 *   - window resize: banner wraps to 2 lines on narrow viewports
 *     (flex-wrap: wrap at ≤639px), and desktop↔mobile rotation
 *   - shopify:section:load/unload: merchant toggles the banner in
 *     the theme editor
 *
 * When no banner is on the page, the variable is set to `0px` so
 * `top: var(--kt-announcement-banner-height, 0px)` falls back
 * cleanly — same rendered position as before the fix.
 */
(function () {
  'use strict';

  var BANNER_SELECTOR = '.kt-announcement-banner';

  function measure() {
    var banner = document.querySelector(BANNER_SELECTOR);
    if (!banner) {
      document.documentElement.style.setProperty('--kt-announcement-banner-height', '0px');
      return;
    }
    /* offsetHeight covers the banner's border-box (no margins).
       The banner has margin: 1.25rem 1.5rem → top/bottom margins of
       ~20px each add to the visual footprint in flow. Add them so the
       header is pushed past the banner's margin area too, not just
       its content box. */
    var styles = window.getComputedStyle(banner);
    var marginTop = parseFloat(styles.marginTop) || 0;
    var marginBottom = parseFloat(styles.marginBottom) || 0;
    var total = banner.offsetHeight + marginTop + marginBottom;
    document.documentElement.style.setProperty(
      '--kt-announcement-banner-height',
      total + 'px'
    );
  }

  /* Initial run — fire as soon as DOM is parsed so the fixed header
     doesn't render at top:0 and then snap down on measurement. */
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', measure);
  } else {
    measure();
  }

  /* Re-measure on resize. Debounced via rAF because resize can fire
     dozens of times per second during drag. */
  var resizeRaf = null;
  window.addEventListener('resize', function () {
    if (resizeRaf) cancelAnimationFrame(resizeRaf);
    resizeRaf = requestAnimationFrame(function () {
      measure();
      resizeRaf = null;
    });
  });

  /* Theme editor lifecycle: merchant may enable/disable the banner
     while editing. Re-measure on both load (new banner added or its
     content changed) and unload (banner removed — reset variable). */
  document.addEventListener('shopify:section:load', function (event) {
    if (event.target && event.target.querySelector &&
        event.target.querySelector(BANNER_SELECTOR)) {
      measure();
    }
  });

  document.addEventListener('shopify:section:unload', function (event) {
    if (event.target && event.target.querySelector &&
        event.target.querySelector(BANNER_SELECTOR)) {
      /* Wait a tick for the DOM to actually unmount, then measure. */
      requestAnimationFrame(measure);
    }
  });
})();
