(function (global) {
  'use strict';

  function focusFirstFormError() {
    var summary = document.querySelector('[data-form-error-summary][tabindex="-1"]')
      || document.querySelector('[role="alert"][tabindex="-1"]');
    if (summary && typeof summary.focus === 'function') {
      requestAnimationFrame(function () {
        try { summary.focus({ preventScroll: false }); } catch (e) {  }
      });
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', focusFirstFormError);
  } else {
    focusFirstFormError();
  }

  global.addEventListener('unhandledrejection', function (event) {
    try {
      var reason = event && event.reason;

      // Only cancelled requests (AbortError, e.g. a newer search replacing an
      // older one) are expected and kept out of the console. Every other
      // rejection is left to the browser so it is logged with its stack.
      if (reason && reason.name === 'AbortError') {
        event.preventDefault();
      }
    } catch (e) {  }
  });

  var reflowTimer = null;
  function triggerReflow() {
    if (reflowTimer) clearTimeout(reflowTimer);
    reflowTimer = setTimeout(function () {
      reflowTimer = null;
      if (Kitchero.safeScrollTriggerRefresh) {
        Kitchero.safeScrollTriggerRefresh();
      } else if (global.ScrollTrigger && typeof global.ScrollTrigger.refresh === 'function') {
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

  Kitchero.safeScrollTriggerRefresh = function () {
    if (typeof ScrollTrigger === 'undefined' || typeof ScrollTrigger.refresh !== 'function') return;
    if (!(global.Shopify && global.Shopify.designMode)) {
      try { ScrollTrigger.refresh(); } catch (_) {}
      return;
    }
    var savedY = global.pageYOffset || document.documentElement.scrollTop || 0;
    try { ScrollTrigger.refresh(); } catch (_) {}
    requestAnimationFrame(function () {
      if (Math.abs((global.pageYOffset || 0) - savedY) > 2) {
        global.scrollTo({ top: savedY, left: 0, behavior: 'instant' });
      }
    });
  };

  // Matched against the action's path only (query and #fragment removed), so
  // Shopify's "/contact#ContactForm-..." and locale-prefixed actions such as
  // "/fr/contact" or "/fr-ca/cart/add" are covered.
  var GUARD_PATH_RE = /\/(contact|cart|cart\/(add|update|change|clear)|account\/(login|recover|register)|password)$/;

  function shouldGuardForm(form) {
    if (!form || form.tagName !== 'FORM') return false;
    if (form.hasAttribute('data-skip-double-submit-guard')) return false;
    if (form.hasAttribute('data-double-submit-guard')) return true;
    var action = (form.getAttribute('action') || '').split('#')[0].split('?')[0].replace(/\/+$/, '');
    return GUARD_PATH_RE.test(action);
  }

  function releaseForm(form) {
    form._kitcheroSubmitting = false;
    if (form._kitcheroReleaseTimer) {
      clearTimeout(form._kitcheroReleaseTimer);
      form._kitcheroReleaseTimer = null;
    }
    if (form.getAttribute('aria-busy') !== 'true') return;
    form.removeAttribute('aria-busy');
    form.querySelectorAll(
      'button[type="submit"][disabled][aria-busy="true"], input[type="submit"][disabled][aria-busy="true"]'
    ).forEach(function (btn) {
      btn.disabled = false;
      btn.removeAttribute('aria-busy');
    });
  }

  document.addEventListener('submit', function (event) {
    var form = event.target;
    if (!shouldGuardForm(form)) return;
    if (form._kitcheroSubmitting) {
      event.preventDefault();
      return;
    }
    form._kitcheroSubmitting = true;

    // Checked after the event has reached every listener (this one runs in the
    // capture phase, before the form's own submit handlers).
    setTimeout(function () {
      // Submitted with JavaScript (AJAX cart, etc.): that script owns the
      // button state, so release the guard right away.
      if (event.defaultPrevented) {
        form._kitcheroSubmitting = false;
        return;
      }

      // Normal page submit. If the page is still here after 10 seconds (the
      // request failed, was stopped, or the response was a download), give
      // the button back so the shopper can try again.
      form._kitcheroReleaseTimer = setTimeout(function () {
        releaseForm(form);
      }, 10000);

      form.setAttribute('aria-busy', 'true');
      var submitButtons = form.querySelectorAll(
        'button[type="submit"], input[type="submit"]'
      );
      submitButtons.forEach(function (btn) {
        btn.disabled = true;
        btn.setAttribute('aria-busy', 'true');
      });
    }, 0);
  }, true );

  // Back button (page restored from the back/forward cache).
  global.addEventListener('pageshow', function (event) {
    if (!event.persisted) return;
    document.querySelectorAll('form[aria-busy="true"]').forEach(releaseForm);
  });
})(window);

document.addEventListener('click', function (event) {
  if (event.defaultPrevented) return;
  var trigger = event.target && event.target.closest ? event.target.closest('[data-privacy-choices]') : null;
  if (!trigger) return;
  var banner = window.privacyBanner;
  if (banner && typeof banner.showPreferences === 'function') {
    event.preventDefault();
    banner.showPreferences();
  }
});
