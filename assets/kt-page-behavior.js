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

      if (reason && (reason.name === 'AbortError' || reason.name === 'TypeError' && /Failed to fetch/.test(reason.message || ''))) {
        event.preventDefault();
        return;
      }

      if (global.console && console.warn) {
        console.warn('[Kitchero] unhandled promise rejection:', reason && (reason.message || reason));
      }
      event.preventDefault();
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

  var GUARD_ENDPOINTS_RE = /(\/contact$|\/contact\?|\/cart(\?|$|\/add|\/update|\/clear)|\/account\/(login|recover|register)|\/password$|\/password\?)/;

  function shouldGuardForm(form) {
    if (!form || form.tagName !== 'FORM') return false;
    if (form.hasAttribute('data-skip-double-submit-guard')) return false;
    if (form.hasAttribute('data-double-submit-guard')) return true;
    var action = form.getAttribute('action') || '';
    return GUARD_ENDPOINTS_RE.test(action);
  }

  document.addEventListener('submit', function (event) {
    var form = event.target;
    if (!shouldGuardForm(form)) return;
    if (form._kitcheroSubmitting) {
      event.preventDefault();
      return;
    }
    form._kitcheroSubmitting = true;

    Promise.resolve().then(function () {
      if (event.defaultPrevented) {
        setTimeout(function () {
          form._kitcheroSubmitting = false;
        }, 8000);
        return;
      }

      form.setAttribute('aria-busy', 'true');
      var submitButtons = form.querySelectorAll(
        'button[type="submit"], input[type="submit"]'
      );
      submitButtons.forEach(function (btn) {
        btn.disabled = true;
        btn.setAttribute('aria-busy', 'true');
      });
    });
  }, true );

  global.addEventListener('pageshow', function (event) {
    if (!event.persisted) return;
    document.querySelectorAll('form[aria-busy="true"]').forEach(function (form) {
      form._kitcheroSubmitting = false;
      form.removeAttribute('aria-busy');
      form.querySelectorAll(
        'button[type="submit"][disabled][aria-busy="true"], input[type="submit"][disabled][aria-busy="true"]'
      ).forEach(function (btn) {
        btn.disabled = false;
        btn.removeAttribute('aria-busy');
      });
    });
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
