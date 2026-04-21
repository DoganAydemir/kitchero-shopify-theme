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
})(window);
