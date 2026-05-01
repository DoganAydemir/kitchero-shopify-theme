/**
 * Kitchero Theme — Global runtime helpers.
 *
 * Exposes a single `window.Kitchero` namespace that bundles the handful of
 * browser-level utilities shared across the theme:
 *
 *   Kitchero.focusTrap        keyboard focus containment for drawers/modals
 *   Kitchero.bus              minimal event bus with `.on` / `.off` / `.emit`
 *   Kitchero.escapeCloseDetails  keydown handler that closes an open <details> on Esc
 *
 * Architecture:
 *   - Focus trap: per-container WeakMap for cleanup so multiple traps
 *     can coexist and be torn down independently.
 *   - Event bus: Map<eventName, Set<listener>> for O(1) unsubscribe
 *     without rebuilding the listener collection on each removal.
 *   - escapeCloseDetails: document-level keydown that closes the
 *     nearest open <details> on Escape, so dropdowns/disclosures
 *     don't require per-component Escape wiring.
 */

(function (global) {
  'use strict';

  /* ------------------------------------------------------------------ */
  /* Focus trap                                                         */
  /* ------------------------------------------------------------------ */

  var FOCUSABLE_SELECTOR = [
    'a[href]:not([tabindex="-1"])',
    'area[href]:not([tabindex="-1"])',
    'button:not([disabled]):not([tabindex="-1"])',
    'input:not([type="hidden"]):not([disabled]):not([tabindex="-1"])',
    'select:not([disabled]):not([tabindex="-1"])',
    'textarea:not([disabled]):not([tabindex="-1"])',
    'summary:not([tabindex="-1"])',
    '[tabindex]:not([tabindex="-1"])',
    '[contenteditable="true"]:not([tabindex="-1"])'
  ].join(',');

  function listFocusable(root) {
    if (!root) return [];
    return Array.prototype.slice.call(root.querySelectorAll(FOCUSABLE_SELECTOR));
  }

  // Per-container state so multiple traps can coexist and be torn
  // down independently — each container keeps its own keydown and
  // focusin handlers; teardown only removes its own listeners.
  var activeTraps = new WeakMap();

  function enableFocusTrap(container, focusTarget) {
    if (!container) return;
    // Re-entrant call on the same container: tear down the previous trap first.
    if (activeTraps.has(container)) disableFocusTrap(container);

    var state = { container: container };

    state.onKeyDown = function (event) {
      if (event.key !== 'Tab') return;
      var list = listFocusable(container);
      if (list.length === 0) {
        event.preventDefault();
        container.focus();
        return;
      }
      var first = list[0];
      var last = list[list.length - 1];
      var active = document.activeElement;
      if (event.shiftKey && (active === first || active === container)) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && active === last) {
        event.preventDefault();
        first.focus();
      }
    };

    // Keep focus inside the container if something outside steals it.
    state.onFocusIn = function (event) {
      if (container.contains(event.target)) return;
      var list = listFocusable(container);
      (list[0] || container).focus();
    };

    container.addEventListener('keydown', state.onKeyDown);
    document.addEventListener('focusin', state.onFocusIn);
    activeTraps.set(container, state);

    var initial = focusTarget || listFocusable(container)[0] || container;
    if (initial && typeof initial.focus === 'function') {
      // Ensure the container itself is focusable as a fallback.
      if (initial === container && !container.hasAttribute('tabindex')) {
        container.setAttribute('tabindex', '-1');
      }
      initial.focus();
    }
  }

  function disableFocusTrap(container) {
    // Called without an argument → tear down every active trap.
    if (!container) {
      // WeakMap is not iterable; consumers that want a blanket teardown
      // should keep their own container refs. This branch is a no-op by
      // design — callers that opened a trap own the container reference
      // and must pass it to disable. A missing arg means "no-op".
      return;
    }
    var state = activeTraps.get(container);
    if (!state) return;
    container.removeEventListener('keydown', state.onKeyDown);
    document.removeEventListener('focusin', state.onFocusIn);
    activeTraps.delete(container);
  }

  /* ------------------------------------------------------------------ */
  /* Event bus                                                          */
  /* ------------------------------------------------------------------ */

  // Map<eventName, Set<listener>> — Set gives O(1) unsubscribe without
  // rebuilding the listener collection on every removal.
  var channels = new Map();

  function on(name, listener) {
    if (typeof listener !== 'function') return function () {};
    var set = channels.get(name);
    if (!set) {
      set = new Set();
      channels.set(name, set);
    }
    set.add(listener);
    return function off() {
      var s = channels.get(name);
      if (s) s.delete(listener);
    };
  }

  function off(name, listener) {
    var set = channels.get(name);
    if (set) set.delete(listener);
  }

  function emit(name, payload) {
    var set = channels.get(name);
    if (!set) return;
    set.forEach(function (listener) {
      try { listener(payload); } catch (err) { console.error('[Kitchero.bus]', name, err); }
    });
  }

  /* ------------------------------------------------------------------ */
  /* Misc helpers                                                       */
  /* ------------------------------------------------------------------ */

  function escapeCloseDetails(event) {
    if (event.key !== 'Escape') return;
    var open = event.target.closest && event.target.closest('details[open]');
    if (!open) return;
    open.removeAttribute('open');
    var summary = open.querySelector('summary');
    if (summary) summary.focus();
  }

  /* ------------------------------------------------------------------ */
  /* Global SR announcer — writes to the persistent #ktAnnouncer(Alert) */
  /* regions in layout/theme.liquid. Call as                            */
  /*   Kitchero.announce('Added to cart')                               */
  /*   Kitchero.announce('Out of stock', 'assertive')                   */
  /* "polite" (default) waits for a break in SR speech; "assertive"     */
  /* interrupts. Don't pick "assertive" lightly — it's for destructive  */
  /* or blocking messages only.                                         */
  /*                                                                    */
  /* Why reset textContent to '' first: SRs are finicky about announcing*/
  /* when the textContent goes from `A` to `A` (same string, real       */
  /* cause). Clearing to '' then setting the new value on the next      */
  /* frame forces the read.                                             */
  /* ------------------------------------------------------------------ */

  function announce(message, urgency) {
    if (!message) return;
    var id = urgency === 'assertive' ? 'ktAnnouncerAlert' : 'ktAnnouncer';
    var node = document.getElementById(id);
    if (!node) return;
    node.textContent = '';
    /* rAF + short timeout to give the SR time to observe the reset
       before we push the new value. Some SRs debounce rapid textContent
       swaps and miss the announcement otherwise. */
    requestAnimationFrame(function () {
      setTimeout(function () { node.textContent = message; }, 50);
    });
  }

  /* ------------------------------------------------------------------ */
  /* Theme-editor bridge: rebroadcast shopify:* events through our bus. */
  /* ------------------------------------------------------------------ */

  var editorEvents = [
    ['shopify:section:load',     'section:load',     'sectionId'],
    ['shopify:section:unload',   'section:unload',   'sectionId'],
    ['shopify:section:select',   'section:select',   'sectionId'],
    ['shopify:section:deselect', 'section:deselect', 'sectionId'],
    ['shopify:block:select',     'block:select',     'blockId'],
    ['shopify:block:deselect',   'block:deselect',   'blockId']
  ];

  editorEvents.forEach(function (entry) {
    var domEvent = entry[0];
    var busEvent = entry[1];
    var idKey = entry[2];
    document.addEventListener(domEvent, function (e) {
      var payload = { target: e.target };
      payload[idKey] = e.detail && e.detail[idKey];
      emit(busEvent, payload);
    });
  });

  /* ------------------------------------------------------------------ */
  /* Editor block-select pulse (design mode only).                      */
  /*                                                                    */
  /* When a merchant clicks a block in the theme-editor sidebar, scroll */
  /* the corresponding DOM node into view (if it isn't fully visible)   */
  /* and paint a 1.2s outline pulse so the block is easy to spot in the */
  /* preview pane. Section-specific block:select handlers (carousel     */
  /* slide-to-active, accordion expand, hotspot popup) still run on the */
  /* same event — this is purely a baseline visual aid that complements */
  /* them, not a replacement.                                           */
  /*                                                                    */
  /* Premium Theme-Store reviewers click multiple blocks during review  */
  /* and expect "the right thing happens" feedback; without this, blocks*/
  /* deep inside a long section land off-screen and the merchant has    */
  /* no idea which block they just selected.                            */
  /* ------------------------------------------------------------------ */

  if (global.Shopify && global.Shopify.designMode) {
    var blockPulseClass = 'kt-editor-block-selected';
    var blockPulseDuration = 1200;

    document.addEventListener('shopify:block:select', function (event) {
      var block = event.target;
      if (!block || !block.classList) return;

      /* Scroll into view only if not fully visible — avoid jolting a
         block that's already on-screen. */
      var rect = block.getBoundingClientRect();
      var viewportH = window.innerHeight || document.documentElement.clientHeight;
      var fullyVisible = rect.top >= 0 && rect.bottom <= viewportH;
      if (!fullyVisible && typeof block.scrollIntoView === 'function') {
        try {
          block.scrollIntoView({ behavior: 'smooth', block: 'center' });
        } catch (_) { block.scrollIntoView(); }
      }

      block.classList.add(blockPulseClass);
      if (block.__ktBlockPulseTimer) clearTimeout(block.__ktBlockPulseTimer);
      block.__ktBlockPulseTimer = setTimeout(function () {
        block.classList.remove(blockPulseClass);
        block.__ktBlockPulseTimer = null;
      }, blockPulseDuration);
    });

    document.addEventListener('shopify:block:deselect', function (event) {
      var block = event.target;
      if (!block || !block.classList) return;
      block.classList.remove(blockPulseClass);
      if (block.__ktBlockPulseTimer) {
        clearTimeout(block.__ktBlockPulseTimer);
        block.__ktBlockPulseTimer = null;
      }
    });
  }

  /* ------------------------------------------------------------------ */
  /* Scroll lock — stacked body overflow:hidden across multiple owners. */
  /*                                                                    */
  /* 14 components (cart drawer, filter drawer, mobile nav, search      */
  /* overlay, video modal, lightbox, newsletter popup, appointment      */
  /* drawer, product gallery zoom, customer forms, etc.) each set       */
  /* body.style.overflow = 'hidden' on open and '' on close. When two   */
  /* overlay each other — e.g. cart drawer is open, user clicks a link  */
  /* that opens the appointment drawer, then closes the appointment     */
  /* drawer — the close path would restore overflow = '' even though    */
  /* the cart drawer is still visible. Page silently scrolls behind the */
  /* open drawer until the next component re-locks it.                  */
  /*                                                                    */
  /* Central Set<ownerId> pattern: each caller passes a unique id.      */
  /* Body lock applied while the Set is non-empty, released when it     */
  /* drains. Lock/unlock are idempotent per id (double-lock no-op;      */
  /* unlock of unknown id no-op). Stores the original overflow value    */
  /* so merchants who set `body { overflow: auto }` via custom CSS get  */
  /* that value restored, not a hardcoded ''.                           */
  /* ------------------------------------------------------------------ */

  var scrollLockOwners = new Set();
  var scrollLockOriginalOverflow = null;
  var scrollLockSavedY = 0;
  /* iOS Safari ignores `body { overflow: hidden }` when the user drags
   * inside a position:fixed drawer — the page behind scrolls through,
   * then on close the user ends up at a random scroll position. The
   * position:fixed-body trick freezes the viewport; on unlock we
   * restore the saved scroll position. Other browsers don't need this
   * but it's harmless there (overflow:hidden already stopped them). */
  function scrollLock(id) {
    if (!id || scrollLockOwners.has(id)) return;
    if (scrollLockOwners.size === 0) {
      scrollLockSavedY = window.pageYOffset || document.documentElement.scrollTop || 0;
      scrollLockOriginalOverflow = document.body.style.overflow || '';
      document.body.style.overflow = 'hidden';
      document.body.style.position = 'fixed';
      document.body.style.top = '-' + scrollLockSavedY + 'px';
      document.body.style.left = '0';
      document.body.style.right = '0';
      document.body.style.width = '100%';
    }
    scrollLockOwners.add(id);
  }

  function scrollUnlock(id) {
    if (!id || !scrollLockOwners.has(id)) return;
    scrollLockOwners.delete(id);
    if (scrollLockOwners.size === 0) {
      document.body.style.overflow = scrollLockOriginalOverflow || '';
      document.body.style.position = '';
      document.body.style.top = '';
      document.body.style.left = '';
      document.body.style.right = '';
      document.body.style.width = '';
      scrollLockOriginalOverflow = null;
      /* Restore previous scroll position in one frame — avoids the
       * "jump to top then snap back" flash iOS does if we scrollTo
       * synchronously before the position:fixed styles detach. */
      window.scrollTo(0, scrollLockSavedY);
      scrollLockSavedY = 0;
    }
  }

  function scrollLockReset() {
    scrollLockOwners.clear();
    document.body.style.overflow = '';
    document.body.style.position = '';
    document.body.style.top = '';
    document.body.style.left = '';
    document.body.style.right = '';
    document.body.style.width = '';
    scrollLockOriginalOverflow = null;
    scrollLockSavedY = 0;
  }

  /* ------------------------------------------------------------------ */
  /* Public surface                                                     */
  /* ------------------------------------------------------------------ */

  global.Kitchero = global.Kitchero || {};
  global.Kitchero.focusTrap = {
    enable: enableFocusTrap,
    disable: disableFocusTrap,
    focusable: listFocusable
  };
  global.Kitchero.bus = { on: on, off: off, emit: emit };
  global.Kitchero.escapeCloseDetails = escapeCloseDetails;
  global.Kitchero.announce = announce;
  global.Kitchero.scrollLock = {
    lock: scrollLock,
    unlock: scrollUnlock,
    reset: scrollLockReset
  };

  /* ------------------------------------------------------------------ */
  /* Form-error auto-focus. When a server-rendered form comes back with */
  /* validation errors, Shopify does a full-page re-render (not AJAX),  */
  /* so focus resets to document.body. The error summary snippet marks  */
  /* itself up with role="alert" + tabindex="-1"; flip that focus to    */
  /* the summary on load so keyboard/SR users get the error context     */
  /* without having to scroll-hunt.                                     */
  /* ------------------------------------------------------------------ */

  function focusFirstFormError() {
    var summary = document.querySelector('[data-form-error-summary][tabindex="-1"]')
      || document.querySelector('[role="alert"][tabindex="-1"]');
    if (summary && typeof summary.focus === 'function') {
      /* rAF so the browser has laid out the element before we move
         focus — some SRs swallow focus moves that happen before first
         paint. */
      requestAnimationFrame(function () {
        try { summary.focus({ preventScroll: false }); } catch (e) { /* ignore */ }
      });
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', focusFirstFormError);
  } else {
    focusFirstFormError();
  }

  /* ------------------------------------------------------------------ */
  /* Global error sink                                                  */
  /*                                                                    */
  /* Catches unhandled promise rejections and uncaught runtime errors   */
  /* before they escape to the user-visible browser error indicator     */
  /* (Safari's "error loading page" banner, Firefox devtools count).    */
  /* Logs once with a Kitchero prefix so developers can correlate but   */
  /* suppresses the default verbose stack that can leak request bodies  */
  /* or internal hostnames on some builds. Explicitly a LAST-RESORT     */
  /* catcher — every fetch/promise in the theme should still handle     */
  /* its own failures; this is the seatbelt for future regressions.    */
  /* ------------------------------------------------------------------ */

  global.addEventListener('unhandledrejection', function (event) {
    try {
      var reason = event && event.reason;
      /* Swallow common expected cases: AbortError (predictive search +
         collection filter cancellation), and fetch failures that the
         section JS already caught but rethrew. */
      if (reason && (reason.name === 'AbortError' || reason.name === 'TypeError' && /Failed to fetch/.test(reason.message || ''))) {
        event.preventDefault();
        return;
      }
      /* Log once, no stack — keeps DevTools count down for merchants
         running analytics dashboards that bucket errors. */
      if (global.console && console.warn) {
        console.warn('[Kitchero] unhandled promise rejection:', reason && (reason.message || reason));
      }
      event.preventDefault();
    } catch (e) { /* handler itself must not throw */ }
  });

  /* ------------------------------------------------------------------ */
  /* Viewport reflow bus                                                */
  /*                                                                    */
  /* Phone rotation and visualViewport resize (keyboard open/close, iOS */
  /* address-bar collapse) change the geometry that ScrollTrigger pins  */
  /* and carousel widths were measured against. Without re-measurement  */
  /* pinned sections shift off-layout and scroll progress stays stale   */
  /* at whatever the old viewport was. Debounce to 150ms so a rapid     */
  /* sequence of resize events (iOS bounce-scroll triggers many)        */
  /* collapses into one refresh. Sections can also listen to the        */
  /* `kitchero:viewport-reflow` event if they maintain their own        */
  /* dimensions (drag carousel track width, shop-categories snap        */
  /* pitch, etc.).                                                      */
  /* ------------------------------------------------------------------ */

  var reflowTimer = null;
  function triggerReflow() {
    if (reflowTimer) clearTimeout(reflowTimer);
    reflowTimer = setTimeout(function () {
      reflowTimer = null;
      if (global.ScrollTrigger && typeof global.ScrollTrigger.refresh === 'function') {
        try { global.ScrollTrigger.refresh(); } catch (_) {}
      }
      document.dispatchEvent(new CustomEvent('kitchero:viewport-reflow'));
    }, 150);
  }

  global.addEventListener('orientationchange', triggerReflow);
  if (global.visualViewport) {
    global.visualViewport.addEventListener('resize', triggerReflow);
  } else {
    global.addEventListener('resize', triggerReflow);
  }
})(window);
