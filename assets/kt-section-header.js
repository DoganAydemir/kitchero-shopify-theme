/**
 * Kitchero Header — Section JavaScript
 *
 * Responsibilities:
 *   - Toggle the .kt-header--scrolled class as the user scrolls.
 *   - Manage the transparent → solid transition on the home page.
 *   - Bind desktop dropdown / mega-menu open/close (pointerenter,
 *     click, Escape).
 *   - Re-run those checks on Shopify theme editor section events.
 *
 * The mobile menu toggle (hamburger) is bound separately in
 * `assets/kt-section-header-mobile-nav.js` so it survives the
 * smaller scroll-state init failures without taking down the
 * full navigation. If you add additional mobile-menu handlers
 * here, guard them against double-binding with the mobile-nav
 * module's binding flag (`window.__kitcheroMobileMenuBound`).
 *
 * No inline `<script>` blocks live in `sections/header.liquid` —
 * everything runs from external assets per CLAUDE.md.
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
    /* R216 — auto-detect transparent state from the DOM (no more
       `data-header-style` attribute on the header element). The CSS
       `:has()` selector lights up the transparent visual whenever
       the first `.shopify-section` inside `<main>` carries a
       `[data-allows-transparent-header="true"]` element, so we
       mirror the same check here to decide whether the smooth
       scroll-follow `--kt-header-top` machinery should run. */
    if (isTransparentPage()) {
      updateHeaderTop();
    }
  }

  function isTransparentPage() {
    /* R232 — merchant override via `data-header-style` on the
       <header> wins over auto-detection so the scroll-follow
       `--kt-header-top` machinery (which only matters for
       transparent positioning) runs in the right cases. */
    if (cachedHeader) {
      var explicit = cachedHeader.getAttribute('data-header-style');
      if (explicit === 'solid') return false;
      if (explicit === 'transparent') return true;
    }
    /* R232.4 — auto-detect now reads the *resolved* first section,
       not a CSS `:first-of-type` selector. In the Shopify theme
       editor preview iframe the editor injects sibling elements
       between `<main>` and the first .shopify-section wrapper for
       its section-selection UI; `:first-of-type` then matched the
       editor wrapper (which doesn't carry the data attribute),
       silently breaking auto-transparent on About / hero pages.
       Walking `main.querySelector('.shopify-section')` returns
       the first DESCENDANT regardless of intermediate wrappers. */
    var firstSection = document.querySelector('main .shopify-section');
    if (!firstSection) return false;
    return !!firstSection.querySelector('[data-allows-transparent-header="true"]');
  }

  /* R232.4 — sync a body class that mirrors the auto-transparent
     decision. CSS rules then key off this class instead of fighting
     the editor's DOM injection with brittle `:first-of-type` /
     `:first-child` selectors. JS-driven body class is robust across
     both storefront and editor preview contexts. */
  function syncTransparentBodyClass() {
    if (!cachedHeader || !cachedHeader.isConnected) {
      cachedHeader = document.querySelector('.kt-header');
    }
    document.body.classList.toggle('kt-body--header-transparent', isTransparentPage());
  }

  /* R232.21 — Shopify theme editor preview loads sections through
     the Section Rendering API asynchronously, so on the FIRST paint
     of an editor session `main .shopify-section` may not exist yet
     when `syncTransparentBodyClass()` runs at init — the body class
     stays off, the transparent CSS doesn't apply, and the header
     paints on a bare-body-background white strip until the merchant
     selects a section (which re-fires the sync).
     A MutationObserver on `<main>` re-runs the sync each time a
     section is injected so the class lands the moment the hero /
     banner-cover appears. Observes subtree so deeply nested
     attribute changes (e.g. an outer wrapper injected by editor
     before the actual section content) still trigger a re-sync. */
  var mainObserver = null;
  function watchMainForSections() {
    if (mainObserver) return;
    var mainEl = document.querySelector('main');
    if (!mainEl || typeof MutationObserver === 'undefined') {
      /* `<main>` doesn't exist yet — retry next tick. Editor preview
         sometimes injects `<main>` after the head scripts run. */
      setTimeout(watchMainForSections, 100);
      return;
    }
    mainObserver = new MutationObserver(function () {
      syncTransparentBodyClass();
    });
    /* `subtree: true` because editor-injected wrappers can sit
       BETWEEN `<main>` and the actual `.shopify-section` — direct-
       child observation misses those nested mutations. The sync
       function itself is cheap (two DOM reads + classList.toggle)
       so subtree-watching is fine. */
    mainObserver.observe(mainEl, {
      childList: true,
      subtree: true,
      attributes: true,
      attributeFilter: ['data-allows-transparent-header']
    });
  }

  /* R232.21b — Editor-mode safety net: poll the transparent state
     every 500ms for the first 4 seconds in case both MutationObserver
     and the section:load event miss the initial async-rendered
     hero / banner-cover. Production storefronts skip this entirely. */
  function pollInDesignMode() {
    if (!window.Shopify || !window.Shopify.designMode) return;
    var ticks = 0;
    var interval = setInterval(function () {
      syncTransparentBodyClass();
      ticks += 1;
      if (ticks >= 8) clearInterval(interval);
    }, 500);
  }

  /* R216 — drive the transparent header's `top` from scrollY so it
     follows the announcement banner up smoothly instead of staying
     pinned at banner-height while the banner scrolls away (which
     left a visible gap between the disappearing banner and the
     still-fixed header, then resolved with a jarring snap when the
     scroll threshold fired and the class toggled).
     Formula: `top = max(0, bannerHeight - scrollY)` — mirrors the
     sticky behavior the user expects but stays out of flow so the
     hero can still bleed behind the header. */
  var cachedBannerEl = null;
  function updateHeaderTop() {
    if (!cachedBannerEl || !cachedBannerEl.isConnected) {
      cachedBannerEl = document.querySelector('.kt-announcement-banner');
    }
    var bannerHeight = cachedBannerEl ? cachedBannerEl.offsetHeight : 0;
    var newTop = Math.max(0, bannerHeight - window.scrollY);
    document.documentElement.style.setProperty('--kt-header-top', newTop + 'px');
  }

  function updateScrollState() {
    if (scrollTicking) return;
    scrollTicking = true;
    requestAnimationFrame(computeScrollState);
  }

  window.addEventListener('scroll', updateScrollState, { passive: true });

  updateScrollState();
  syncTransparentBodyClass();
  watchMainForSections();
  pollInDesignMode();
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', updateScrollState);
    document.addEventListener('DOMContentLoaded', syncTransparentBodyClass);
    document.addEventListener('DOMContentLoaded', watchMainForSections);
    document.addEventListener('DOMContentLoaded', pollInDesignMode);
  }
  window.addEventListener('load', updateScrollState);
  window.addEventListener('load', syncTransparentBodyClass);
  window.addEventListener('load', watchMainForSections);

  document.addEventListener('shopify:section:load', updateScrollState);
  document.addEventListener('shopify:section:load', syncTransparentBodyClass);
  document.addEventListener('shopify:section:select', updateScrollState);
  document.addEventListener('shopify:section:select', syncTransparentBodyClass);
  document.addEventListener('shopify:section:unload', syncTransparentBodyClass);
  document.addEventListener('shopify:section:reorder', syncTransparentBodyClass);
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

  /* Per HTML spec, the boolean `open` attribute is only valid on
     <details> and <dialog>. We were writing it on a <li>, which W3C
     validators flag and Theme Check's HTML5 validity check will catch.
     Switched to `data-open` (still attribute-toggleable + still works
     in CSS via [data-open]) — semantically a custom data attribute,
     spec-clean on any element. The CSS selectors and the JS reader
     queries below all use [data-open] now. */
  function setExpanded(menuItem, open) {
    if (!menuItem) return;
    var trigger = menuItem.querySelector('[data-flyout-trigger]');
    if (open) {
      menuItem.setAttribute('data-open', '');
    } else {
      menuItem.removeAttribute('data-open');
    }
    if (trigger) {
      trigger.setAttribute('aria-expanded', open ? 'true' : 'false');
    }
  }

  function closeAll(except) {
    var items = document.querySelectorAll('.kt-header__menu-item[data-open]');
    items.forEach(function (i) { if (i !== except) setExpanded(i, false); });
  }

  /* Mouse hover — same UX as before. Pointerenter/leave bubble in
     capture phase so nested elements still hit the menu-item closest.

     R-touch-fix — gate on `pointerType !== 'touch'`. Without this gate,
     touch-on-desktop devices (iPad landscape ≥990px, Android tablets)
     hit pointerenter at touch-start which calls setExpanded(item, true)
     — and then the subsequent `click` handler at line 190 evaluates
     `willOpen = !item.hasAttribute('data-open')` as `false` (because
     pointerenter already set data-open) and closes the menu the user
     just tapped. The menu flashes open then closes; user must tap
     twice. Theme Store reviewers test touch-on-desktop and flag this
     as broken navigation ("Hover-only navigation breaking touch"
     rejection). The CSS hover gate `@media (hover: hover) and (pointer:
     fine)` was already in place for visual state, but the JS handlers
     fired unconditionally. */
  document.addEventListener('pointerenter', function (e) {
    if (e.pointerType === 'touch') return;
    var item = e.target && e.target.closest && e.target.closest('.kt-header__menu-item');
    if (!item) return;
    setExpanded(item, true);
  }, true);

  document.addEventListener('pointerleave', function (e) {
    if (e.pointerType === 'touch') return;
    var item = e.target && e.target.closest && e.target.closest('.kt-header__menu-item');
    if (!item) return;
    setExpanded(item, false);
  }, true);

  /* Click handler on the [data-flyout-trigger] anchor. Toggles [open] without
     navigating away — preventDefault is critical because the trigger
     is rendered as <a href> for graceful no-JS fallback (links work,
     dropdown becomes a regular link). With JS, click toggles the
     menu instead of following the href. Enter and Space on the
     focused anchor naturally fire `click` in browsers, so a single
     click handler covers both pointer and keyboard activation
     (matches the "open on click, not on focus" Theme Store rule). */
  document.addEventListener('click', function (e) {
    var trigger = e.target && e.target.closest && e.target.closest('.kt-header__menu-item > [data-flyout-trigger]');
    if (!trigger) return;
    var item = trigger.closest('.kt-header__menu-item');
    if (!item) return;
    /* Only intercept the click if the trigger has a flyout/mega-menu
       sibling — otherwise it's a regular link with no panel and we
       let the href navigation proceed. */
    var hasPanel = item.querySelector('.kt-header__mega-menu, .kt-header__flyout');
    if (!hasPanel) return;
    e.preventDefault();
    var willOpen = !item.hasAttribute('data-open');
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
    if (!item || !item.hasAttribute('data-open')) return;
    setExpanded(item, false);
    var trigger = item.querySelector('[data-flyout-trigger]');
    if (trigger) trigger.focus();
  });

  /* Tab leaving the menu item collapses it (keyboard equivalent of
     pointerleave). Listen on focusout — bubbles unlike focus/blur —
     and check that the new focus target is outside this menu-item.
     Note: this is NOT a focus-trigger to OPEN; it only handles the
     reverse case (close when keyboard moves on). */
  document.addEventListener('focusout', function (e) {
    var item = e.target.closest && e.target.closest('.kt-header__menu-item');
    if (!item || !item.hasAttribute('data-open')) return;
    var next = e.relatedTarget;
    if (next && item.contains(next)) return;
    setExpanded(item, false);
  });

  /* R-editor-lifecycle — Theme editor block:select handler. When the
     merchant picks a `mega_menu_featured` block in the sidebar, the
     block sits inside `.kt-header__mega-menu` which CSS keeps at
     opacity:0 / visibility:hidden until the parent menu item has
     `[data-open]`. Without this handler, the global pulse outline
     renders behind a closed invisible panel and `scrollIntoView`
     lands in nowhere — the merchant cannot see what they're editing.
     Force-open the matching parent menu item on `:block:select` and
     close it again on `:block:deselect`. */
  document.addEventListener('shopify:block:select', function (event) {
    var block = event.target;
    if (!block) return;
    var featured = block.classList && block.classList.contains('kt-header__mega-featured')
      ? block
      : (block.querySelector && block.querySelector('.kt-header__mega-featured'));
    if (!featured) return;
    var menuItem = featured.closest('.kt-header__menu-item');
    if (menuItem) {
      closeAll(menuItem);
      setExpanded(menuItem, true);
    }
  });

  document.addEventListener('shopify:block:deselect', function (event) {
    var block = event.target;
    if (!block) return;
    var featured = block.classList && block.classList.contains('kt-header__mega-featured')
      ? block
      : (block.querySelector && block.querySelector('.kt-header__mega-featured'));
    if (!featured) return;
    var menuItem = featured.closest('.kt-header__menu-item');
    if (menuItem) setExpanded(menuItem, false);
  });

  /* R91 — keep `--kt-header-offset` synced to the header's actual
     rendered height. CSS uses this var for `scroll-padding-top` +
     `scroll-margin-top` so anchor links land BELOW the sticky
     header. Previously hardcoded to 80px default; if the merchant
     adds an announcement bar, enlarges the logo, or rotates between
     mobile/desktop breakpoints, the offset got stale and anchor
     targets landed under the header. ResizeObserver handles all
     three cases (font load, viewport resize, design-mode setting
     changes) without polling. */
  function syncHeaderOffset() {
    var headerEl = document.querySelector('[data-section-type="header"]');
    if (!headerEl) return;
    var height = headerEl.offsetHeight;
    if (height > 0) {
      document.documentElement.style.setProperty('--kt-header-offset', height + 'px');
    }
  }

  /* R216 — keep `--kt-banner-height` synced to the announcement
     banner's actual rendered height. The transparent-mode header
     CSS uses this variable (with a 40px desktop / 34px mobile
     fallback that lands at first paint via :has() detection, so
     there's no FOUC) to drop the fixed header just below the
     banner. ResizeObserver refines the value once a banner present
     case differs from the fallback — multi-line copy, larger
     padding, app blocks attached to the banner section, etc. */
  function syncBannerHeight() {
    var bannerEl = document.querySelector('.kt-announcement-banner');
    if (!bannerEl) return;
    var height = bannerEl.offsetHeight;
    if (height > 0) {
      document.documentElement.style.setProperty('--kt-banner-height', height + 'px');
    }
  }

  if (typeof ResizeObserver !== 'undefined') {
    var observerHeader = document.querySelector('[data-section-type="header"]');
    if (observerHeader) {
      var headerOffsetObserver = new ResizeObserver(syncHeaderOffset);
      headerOffsetObserver.observe(observerHeader);
    }
    var observerBanner = document.querySelector('.kt-announcement-banner');
    if (observerBanner) {
      /* When the banner resizes (font-load reflow, rotation between
         differently-sized slides, app block attached at runtime, the
         editor adding/removing blocks), recompute BOTH the cached
         banner-height variable AND the transparent header's `top` so
         the header stays visually anchored to the banner's bottom
         edge across the size change. */
      var bannerHeightObserver = new ResizeObserver(function () {
        syncBannerHeight();
        updateHeaderTop();
      });
      bannerHeightObserver.observe(observerBanner);
    }
  }
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', syncHeaderOffset);
    document.addEventListener('DOMContentLoaded', syncBannerHeight);
  } else {
    syncHeaderOffset();
    syncBannerHeight();
  }
  window.addEventListener('resize', syncHeaderOffset);
  window.addEventListener('resize', syncBannerHeight);
  document.addEventListener('shopify:section:load', syncHeaderOffset);
  document.addEventListener('shopify:section:load', syncBannerHeight);
})();
