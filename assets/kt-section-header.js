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
  // Cache the header ref + rAF gate: previously `updateScrollState`
  // did a fresh document.querySelector on every scroll tick (50-100
  // times/sec on fast wheels) plus two DOM writes. On long-scroll
  // pages that's measurable TBT. Cache at lookup on each call (so
  // editor re-mounts still resolve), but gate the whole handler
  // behind a requestAnimationFrame flag so we only update state
  // once per frame even if scroll fires 5× between paints.
  var scrollTicking = false;
  var cachedHeader = null;

  function computeScrollState() {
    scrollTicking = false;
    if (!cachedHeader || !cachedHeader.isConnected) {
      cachedHeader = document.querySelector('.kt-header');
    }
    if (!cachedHeader) return;
    var scrolled = window.scrollY > SCROLL_THRESHOLD;
    cachedHeader.classList.toggle('kt-header--scrolled', scrolled);
    var isTransparent = cachedHeader.dataset.headerStyle === 'transparent';
    if (isTransparent) {
      cachedHeader.classList.toggle('kt-header--transparent', !scrolled);
    }
  }

  function updateScrollState() {
    if (scrollTicking) return;
    scrollTicking = true;
    requestAnimationFrame(computeScrollState);
  }

  window.addEventListener('scroll', updateScrollState, { passive: true });

  updateScrollState();
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', updateScrollState);
  }
  window.addEventListener('load', updateScrollState);

  document.addEventListener('shopify:section:load', updateScrollState);
  document.addEventListener('shopify:section:select', updateScrollState);
  /* Intentionally NO body-overflow reset on section:unload. The mobile
     nav owns its own scrollLock owner id and releases it from
     kt-section-header-mobile-nav.js's own shopify:section:unload
     handler. A blanket `document.body.style.overflow = ''` here would
     stomp a sibling drawer's lock (cart-drawer, filter-drawer, etc.)
     if the merchant unloads the header while those were open. */

  /* ------------------------------------------------------------------
     Desktop mega-menu / flyout — keyboard-and-mouse trigger.

     Theme Store accessibility audit (manual, not Lighthouse) explicitly
     rejects focus-triggered dropdowns: "Dropdown navigation elements
     open on click, not on focus. This allows keyboard users to easily
     bypass the navigation area." The audit further requires:
       - open on Enter or Space
       - close on Escape, returning focus to the parent element

     Earlier revision flipped aria-expanded on focusin, which (a) was
     a focus-trigger in everything but name and (b) confused SRs into
     announcing "expanded" while the visual panel stayed hidden because
     the CSS show-rule keyed off [open], not aria-expanded. Reviewers
     would tab into a top-level link, hear "expanded", attempt to tab
     into invisible submenu items, and reject.

     New shape:
       - setExpanded toggles BOTH the [open] attribute on the menu-item
         (CSS shows the panel) AND aria-expanded on the trigger anchor
         (SR announcement stays in sync with visual state).
       - Mouse user: pointerenter/leave (hover) — unchanged UX.
       - Keyboard user: click handler (Enter/Space activates the
         anchor → click event fires) toggles [open]. No focus-trigger.
       - Esc closes the open menu and returns focus to the trigger.
       - Document-level click outside collapses any open panel.

     Delegated to document so sections re-loaded by the theme editor
     (or shopify:section:load) pick up listeners without re-binding.
  ------------------------------------------------------------------ */

  function setExpanded(menuItem, open) {
    if (!menuItem) return;
    var trigger = menuItem.querySelector('[aria-haspopup]');
    if (open) {
      menuItem.setAttribute('open', '');
    } else {
      menuItem.removeAttribute('open');
    }
    if (trigger) {
      trigger.setAttribute('aria-expanded', open ? 'true' : 'false');
    }
  }

  function closeAll(except) {
    var items = document.querySelectorAll('.kt-header__menu-item[open]');
    items.forEach(function (i) { if (i !== except) setExpanded(i, false); });
  }

  /* Mouse hover — same UX as before. Pointerenter/leave bubble in
     capture phase so nested elements still hit the menu-item closest. */
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

  /* Click handler on the [aria-haspopup] anchor. Toggles [open] without
     navigating away — preventDefault is critical because the trigger
     is rendered as <a href> for graceful no-JS fallback (links work,
     dropdown becomes a regular link). With JS, click toggles the
     menu instead of following the href. Enter and Space on the
     focused anchor naturally fire `click` in browsers, so a single
     click handler covers both pointer and keyboard activation
     (matches the "open on click, not on focus" Theme Store rule). */
  document.addEventListener('click', function (e) {
    var trigger = e.target && e.target.closest && e.target.closest('.kt-header__menu-item > [aria-haspopup]');
    if (!trigger) return;
    var item = trigger.closest('.kt-header__menu-item');
    if (!item) return;
    /* Only intercept the click if the trigger has a flyout/mega-menu
       sibling — otherwise it's a regular link with no panel and we
       let the href navigation proceed. */
    var hasPanel = item.querySelector('.kt-header__mega-menu, .kt-header__flyout');
    if (!hasPanel) return;
    e.preventDefault();
    var willOpen = !item.hasAttribute('open');
    closeAll(willOpen ? item : null);
    setExpanded(item, willOpen);
  });

  /* Click outside the header closes any open dropdown. */
  document.addEventListener('click', function (e) {
    var insideHeader = e.target && e.target.closest && e.target.closest('.kt-header');
    if (insideHeader) return;
    closeAll();
  });

  /* Escape collapses the currently-active dropdown and returns focus
     to its trigger anchor — Theme Store explicit a11y requirement. */
  document.addEventListener('keydown', function (e) {
    if (e.key !== 'Escape' && e.code !== 'Escape') return;
    var active = document.activeElement;
    if (!active) return;
    var item = active.closest && active.closest('.kt-header__menu-item');
    if (!item || !item.hasAttribute('open')) return;
    setExpanded(item, false);
    var trigger = item.querySelector('[aria-haspopup]');
    if (trigger) trigger.focus();
  });

  /* Tab leaving the menu item collapses it (keyboard equivalent of
     pointerleave). Listen on focusout — bubbles unlike focus/blur —
     and check that the new focus target is outside this menu-item.
     Note: this is NOT a focus-trigger to OPEN; it only handles the
     reverse case (close when keyboard moves on). */
  document.addEventListener('focusout', function (e) {
    var item = e.target.closest && e.target.closest('.kt-header__menu-item');
    if (!item || !item.hasAttribute('open')) return;
    var next = e.relatedTarget;
    if (next && item.contains(next)) return;
    setExpanded(item, false);
  });
})();
