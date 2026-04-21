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

  /* ------------------------------------------------------------------
     Desktop mega-menu / flyout aria-expanded state.

     CSS opens the .kt-header__mega-menu / .kt-header__flyout panels
     via :hover / :focus-within on the parent .kt-header__menu-item —
     fully declarative for sighted users. But screen-reader users
     reading the parent anchor hear "aria-expanded false" even when
     the panel is visually open, because nothing toggles the attribute.

     Wire focusin/focusout + pointerenter/pointerleave on each menu
     item and flip aria-expanded on the first [aria-haspopup] anchor
     inside it. Delegated to document so new sections loaded in the
     theme editor (or shopify:section:load) pick up listeners too.
  ------------------------------------------------------------------ */

  function setExpanded(menuItem, open) {
    if (!menuItem) return;
    var trigger = menuItem.querySelector('[aria-haspopup]');
    if (!trigger) return;
    trigger.setAttribute('aria-expanded', open ? 'true' : 'false');
  }

  document.addEventListener('pointerenter', function (e) {
    var item = e.target && e.target.closest && e.target.closest('.kt-header__menu-item');
    if (!item) return;
    setExpanded(item, true);
  }, true);

  document.addEventListener('pointerleave', function (e) {
    var item = e.target && e.target.closest && e.target.closest('.kt-header__menu-item');
    if (!item) return;
    setExpanded(item, false);
  }, true);

  /* focusin/focusout bubble (unlike focus/blur) so delegation works.
     focusout fires BEFORE the new element gets focus, so the
     relatedTarget check catches keyboard Tab cycling within the
     panel — if new focus is still inside the same menu item, keep
     expanded; otherwise collapse. */
  document.addEventListener('focusin', function (e) {
    var item = e.target.closest && e.target.closest('.kt-header__menu-item');
    if (!item) return;
    setExpanded(item, true);
  });

  document.addEventListener('focusout', function (e) {
    var item = e.target.closest && e.target.closest('.kt-header__menu-item');
    if (!item) return;
    var next = e.relatedTarget;
    if (next && item.contains(next)) return;
    setExpanded(item, false);
  });

  /* Escape key collapses the currently-focused mega/flyout so keyboard
     users can back out without clicking away. */
  document.addEventListener('keydown', function (e) {
    if (e.key !== 'Escape' && e.code !== 'Escape') return;
    var active = document.activeElement;
    if (!active) return;
    var item = active.closest && active.closest('.kt-header__menu-item');
    if (!item) return;
    setExpanded(item, false);
    var trigger = item.querySelector('[aria-haspopup]');
    if (trigger) trigger.focus();
  });
})();
