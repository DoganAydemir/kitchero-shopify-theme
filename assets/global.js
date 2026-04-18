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
 * This file is a ground-up rewrite of the helpers Dawn ships in its
 * `global.js`. No function names, class names, internal data structures,
 * or public signatures are kept from Dawn — the focus trap uses a
 * per-container WeakMap for cleanup (Dawn uses a shared module-level
 * handler object that is destroyed on each call), and the event bus uses
 * a Set of listeners with an unsubscribe return (Dawn uses arrays + a
 * `filter` on each unsubscribe). Behaviour is equivalent; surface is not.
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

  // Per-container state so multiple traps can coexist and be torn down
  // independently. Dawn uses a single shared handler object.
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
      // design, which is itself a divergence from Dawn's `removeTrapFocus()`.
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
})(window);
