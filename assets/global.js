/**
 * Kitchero Theme — Global JavaScript
 *
 * Utility functions, accessibility helpers, and event delegation.
 * No framework, no build step. Vanilla JS only.
 */

/* ============================================================
   Focus Management
   ============================================================ */

function getFocusableElements(container) {
  return Array.from(
    container.querySelectorAll(
      'summary, a[href], button:enabled, [tabindex]:not([tabindex^="-"]), [draggable], area, input:not([type=hidden]):enabled, select:enabled, textarea:enabled'
    )
  );
}

const trapFocusHandlers = {};

function trapFocus(container, elementToFocus) {
  if (!container) return;

  const elements = getFocusableElements(container);
  const first = elements[0];
  const last = elements[elements.length - 1];

  removeTrapFocus();

  trapFocusHandlers.focusin = function (event) {
    if (event.target !== container && event.target !== last && event.target !== first) return;

    document.addEventListener('keydown', trapFocusHandlers.keydown);
  };

  trapFocusHandlers.focusout = function () {
    document.removeEventListener('keydown', trapFocusHandlers.keydown);
  };

  trapFocusHandlers.keydown = function (event) {
    if (event.code !== 'Tab') return;

    if (event.shiftKey) {
      if (document.activeElement === first) {
        event.preventDefault();
        last.focus();
      }
    } else {
      if (document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    }
  };

  document.addEventListener('focusout', trapFocusHandlers.focusout);
  document.addEventListener('focusin', trapFocusHandlers.focusin);

  const focusTarget = elementToFocus || first;
  if (focusTarget) focusTarget.focus();
}

function removeTrapFocus() {
  document.removeEventListener('focusin', trapFocusHandlers.focusin);
  document.removeEventListener('focusout', trapFocusHandlers.focusout);
  document.removeEventListener('keydown', trapFocusHandlers.keydown);
}

/* ============================================================
   Keyboard Helpers
   ============================================================ */

function onKeyUpEscape(event) {
  if (event.code !== 'Escape') return;

  const openDetailsElement = event.target.closest('details[open]');
  if (!openDetailsElement) return;

  const summaryElement = openDetailsElement.querySelector('summary');
  openDetailsElement.removeAttribute('open');
  if (summaryElement) summaryElement.focus();
}

/* ============================================================
   Section Rendering API Helper
   ============================================================ */

class SectionId {
  static parseId(qualifiedSectionId) {
    return qualifiedSectionId.split('__').pop();
  }

  static parseSectionName(qualifiedSectionId) {
    return qualifiedSectionId.split('__').slice(0, -1).join('__');
  }

  static getIdForSection(sectionId, sectionName) {
    if (sectionName) return `${sectionName}__${sectionId}`;
    return sectionId;
  }
}

/* ============================================================
   DOM Update Utility
   ============================================================ */

class HTMLUpdateUtility {
  /**
   * Safely sets innerHTML and re-executes any <script> tags.
   */
  static setInnerHTML(element, html) {
    element.innerHTML = html;

    element.querySelectorAll('script').forEach(function (oldScript) {
      const newScript = document.createElement('script');
      Array.from(oldScript.attributes).forEach(function (attr) {
        newScript.setAttribute(attr.name, attr.value);
      });
      newScript.appendChild(document.createTextNode(oldScript.innerHTML));
      oldScript.parentNode.replaceChild(newScript, oldScript);
    });
  }
}

/* ============================================================
   Pub/Sub Event Bus
   ============================================================ */

let subscribers = {};

function subscribe(eventName, callback) {
  if (subscribers[eventName] === undefined) {
    subscribers[eventName] = [];
  }
  subscribers[eventName].push(callback);

  return function unsubscribe() {
    subscribers[eventName] = subscribers[eventName].filter(function (cb) {
      return cb !== callback;
    });
  };
}

function publish(eventName, data) {
  if (subscribers[eventName]) {
    subscribers[eventName].forEach(function (callback) {
      callback(data);
    });
  }
}

/* ============================================================
   Theme Editor Event Hooks
   ============================================================ */

document.addEventListener('shopify:section:load', function (event) {
  publish('section:load', { sectionId: event.detail.sectionId, target: event.target });
});

document.addEventListener('shopify:section:unload', function (event) {
  publish('section:unload', { sectionId: event.detail.sectionId, target: event.target });
});

document.addEventListener('shopify:block:select', function (event) {
  publish('block:select', { blockId: event.detail.blockId, target: event.target });
});

document.addEventListener('shopify:block:deselect', function (event) {
  publish('block:deselect', { blockId: event.detail.blockId, target: event.target });
});
