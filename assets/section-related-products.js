/*
  Related Products — async Section Rendering API fetch.

  Why this file exists:
    The `recommendations` Liquid object only populates when the section
    is rendered via the Section Rendering API. On the initial PDP
    server render `recommendations.performed` is false, so without a
    client-side fetch the section would ship a skeleton and never
    swap in real products. Shopify's documented pattern is:
    1. Server emits a placeholder section
    2. Client fetches `/recommendations/products?section_id=...&product_id=...&intent=related`
    3. Client swaps the fetch response into the placeholder

  Editor compatibility:
    Runs on initial page load AND on `shopify:section:load` so
    re-adding the section in the theme editor triggers the same swap.
    On `shopify:section:unload` there's nothing to teardown — no
    listeners, no timers, so we skip the unload handler.

  Failure modes:
    - Fetch fails (network, 500, CORS): the skeleton stays on screen.
      Acceptable degraded state — merchant sees something, the rest
      of the PDP is unaffected.
    - Server returns zero products: the section removes itself so the
      PDP doesn't end with an empty block or "You may also like" over
      whitespace.
    - Shopify's Section Rendering API response is the ENTIRE section
      HTML (wrapper + children). We parse it, pull out the inner
      wrapper, and swap attributes + children into our live wrapper
      so event listeners attached by downstream scripts aren't broken.
*/

(function () {
  'use strict';

  /* WeakMap<section, AbortController> — one controller per section
     instance so an in-flight fetch can be aborted on shopify:section:
     unload. Without this, removing the section in the theme editor
     while the recommendations fetch is in flight resolves the .then
     against a detached DOM (`section.innerHTML = …` writes into
     orphaned memory; harmless but a debt signal in long-lived
     editor sessions). */
  var sectionControllers = new WeakMap();

  function fetchRecommendations(section) {
    var url = section.getAttribute('data-url');
    if (!url) return;

    // Guard against double-fetch when both DOMContentLoaded and
    // shopify:section:load fire. Once we've attempted the fetch, flag
    // the element so we don't hammer the API.
    if (section.hasAttribute('data-recommendations-fetched')) return;
    section.setAttribute('data-recommendations-fetched', 'true');

    var controller = new AbortController();
    sectionControllers.set(section, controller);

    fetch(url, { signal: controller.signal })
      .then(function (response) {
        if (!response.ok) {
          throw new Error('Recommendations request failed: ' + response.status);
        }
        return response.text();
      })
      .then(function (html) {
        var parser = new DOMParser();
        var doc = parser.parseFromString(html, 'text/html');
        var freshSection = doc.querySelector('[data-product-recommendations]');

        if (!freshSection) {
          // Defensive: response didn't include the expected wrapper.
          // Leave the skeleton rather than blanking the section.
          return;
        }

        // If the fresh render has no grid children, the shop has no
        // recommendable products — hide the whole section to avoid a
        // "You may also like" block over empty space.
        var freshGrid = freshSection.querySelector('.kt-related__grid');
        var hasProducts = freshGrid && freshGrid.querySelector('.kt-card-product');

        if (!hasProducts) {
          section.setAttribute('hidden', '');
          return;
        }

        // Swap the inner markup. We don't replaceWith(freshSection)
        // because that would re-run schema attributes wiring and drop
        // any editor-attached listeners on the outer wrapper.
        section.innerHTML = freshSection.innerHTML;
      })
      .catch(function (error) {
        // AbortError on deliberate unload-abort isn't a failure.
        // Other errors leave the skeleton as graceful degradation —
        // the rest of the PDP is unaffected.
        if (error && error.name === 'AbortError') return;
        // Silent catch — the skeleton is our fallback visual.
      })
      .then(function () {
        sectionControllers.delete(section);
      });
  }

  function initAll(scope) {
    var root = scope || document;
    var sections = root.querySelectorAll('[data-product-recommendations][data-url]');
    for (var i = 0; i < sections.length; i++) {
      fetchRecommendations(sections[i]);
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', function () {
      initAll(document);
    });
  } else {
    initAll(document);
  }

  // Theme editor: re-scan when a related-products section is added.
  document.addEventListener('shopify:section:load', function (event) {
    initAll(event.target);
  });

  // Abort any in-flight recommendation fetch when the section is
  // removed in the editor. Without this, the .then resolves against
  // a detached DOM node — a memory/state debt in long-lived editor
  // sessions where the merchant adds + removes the section repeatedly.
  document.addEventListener('shopify:section:unload', function (event) {
    if (!event.target || !event.target.querySelectorAll) return;
    var sections = event.target.querySelectorAll('[data-product-recommendations]');
    for (var i = 0; i < sections.length; i++) {
      var ctrl = sectionControllers.get(sections[i]);
      if (ctrl) {
        try { ctrl.abort(); } catch (_) { /* ignore */ }
        sectionControllers.delete(sections[i]);
      }
    }
  });
})();
