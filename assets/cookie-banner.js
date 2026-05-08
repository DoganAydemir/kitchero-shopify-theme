/* ==========================================================================
   Cookie / Privacy Consent Banner — Shopify Customer Privacy API integration

   Architecture (R126):
     1. Load Shopify's `consent-tracking-api` feature on init.
     2. Read userTrackingConsent state — only show banner when state is
        'no_interaction' (customer hasn't decided yet). Suppress on
        'allow' / 'declined'.
     3. Accept button → setTrackingConsent(true) + hide banner.
     4. Decline button (and × close) → setTrackingConsent(false) + hide.
     5. Re-init on shopify:section:load for theme editor compatibility.

   Theme Store rule: NO custom cookie or localStorage state — Shopify's
   API IS the source of truth. The customer's decision persists across
   sessions via Shopify's first-party cookies.
   ========================================================================== */

if (!window.__kitcheroCookieBannerLoaded) {
  window.__kitcheroCookieBannerLoaded = true;

  (function () {
    'use strict';

    var SELECTORS = {
      banner: '[data-cookie-banner]',
      accept: '[data-cookie-accept]',
      decline: '[data-cookie-decline]',
      /* R160 GRANULAR-GDPR-CONSENT: per-purpose customize panel. */
      customize: '[data-cookie-customize]',
      customizePanel: '[data-cookie-customize-panel]',
      purposeInput: '[data-cookie-purpose]',
      save: '[data-cookie-save]',
    };

    /* R160 GRANULAR-GDPR-CONSENT: 4 consent purposes per Shopify
       Customer Privacy API. Maps the data-cookie-purpose attribute
       value to the granular setTrackingConsent payload key. */
    var PURPOSES = ['analytics', 'marketing', 'preferences', 'sale_of_data'];

    function getBanner() {
      return document.querySelector(SELECTORS.banner);
    }

    function showBanner(banner) {
      if (!banner) return;
      banner.removeAttribute('hidden');
      banner.removeAttribute('inert');
      /* Visible class triggers CSS slide/fade in. Defer one frame so
         the transition runs (browsers skip transitions when the start
         state is set in the same frame as the end state). */
      requestAnimationFrame(function () {
        banner.classList.add('kt-cookie-banner--visible');
      });
    }

    function hideBanner(banner) {
      if (!banner) return;
      banner.classList.remove('kt-cookie-banner--visible');
      /* After the CSS transition (300ms), apply hidden+inert so the
         banner exits the AT tree + tab order. */
      setTimeout(function () {
        banner.setAttribute('hidden', '');
        banner.setAttribute('inert', '');
      }, 350);
    }

    function noop() { /* Shopify's setTrackingConsent expects a callback */ }

    function setConsent(allow) {
      try {
        if (window.Shopify && window.Shopify.customerPrivacy) {
          window.Shopify.customerPrivacy.setTrackingConsent(allow, noop);
        }
      } catch (e) {
        /* If the API call fails (network blip, ad-blocker), the banner
           still hides — the customer's UI choice was made. Shopify
           retries the consent write on its own next page load. */
      }
    }

    /* R160 GRANULAR-GDPR-CONSENT: write per-purpose consent payload.
       Shopify's `setTrackingConsent({analytics, marketing,
       preferences, sale_of_data}, cb)` accepts the granular shape;
       partial objects are valid (omitted purposes default to the
       current consent state per Shopify docs). */
    function setGranularConsent(purposes) {
      try {
        if (window.Shopify && window.Shopify.customerPrivacy) {
          window.Shopify.customerPrivacy.setTrackingConsent(purposes, noop);
        }
      } catch (e) {
        /* Same fallback rationale as setConsent. */
      }
    }

    /* R160 GRANULAR-GDPR-CONSENT: read current per-purpose state from
       Shopify's API and pre-fill the customize panel checkboxes so
       a customer re-opening the banner via [data-cookie-preferences]
       sees their existing decisions instead of the default-true
       baseline. Uses the per-purpose getter functions exposed by
       the Customer Privacy API: analyticsProcessingAllowed(),
       marketingAllowed(), preferencesProcessingAllowed(),
       saleOfDataAllowed(). On first paint (no prior decision) all
       4 read true / undefined → checkboxes stay at their HTML
       default-true state which mirrors the implied "everything is
       allowed" first-visit baseline that Shopify's API treats as
       'no_interaction'. */
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
          /* Only override the checkbox when the API returns a
             definite boolean. Null/undefined preserves the HTML
             default — important for first-visit (no_interaction). */
          if (allowed === true || allowed === false) {
            input.checked = allowed;
          }
        } catch (e) {
          /* Per-purpose getter not available on this Shopify
             version. Leave the checkbox at its HTML default. */
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
        /* Pre-fill checkboxes from current consent state on open. */
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

      /* Theme editor: don't auto-show in design_mode unless the merchant
         clicks the section. Otherwise the banner pops over their
         editor preview clicks. shopify:section:select handler below
         force-shows it for review. */
      if (window.Shopify && window.Shopify.designMode) {
        return;
      }

      function checkConsentAndShow() {
        try {
          var consent = window.Shopify && window.Shopify.customerPrivacy
            ? window.Shopify.customerPrivacy.userTrackingConsent()
            : null;
          /* 'no_interaction' = customer hasn't decided yet. */
          if (consent === 'no_interaction' || consent == null) {
            var delay = parseInt(banner.getAttribute('data-delay'), 10);
            if (isNaN(delay) || delay < 0) delay = 2;
            setTimeout(function () { showBanner(banner); }, delay * 1000);
          }
        } catch (e) {
          /* If the consent API isn't available (very rare, but possible
             when Shopify's storefront-config script is blocked), skip
             showing the banner rather than guessing. The merchant
             could lose a tracking opt-in moment but won't ship a
             consent UI that doesn't actually communicate with
             Shopify. */
        }
      }

      /* Load the Customer Privacy API feature if not already present.
         Shopify.loadFeatures dispatches a callback once the API is
         hydrated — checkConsentAndShow runs at that point. */
      if (window.Shopify && typeof window.Shopify.loadFeatures === 'function') {
        window.Shopify.loadFeatures(
          [{ name: 'consent-tracking-api', version: '0.1' }],
          function (err) {
            if (err) {
              /* API failed to load. Fall back: show banner anyway so
                 the customer at least sees the cookie disclosure. The
                 accept/decline buttons will gracefully no-op the API
                 call (try/catch in setConsent above). */
              checkConsentAndShow();
              return;
            }
            checkConsentAndShow();
          }
        );
      } else {
        /* Shopify global isn't ready (very early page load).
           Defer until Shopify object is hydrated. */
        var attempts = 0;
        var poll = setInterval(function () {
          attempts++;
          if (window.Shopify && window.Shopify.loadFeatures) {
            clearInterval(poll);
            initBanner();
          } else if (attempts > 50) {
            /* 5 seconds max wait. Give up — no banner. */
            clearInterval(poll);
          }
        }, 100);
      }
    }

    /* Delegated click handlers — banner DOM is stable, but section
       reload re-renders it; delegating from `document` survives
       re-render without re-binding. */
    document.addEventListener('click', function (e) {
      var accept = e.target.closest(SELECTORS.accept);
      if (accept) {
        var banner = accept.closest(SELECTORS.banner);
        /* R160 GRANULAR-GDPR-CONSENT: Accept all → all purposes
           true via the granular API. Old binary `setConsent(true)`
           also still emits the legacy true value on Shopify's side
           but the granular form ensures the per-purpose state is
           explicitly set so the customize panel reflects "all on"
           on next open. */
        setGranularConsent({ analytics: true, marketing: true, preferences: true, sale_of_data: true });
        hideBanner(banner);
        return;
      }
      var decline = e.target.closest(SELECTORS.decline);
      if (decline) {
        var dBanner = decline.closest(SELECTORS.banner);
        /* R160: Decline → all purposes false (granular). */
        setGranularConsent({ analytics: false, marketing: false, preferences: false, sale_of_data: false });
        hideBanner(dBanner);
        return;
      }
      /* R160 GRANULAR-GDPR-CONSENT: Customize toggle button. */
      var customize = e.target.closest(SELECTORS.customize);
      if (customize) {
        var cBanner = customize.closest(SELECTORS.banner);
        var expanded = customize.getAttribute('aria-expanded') === 'true';
        setCustomizePanelExpanded(cBanner, !expanded);
        return;
      }
      /* R160 GRANULAR-GDPR-CONSENT: Save preferences button —
         reads each toggle's checked state and writes the granular
         payload to Shopify. */
      var save = e.target.closest(SELECTORS.save);
      if (save) {
        var sBanner = save.closest(SELECTORS.banner);
        var payload = readPanelToPayload(sBanner);
        setGranularConsent(payload);
        hideBanner(sBanner);
      }
    });

    /* Init on DOM ready or immediately if already past. */
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', initBanner, { once: true });
    } else {
      initBanner();
    }

    /* Theme editor compatibility — show banner when merchant clicks
       the cookie-banner section in sidebar so they can preview/style. */
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

    /* Re-init on section:load so the merchant tweaking section
       settings sees the result without a full page reload. */
    document.addEventListener('shopify:section:load', function (e) {
      if (!e.target) return;
      var banner = e.target.querySelector(SELECTORS.banner);
      if (banner) {
        /* In editor: show the banner immediately so settings preview
           updates are visible. */
        if (window.Shopify && window.Shopify.designMode) {
          showBanner(banner);
        }
      }
    });

    /* R139 PRIVACY-1: re-access hook for "Cookie preferences" links.
       EU/UK GDPR Recital 42 + ePrivacy Directive require consent to
       be withdrawable as easily as it was given. Once a customer
       Accepts/Declines the banner, the dismissed state hides it
       forever — without a re-open path the customer is locked out
       of changing their decision. Expose a global function +
       delegated click handler so a footer link or any [data-cookie-
       preferences] element re-shows the banner with the customer's
       current consent state pre-applied (so they can flip toggles
       without re-confirming the unchanged ones). */
    function openCookieBanner() {
      var banner = document.querySelector(SELECTORS.banner);
      if (!banner) return false;
      showBanner(banner);
      return true;
    }
    /* Expose under Kitchero namespace for theme code AND on
       window.openCookieBanner for app blocks / external footer
       links that don't know the namespace. Both names point to
       the same function so callers don't need to feature-test. */
    window.Kitchero = window.Kitchero || {};
    window.Kitchero.openCookieBanner = openCookieBanner;
    if (typeof window.openCookieBanner !== 'function') {
      window.openCookieBanner = openCookieBanner;
    }
    /* Delegated click handler — any element with
       [data-cookie-preferences] (button, anchor) re-opens the
       banner. Prevents default so anchor href="#" doesn't scroll. */
    document.addEventListener('click', function (event) {
      var trigger = event.target.closest('[data-cookie-preferences]');
      if (!trigger) return;
      event.preventDefault();
      openCookieBanner();
    });
  })();
}
