if (!window.__kitcheroCookieBannerLoaded) {
  window.__kitcheroCookieBannerLoaded = true;

  (function () {
    'use strict';

    var SELECTORS = {
      banner: '[data-cookie-banner]',
      accept: '[data-cookie-accept]',
      decline: '[data-cookie-decline]',

      customize: '[data-cookie-customize]',
      customizePanel: '[data-cookie-customize-panel]',
      purposeInput: '[data-cookie-purpose]',
      save: '[data-cookie-save]',
    };

    var PURPOSES = ['analytics', 'marketing', 'preferences', 'sale_of_data'];

    function getBanner() {
      return document.querySelector(SELECTORS.banner);
    }

    function showBanner(banner) {
      if (!banner) return;
      banner.removeAttribute('hidden');
      banner.removeAttribute('inert');

      requestAnimationFrame(function () {
        banner.classList.add('kt-cookie-banner--visible');
      });
    }

    function hideBanner(banner) {
      if (!banner) return;
      banner.classList.remove('kt-cookie-banner--visible');

      setTimeout(function () {
        banner.setAttribute('hidden', '');
        banner.setAttribute('inert', '');
      }, 350);
    }

    function noop() {  }

    function setConsent(allow) {
      try {
        if (window.Shopify && window.Shopify.customerPrivacy) {
          window.Shopify.customerPrivacy.setTrackingConsent(allow, noop);
        }
      } catch (e) {
      }
    }

    function setGranularConsent(purposes) {
      try {
        if (window.Shopify && window.Shopify.customerPrivacy) {
          window.Shopify.customerPrivacy.setTrackingConsent(purposes, noop);
        }
      } catch (e) {
      }
    }

    function syncCustomizePanelToCurrentConsent(banner) {
      if (!banner) return;
      var cp = window.Shopify && window.Shopify.customerPrivacy;
      if (!cp) return;
      banner.querySelectorAll(SELECTORS.purposeInput).forEach(function (input) {
        var purpose = input.getAttribute('data-cookie-purpose');
        try {
          var allowed;
          switch (purpose) {
            case 'analytics':
              allowed = typeof cp.analyticsProcessingAllowed === 'function' ? cp.analyticsProcessingAllowed() : null;
              break;
            case 'marketing':
              allowed = typeof cp.marketingAllowed === 'function' ? cp.marketingAllowed() : null;
              break;
            case 'preferences':
              allowed = typeof cp.preferencesProcessingAllowed === 'function' ? cp.preferencesProcessingAllowed() : null;
              break;
            case 'sale_of_data':
              allowed = typeof cp.saleOfDataAllowed === 'function' ? cp.saleOfDataAllowed() : null;
              break;
          }

          if (allowed === true || allowed === false) {
            input.checked = allowed;
          }
        } catch (e) {
        }
      });
    }

    function setCustomizePanelExpanded(banner, expanded) {
      if (!banner) return;
      var btn = banner.querySelector(SELECTORS.customize);
      var panel = banner.querySelector(SELECTORS.customizePanel);
      if (!btn || !panel) return;
      btn.setAttribute('aria-expanded', expanded ? 'true' : 'false');
      if (expanded) {
        panel.removeAttribute('hidden');

        syncCustomizePanelToCurrentConsent(banner);
      } else {
        panel.setAttribute('hidden', '');
      }
    }

    function readPanelToPayload(banner) {
      var payload = {};
      if (!banner) return payload;
      banner.querySelectorAll(SELECTORS.purposeInput).forEach(function (input) {
        var purpose = input.getAttribute('data-cookie-purpose');
        if (PURPOSES.indexOf(purpose) > -1) {
          payload[purpose] = !!input.checked;
        }
      });
      return payload;
    }

    function initBanner() {
      var banner = getBanner();
      if (!banner) return;

      // Footer "Your Privacy Choices" without an opt-out page is a button that
      // opens these preferences, so it is only shown when the banner exists.
      document.querySelectorAll('[data-privacy-choices-item]').forEach(function (item) {
        item.hidden = false;
      });

      if (window.Shopify && window.Shopify.designMode) {
        return;
      }

      function checkConsentAndShow() {
        try {
          var cp = window.Shopify && window.Shopify.customerPrivacy;
          if (!cp) return;

          var shouldShow = null;
          if (typeof cp.shouldShowGDPRBanner === 'function') {
            shouldShow = cp.shouldShowGDPRBanner();
          } else if (typeof cp.shouldShowBanner === 'function') {
            shouldShow = cp.shouldShowBanner();
          }
          if (shouldShow !== true) {
            return;
          }

          var consent = typeof cp.userTrackingConsent === 'function'
            ? cp.userTrackingConsent()
            : null;

          if (consent === 'no_interaction' || consent == null) {
            var delay = parseInt(banner.getAttribute('data-delay'), 10);
            if (isNaN(delay) || delay < 0) delay = 2;
            setTimeout(function () { showBanner(banner); }, delay * 1000);
          }
        } catch (e) {
        }
      }

      if (window.Shopify && typeof window.Shopify.loadFeatures === 'function') {
        window.Shopify.loadFeatures(
          [{ name: 'consent-tracking-api', version: '0.1' }],
          function (err) {
            if (err) {
              return;
            }
            checkConsentAndShow();
          }
        );
      } else {
        var attempts = 0;
        var poll = setInterval(function () {
          attempts++;
          if (window.Shopify && window.Shopify.loadFeatures) {
            clearInterval(poll);
            initBanner();
          } else if (attempts > 50) {
            clearInterval(poll);
          }
        }, 100);
      }
    }

    document.addEventListener('click', function (e) {
      var accept = e.target.closest(SELECTORS.accept);
      if (accept) {
        var banner = accept.closest(SELECTORS.banner);

        setGranularConsent({ analytics: true, marketing: true, preferences: true, sale_of_data: true });
        hideBanner(banner);
        return;
      }
      var decline = e.target.closest(SELECTORS.decline);
      if (decline) {
        var dBanner = decline.closest(SELECTORS.banner);

        setGranularConsent({ analytics: false, marketing: false, preferences: false, sale_of_data: false });
        hideBanner(dBanner);
        return;
      }

      var customize = e.target.closest(SELECTORS.customize);
      if (customize) {
        var cBanner = customize.closest(SELECTORS.banner);
        var expanded = customize.getAttribute('aria-expanded') === 'true';
        setCustomizePanelExpanded(cBanner, !expanded);
        return;
      }

      var save = e.target.closest(SELECTORS.save);
      if (save) {
        var sBanner = save.closest(SELECTORS.banner);
        var payload = readPanelToPayload(sBanner);
        setGranularConsent(payload);
        hideBanner(sBanner);
      }
    });

    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', initBanner, { once: true });
    } else {
      initBanner();
    }

    document.addEventListener('shopify:section:select', function (e) {
      if (!e.target) return;
      var banner = e.target.querySelector(SELECTORS.banner);
      if (banner) showBanner(banner);
    });
    document.addEventListener('shopify:section:deselect', function (e) {
      if (!e.target) return;
      var banner = e.target.querySelector(SELECTORS.banner);
      if (banner) hideBanner(banner);
    });

    document.addEventListener('shopify:section:load', function (e) {
      if (!e.target) return;
      var banner = e.target.querySelector(SELECTORS.banner);
      if (banner) {
        if (window.Shopify && window.Shopify.designMode) {
          showBanner(banner);
        }
      }
    });

    function openCookieBanner() {
      var banner = document.querySelector(SELECTORS.banner);
      if (!banner) return false;
      showBanner(banner);
      return true;
    }

    window.Kitchero = window.Kitchero || {};
    window.Kitchero.openCookieBanner = openCookieBanner;

    document.addEventListener('click', function (event) {
      var trigger = event.target.closest('[data-cookie-preferences]');
      if (!trigger) return;
      event.preventDefault();
      openCookieBanner();
    });

    document.addEventListener('click', function (event) {
      var trigger = event.target.closest('[data-privacy-choices]');
      if (!trigger) return;

      var opened = openCookieBanner();
      if (!opened) return;
      event.preventDefault();
      var banner = document.querySelector(SELECTORS.banner);
      if (!banner) return;
      setCustomizePanelExpanded(banner, true);

      var saleToggle = banner.querySelector('[data-cookie-purpose="sale_of_data"]');
      if (saleToggle && typeof saleToggle.focus === 'function') {
        requestAnimationFrame(function () {
          try { saleToggle.focus(); } catch (e) {  }
        });
      }
    });
  })();
}
