/**
 * Kitchero Header — Section JavaScript
 *
 * This file is the SECONDARY source of header behaviour. The mobile
 * menu toggle lives inline in sections/header.liquid because the
 * Shopify CDN was caching a stale version of this asset on some
 * route types, breaking the menu. See the Liquid comment there for
 * the full story.
 *
 * All this external file does:
 *   - Toggle the .kt-header--scrolled class as the user scrolls.
 *   - Manage the transparent → solid transition on the home page.
 *   - Re-run those checks on Shopify theme editor section events.
 *
 * NO click handlers for the mobile menu live here anymore. If you
 * add some, guard them against double-binding with the inline
 * bootstrap by checking `window.__kitcheroMobileMenuBound`.
 */
(function () {
  'use strict';

  var SCROLL_THRESHOLD = 50;

  function updateScrollState() {
    var header = document.querySelector('.kt-header');
    if (!header) return;
    var scrolled = window.scrollY > SCROLL_THRESHOLD;
    header.classList.toggle('kt-header--scrolled', scrolled);
    var isTransparent = header.dataset.headerStyle === 'transparent';
    if (isTransparent) {
      header.classList.toggle('kt-header--transparent', !scrolled);
    }
  }

  window.addEventListener('scroll', updateScrollState, { passive: true });

  updateScrollState();
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', updateScrollState);
  }
  window.addEventListener('load', updateScrollState);

  document.addEventListener('shopify:section:load', updateScrollState);
  document.addEventListener('shopify:section:select', updateScrollState);
  document.addEventListener('shopify:section:unload', function () {
    document.body.style.overflow = '';
  });
})();
