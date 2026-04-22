/**
 * Collection Filters — Section Rendering API for AJAX filtering
 * Updates product grid without full page reload.
 * Falls back to URL navigation when JS disabled (noscript button).
 *
 * Wrapped in a load-guard to avoid double-binding submit/popstate handlers
 * if the same script ends up on the page more than once (edge cases: AJAX
 * responses containing script tags, theme editor rehydration).
 */
if (window.__kitcheroCollectionFiltersLoaded) {
  /* already wired */
} else {
  window.__kitcheroCollectionFiltersLoaded = true;
(function () {
  'use strict';

  /* Delegated listener state. We hang the `change`/`input` listeners
     on the document once and filter via `closest([data-filter-*])`
     so every re-render of the grid / sidebar keeps filters working
     without re-binding. The prior per-node binding died the moment
     applyFilters() swapped the `.kt-collection__active-filters` HTML
     with `outerHTML`: new checkboxes had no listener, so a second
     click would full-page reload instead of AJAX-refining. */
  var priceTimer;

  /* AbortController for filter-refine fetches. Rapidly toggling
     checkboxes fires overlapping requests; whichever resolves last
     paints the grid, which is often NOT the response to the user's
     latest click. Cancel prior on every new applyFilters(). */
  var abortCtl = null;

  function onChange(event) {
    var cb = event.target.closest && event.target.closest('[data-filter-checkbox]');
    if (cb) {
      applyFilters();
      return;
    }
  }

  function onInput(event) {
    var price = event.target.closest && event.target.closest('[data-filter-price]');
    if (price) {
      clearTimeout(priceTimer);
      priceTimer = setTimeout(applyFilters, 800);
    }
  }

  function init() {
    /* Only bind when a filter form is present — avoids wiring on
       non-collection templates. The listeners themselves are
       idempotent via `document.__ktFiltersBound`. */
    var forms = document.querySelectorAll('[data-collection-filters-form]');
    if (forms.length === 0) return;

    if (!document.__ktFiltersBound) {
      document.__ktFiltersBound = true;
      document.addEventListener('change', onChange);
      document.addEventListener('input', onInput);
    }
  }

  function buildFilterUrl() {
    var params = new URLSearchParams();

    /* Collect all checked checkboxes */
    document.querySelectorAll('[data-filter-checkbox]:checked').forEach(function (cb) {
      params.append(cb.name, cb.value);
    });

    /* Collect price inputs */
    document.querySelectorAll('[data-filter-price]').forEach(function (input) {
      if (input.value) {
        params.append(input.name, input.value);
      }
    });

    /* Preserve sort_by */
    var currentUrl = new URL(window.location.href);
    var sortBy = currentUrl.searchParams.get('sort_by');
    if (sortBy) params.set('sort_by', sortBy);

    return window.location.pathname + '?' + params.toString();
  }

  function applyFilters() {
    var newUrl = buildFilterUrl();

    /* Find the section ID for Section Rendering API */
    var sectionEl = document.querySelector('[data-section-type="main-collection"]');
    if (!sectionEl) {
      /* Fallback: full page navigation */
      window.location.href = newUrl;
      return;
    }

    var sectionId = sectionEl.closest('.shopify-section')
      ? sectionEl.closest('.shopify-section').id.replace('shopify-section-', '')
      : null;

    if (!sectionId) {
      window.location.href = newUrl;
      return;
    }

    /* Fetch new section HTML via Section Rendering API */
    var fetchUrl = newUrl + (newUrl.includes('?') ? '&' : '?') + 'section_id=' + sectionId;

    /* Visible loading state — previously ZERO feedback fired between
       filter-click and grid-swap. On a 3G / throttled connection users
       would rapid-click the same checkbox wondering if anything
       registered. aria-busy cues SR users of pending work; the CSS
       class is opt-in for a dim/spinner overlay on the grid. */
    var oldGridEarly = document.getElementById('product-grid');
    if (oldGridEarly) {
      oldGridEarly.setAttribute('aria-busy', 'true');
      oldGridEarly.classList.add('kt-collection__grid--loading');
    }

    /* Cancel any prior in-flight refine so a slow earlier response
       can't overwrite the grid with stale filter state. */
    if (abortCtl) abortCtl.abort();
    abortCtl = new AbortController();

    fetch(fetchUrl, { signal: abortCtl.signal })
      .then(function (response) {
        if (!response.ok) throw new Error('Filter fetch failed');
        return response.text();
      })
      .then(function (html) {
        /* Parse response and replace grid + controls */
        var parser = new DOMParser();
        var doc = parser.parseFromString(html, 'text/html');

        /* Replace product grid */
        var newGrid = doc.getElementById('product-grid');
        var oldGrid = document.getElementById('product-grid');
        if (newGrid && oldGrid) {
          oldGrid.innerHTML = newGrid.innerHTML;
        }

        /* Replace active filters */
        var newFilters = doc.querySelector('.kt-collection__active-filters');
        var oldFilters = document.querySelector('.kt-collection__active-filters');
        var controlsContainer = document.querySelector('[data-collection-controls] .page-width');

        if (newFilters && oldFilters) {
          oldFilters.outerHTML = newFilters.outerHTML;
        } else if (newFilters && controlsContainer) {
          controlsContainer.insertAdjacentHTML('beforeend', newFilters.outerHTML);
        } else if (!newFilters && oldFilters) {
          oldFilters.remove();
        }

        /* Replace results count + announce to screen readers. Without
           this announcement, keyboard/SR users who tick a filter
           checkbox (or slide the price range) hear nothing from the
           Ajax swap — the grid silently re-renders but they have no
           audible confirmation how many products match. The count
           span below carries aria-live="polite" too, but a focused
           announcement via Kitchero.announce queues reliably even
           when the old text node is replaced. */
        var newCount = doc.querySelector('.kt-collection__results-count');
        var oldCount = document.querySelector('.kt-collection__results-count');
        var countText = '';
        if (newCount && oldCount) {
          countText = newCount.textContent;
          oldCount.textContent = countText;
        } else if (newCount) {
          countText = newCount.textContent;
        }
        if (countText && window.Kitchero && typeof Kitchero.announce === 'function') {
          Kitchero.announce(countText.trim());
        }

        /* Replace pagination */
        var newPagination = doc.querySelector('.kt-collection__pagination');
        var oldPagination = document.querySelector('.kt-collection__pagination');
        if (newPagination && oldPagination) {
          oldPagination.innerHTML = newPagination.innerHTML;
        } else if (!newPagination && oldPagination) {
          oldPagination.remove();
        }

        /* Update URL without reload */
        window.history.pushState({}, '', newUrl);

        /* Re-init countdowns if present */
        if (typeof initAll === 'function') initAll();

        /* Publish event for other scripts */
        if (window.Kitchero && Kitchero.bus) {
          Kitchero.bus.emit('collection:filtered', { url: newUrl });
        }
      })
      .catch(function (err) {
        /* AbortError is expected — we cancelled the request on a
           newer filter click. Silently ignore; do NOT navigate in
           that case because the caller's follow-up fetch is already
           handling the newer state. */
        if (err && err.name === 'AbortError') return;

        /* Fallback on real error — navigate to the filter URL so
           server renders the filtered result natively. Announce the
           transition so SR users know why the page flashes. */
        if (window.Kitchero && typeof Kitchero.announce === 'function') {
          /* global.js announce(message, urgency): urgency is a string
             ('assertive' | 'polite'), not an object. Default is polite
             when urgency is omitted or unrecognized, which is what this
             call wants — just omit the second arg. */
          Kitchero.announce(
            (Kitchero.cartStrings && Kitchero.cartStrings.error) || 'Loading results…'
          );
        }
        window.location.href = newUrl;
      })
      .then(function () {
        /* Release loading state on both success and failure paths.
           Runs in chained `.then` after `.catch` so it executes in
           every case — the `.catch` above navigates, but if the
           navigation is slow the visual state should clear so the
           grid doesn't look dead. */
        var oldGrid = document.getElementById('product-grid');
        if (oldGrid) {
          oldGrid.removeAttribute('aria-busy');
          oldGrid.classList.remove('kt-collection__grid--loading');
        }
      });
  }

  init();

  /* Re-init after section reload in editor */
  document.addEventListener('shopify:section:load', init);

  /* Handle browser back/forward. Previously did `window.location
     .reload()` which hard-reloaded the entire page — lost scroll
     position, wiped any unrelated client state, and defeated the
     whole point of AJAX-refining (users expect back/forward to be
     as fast as the forward navigation was).

     New: re-fetch the section HTML for the URL the browser restored
     via the same Section Rendering API path applyFilters() uses.
     Don't call applyFilters() directly because that reads the
     current DOM's checkbox/price state — on popstate the DOM hasn't
     been synced to the restored URL yet. Instead: fetch the
     restored URL's section HTML and swap the grid + filters +
     active-filters in place. */
  window.addEventListener('popstate', function () {
    var restoredUrl = window.location.pathname + window.location.search;
    var sectionEl = document.querySelector('[data-section-type="main-collection"]');
    if (!sectionEl) { window.location.reload(); return; }
    var shopifySection = sectionEl.closest('.shopify-section');
    var sectionId = shopifySection ? shopifySection.id.replace('shopify-section-', '') : null;
    if (!sectionId) { window.location.reload(); return; }

    var fetchUrl = restoredUrl + (restoredUrl.includes('?') ? '&' : '?') + 'section_id=' + sectionId;

    if (abortCtl) abortCtl.abort();
    abortCtl = new AbortController();

    fetch(fetchUrl, { signal: abortCtl.signal })
      .then(function (r) { if (!r.ok) throw new Error('popstate fetch failed'); return r.text(); })
      .then(function (html) {
        var doc = new DOMParser().parseFromString(html, 'text/html');
        var newGrid = doc.getElementById('product-grid');
        var oldGrid = document.getElementById('product-grid');
        if (newGrid && oldGrid) oldGrid.innerHTML = newGrid.innerHTML;
        var newPagination = doc.querySelector('.kt-collection__pagination');
        var oldPagination = document.querySelector('.kt-collection__pagination');
        if (newPagination && oldPagination) oldPagination.innerHTML = newPagination.innerHTML;
        else if (!newPagination && oldPagination) oldPagination.remove();
        /* Active filters + the filter sidebar checkbox state both need
           to be swapped so the UI reflects the restored URL. */
        var newFilters = doc.querySelector('.kt-collection__active-filters');
        var oldFilters = document.querySelector('.kt-collection__active-filters');
        if (newFilters && oldFilters) oldFilters.outerHTML = newFilters.outerHTML;
        else if (!newFilters && oldFilters) oldFilters.remove();
      })
      .catch(function (err) {
        if (err && err.name === 'AbortError') return;
        /* Real error — fallback to hard reload so the user at least
           lands on the correct state. */
        window.location.reload();
      });
  });
})();
}
