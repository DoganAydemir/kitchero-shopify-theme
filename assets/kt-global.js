(function (global) {
  'use strict';

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

  var activeTraps = new WeakMap();

  var trapStack = [];

  function setActiveFocusin(container) {
    if (!container) return;
    var state = activeTraps.get(container);
    if (state && state.onFocusIn) {
      document.addEventListener('focusin', state.onFocusIn);
      state.focusInBound = true;
    }
  }

  function clearActiveFocusin(container) {
    if (!container) return;
    var state = activeTraps.get(container);
    if (state && state.onFocusIn && state.focusInBound) {
      document.removeEventListener('focusin', state.onFocusIn);
      state.focusInBound = false;
    }
  }

  function enableFocusTrap(container, focusTarget) {
    if (!container) return;

    if (activeTraps.has(container)) disableFocusTrap(container);

    var previousTop = trapStack[trapStack.length - 1];
    if (previousTop) clearActiveFocusin(previousTop);

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

    state.onFocusIn = function (event) {
      if (container.contains(event.target)) return;
      var list = listFocusable(container);
      (list[0] || container).focus();
    };

    container.addEventListener('keydown', state.onKeyDown);
    document.addEventListener('focusin', state.onFocusIn);
    state.focusInBound = true;
    activeTraps.set(container, state);
    trapStack.push(container);

    var initial = focusTarget || listFocusable(container)[0] || container;
    if (initial && typeof initial.focus === 'function') {
      if (initial === container && !container.hasAttribute('tabindex')) {
        container.setAttribute('tabindex', '-1');
      }
      initial.focus();
    }
  }

  function disableFocusTrap(container) {
    if (!container) {
      return;
    }
    var state = activeTraps.get(container);
    if (!state) return;
    container.removeEventListener('keydown', state.onKeyDown);
    if (state.focusInBound) {
      document.removeEventListener('focusin', state.onFocusIn);
      state.focusInBound = false;
    }
    activeTraps.delete(container);

    var idx = trapStack.indexOf(container);
    if (idx > -1) trapStack.splice(idx, 1);
    var newTop = trapStack[trapStack.length - 1];
    if (newTop) setActiveFocusin(newTop);
  }

  function shouldSuppressEscape(container) {
    if (trapStack.length === 0) return false;
    return trapStack[trapStack.length - 1] !== container;
  }

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

  function escapeCloseDetails(event) {
    if (event.key !== 'Escape') return;
    var open = event.target.closest && event.target.closest('details[open]');
    if (!open) return;
    open.removeAttribute('open');
    var summary = open.querySelector('summary');
    if (summary) summary.focus();
  }

  function announce(message, urgency) {
    if (!message) return;
    var id = urgency === 'assertive' ? 'ktAnnouncerAlert' : 'ktAnnouncer';
    var node = document.getElementById(id);
    if (!node) return;
    node.textContent = '';

    requestAnimationFrame(function () {
      setTimeout(function () { node.textContent = message; }, 50);
    });
  }

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


  var scrollLockOwners = new Set();
  var scrollLockOriginalOverflow = null;
  var scrollLockSavedY = 0;

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

  function formatMoneyAmount(centsValue, placeholder) {
    var cents = parseInt(centsValue, 10);
    if (isNaN(cents)) cents = 0;
    var noDecimals = placeholder.indexOf('no_decimals') !== -1;
    var value = noDecimals ? Math.round(cents / 100) : (cents / 100);
    var thousandsSep = ',';
    var decimalSep = '.';
    if (placeholder.indexOf('with_comma_separator') !== -1) {
      thousandsSep = '.';
      decimalSep = ',';
    } else if (placeholder.indexOf('with_space_separator') !== -1) {
      thousandsSep = ' ';
      decimalSep = ',';
    } else if (placeholder.indexOf('with_apostrophe_separator') !== -1) {
      thousandsSep = "'";
      decimalSep = '.';
    }
    var fixed = noDecimals ? String(value) : value.toFixed(2);
    var parts = fixed.split('.');
    var intPart = parts[0];
    var decPart = parts[1];

    intPart = intPart.replace(/\B(?=(\d{3})+(?!\d))/g, thousandsSep);
    return decPart ? (intPart + decimalSep + decPart) : intPart;
  }

  function formatMoney(cents, customFormat) {
    var format = customFormat || global.Kitchero.moneyFormat || '${{amount}}';
    return format.replace(/\{\{\s*(\w+)\s*\}\}/g, function (_match, placeholder) {
      return formatMoneyAmount(cents, placeholder);
    });
  }

  global.Kitchero = global.Kitchero || {};
  global.Kitchero.focusTrap = {
    enable: enableFocusTrap,
    disable: disableFocusTrap,
    focusable: listFocusable,
    shouldSuppressEscape: shouldSuppressEscape
  };
  global.Kitchero.bus = { on: on, off: off, emit: emit };
  global.Kitchero.escapeCloseDetails = escapeCloseDetails;
  global.Kitchero.announce = announce;
  global.Kitchero.formatMoney = formatMoney;
  global.Kitchero.scrollLock = {
    lock: scrollLock,
    unlock: scrollUnlock,
    reset: scrollLockReset
  };
})(window);
