/**
 * Kitchero Header — Section JavaScript
 *
 * Fully delegated implementation. Everything is wired via a single
 * document-level click handler and a single scroll handler. There is
 * no class, no per-instance state, no DOM traversal inside event
 * handlers — any click on `.kt-header__menu-toggle` opens the mobile
 * panel, any click on `.kt-header__mobile-panel-close` closes it.
 * Works even if the header is re-rendered by the theme editor, loaded
 * asynchronously, or initialized before the DOM is ready.
 *
 * Works without JS: the markup is semantic (nav > ul > a), so if JS
 * fails the desktop menu still renders from the markup. Mobile panel
 * only becomes visible with JS — acceptable trade-off for the slide
 * animation.
 */
(function () {
  'use strict';

  var MOBILE_PANEL_SELECTOR = '.kt-header__mobile-panel';
  var TOGGLE_SELECTOR = '.kt-header__menu-toggle';
  var CLOSE_SELECTOR = '.kt-header__mobile-panel-close';
  var OPEN_CLASS = 'kt-header__mobile-panel--open';
  var SCROLL_THRESHOLD = 50;

  function getPanel() {
    return document.querySelector(MOBILE_PANEL_SELECTOR);
  }

  function getToggle() {
    return document.querySelector(TOGGLE_SELECTOR);
  }

  function openPanel() {
    var panel = getPanel();
    var toggle = getToggle();
    if (!panel) return;
    panel.classList.add(OPEN_CLASS);
    if (toggle) toggle.setAttribute('aria-expanded', 'true');
    document.body.style.overflow = 'hidden';
    // Toggle icon visibility
    var openIcon = document.querySelector('.kt-header__menu-toggle-open');
    var closeIcon = document.querySelector('.kt-header__menu-toggle-close');
    if (openIcon) openIcon.classList.add('hidden');
    if (closeIcon) closeIcon.classList.remove('hidden');
  }

  function closePanel() {
    var panel = getPanel();
    var toggle = getToggle();
    if (!panel) return;
    panel.classList.remove(OPEN_CLASS);
    if (toggle) toggle.setAttribute('aria-expanded', 'false');
    document.body.style.overflow = '';
    var openIcon = document.querySelector('.kt-header__menu-toggle-open');
    var closeIcon = document.querySelector('.kt-header__menu-toggle-close');
    if (openIcon) openIcon.classList.remove('hidden');
    if (closeIcon) closeIcon.classList.add('hidden');
  }

  function togglePanel() {
    var panel = getPanel();
    if (!panel) return;
    if (panel.classList.contains(OPEN_CLASS)) {
      closePanel();
    } else {
      openPanel();
    }
  }

  /* Delegated click handler — the ONE place all header clicks route
     through. No race conditions because there's a single listener on
     the document and it covers the whole header regardless of when
     the DOM was rendered. */
  document.addEventListener('click', function (e) {
    if (e.target.closest(TOGGLE_SELECTOR)) {
      e.preventDefault();
      togglePanel();
      return;
    }
    if (e.target.closest(CLOSE_SELECTOR)) {
      e.preventDefault();
      closePanel();
      return;
    }
  });

  /* Keyboard accessibility — Escape closes the panel. */
  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape' || e.code === 'Escape') {
      var panel = getPanel();
      if (panel && panel.classList.contains(OPEN_CLASS)) {
        closePanel();
        var toggle = getToggle();
        if (toggle) toggle.focus();
      }
    }
  });

  /* Scroll state — toggles .kt-header--scrolled and manages the
     transparent → solid transition on the home page. Works via a
     delegated handler too; re-queries the header each call so it
     stays correct through editor re-renders. */
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

  /* Run the initial scroll check as soon as possible. Repeat on
     every common "ready" milestone so we never miss it. */
  function initialScroll() {
    updateScrollState();
  }
  initialScroll();
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initialScroll);
  }
  window.addEventListener('load', initialScroll);

  /* Theme editor — Shopify fires these when sections are added,
     removed, or re-rendered. Re-running the scroll check keeps the
     header's transparent/solid state in sync. The click handler is
     already delegated so nothing else needs re-binding. */
  document.addEventListener('shopify:section:load', initialScroll);
  document.addEventListener('shopify:section:unload', function () {
    document.body.style.overflow = '';
  });
  document.addEventListener('shopify:section:select', initialScroll);
})();
