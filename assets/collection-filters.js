if (window.__kitcheroCollectionFiltersLoaded) {
} else {
  window.__kitcheroCollectionFiltersLoaded = true;
(function () {
  'use strict';

  var priceTimer;

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

    var ownedKeys = new Set();
    document.querySelectorAll('[data-filter-checkbox]').forEach(function (cb) {
      if (cb.name) ownedKeys.add(cb.name);
    });
    document.querySelectorAll('[data-filter-price]').forEach(function (input) {
      if (input.name) ownedKeys.add(input.name);
    });

    document.querySelectorAll('[data-filter-checkbox]:checked').forEach(function (cb) {
      params.append(cb.name, cb.value);
    });

    document.querySelectorAll('[data-filter-price]').forEach(function (input) {
      if (input.value) {
        params.append(input.name, input.value);
      }
    });

    var currentUrl = new URL(window.location.href);
    currentUrl.searchParams.forEach(function (value, key) {
      if (ownedKeys.has(key)) return;
      if (key === 'page') return;
      params.append(key, value);
    });

    return window.location.pathname + '?' + params.toString();
  }

  function applyFilters() {
    var newUrl = buildFilterUrl();

    var sectionEl = document.querySelector('[data-section-type="main-collection"]');
    if (!sectionEl) {
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

    var fetchUrl = newUrl + (newUrl.includes('?') ? '&' : '?') + 'section_id=' + sectionId;

    var oldGridEarly = document.querySelector('[data-product-grid]');
    if (oldGridEarly) {
      oldGridEarly.setAttribute('aria-busy', 'true');
      oldGridEarly.classList.add('kt-collection__grid--loading');
    }

    document.querySelectorAll('[data-collection-filters-form], [data-filter-drawer-form], [data-collection-filter-bar]').forEach(function (form) {
      form.setAttribute('aria-busy', 'true');
    });

    var preservedScrollY = window.scrollY;

    if (abortCtl) abortCtl.abort();
    abortCtl = new AbortController();

    fetch(fetchUrl, { signal: abortCtl.signal })
      .then(function (response) {
        if (!response.ok) throw new Error('Filter fetch failed');
        return response.text();
      })
      .then(function (html) {
        var parser = new DOMParser();
        var doc = parser.parseFromString(html, 'text/html');
        var activeId = document.activeElement && document.activeElement.id;

        var newGrid = doc.querySelector('[data-product-grid]');
        var oldGrid = document.querySelector('[data-product-grid]');
        var newEmpty = doc.querySelector('.kt-collection__empty');
        var oldEmpty = document.querySelector('.kt-collection__empty');
        if (newGrid && oldGrid) {
          oldGrid.innerHTML = newGrid.innerHTML;
        } else if (newEmpty && oldGrid) {
          oldGrid.replaceWith(newEmpty.cloneNode(true));
        } else if (newGrid && oldEmpty) {
          oldEmpty.replaceWith(newGrid.cloneNode(true));
        } else if (newEmpty && oldEmpty) {
          oldEmpty.outerHTML = newEmpty.outerHTML;
        }

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

        var newPagination = doc.querySelector('.kt-collection__pagination');
        var oldPagination = document.querySelector('.kt-collection__pagination');
        if (newPagination && oldPagination) {
          oldPagination.innerHTML = newPagination.innerHTML;
        } else if (!newPagination && oldPagination) {
          oldPagination.remove();
        }

        ['[data-collection-filters-form]', '[data-collection-filter-bar]', '[data-filter-drawer-content]'].forEach(function (sel) {
          var fresh = doc.querySelector(sel);
          var stale = document.querySelector(sel);
          if (fresh && stale) {
            stale.innerHTML = fresh.innerHTML;
          }
        });

        // Desktop filter bar: refresh every dropdown's trigger (active
        // count) and panel (selected count, Reset link, values) in place.
        // The dropdown elements stay, so an open panel stays open. A price
        // field that is being typed in is left alone.
        var freshDropdowns = doc.querySelectorAll('[data-filter-dropdown]');
        var staleDropdowns = document.querySelectorAll('[data-filter-dropdown]');
        if (freshDropdowns.length && freshDropdowns.length === staleDropdowns.length) {
          Array.prototype.forEach.call(staleDropdowns, function (stale, i) {
            var fresh = freshDropdowns[i];
            var staleTrigger = stale.querySelector('.kt-filter-bar__trigger');
            var freshTrigger = fresh.querySelector('.kt-filter-bar__trigger');
            if (staleTrigger && freshTrigger && staleTrigger.getAttribute('aria-controls') === freshTrigger.getAttribute('aria-controls')) {
              staleTrigger.innerHTML = freshTrigger.innerHTML;
            }
            var typing = document.activeElement && stale.contains(document.activeElement) &&
              document.activeElement.matches('input[type="number"], input[type="text"]');
            var stalePart = stale.querySelector(typing ? '.kt-filter-bar__panel-header' : '.kt-filter-bar__panel-inner');
            var freshPart = fresh.querySelector(typing ? '.kt-filter-bar__panel-header' : '.kt-filter-bar__panel-inner');
            if (stalePart && freshPart) stalePart.innerHTML = freshPart.innerHTML;
          });
          if (activeId && (!document.activeElement || document.activeElement.id !== activeId)) {
            var again = document.getElementById(activeId);
            if (again) again.focus({ preventScroll: true });
          }
        }

        window.history.pushState({}, '', newUrl);

        document.dispatchEvent(new CustomEvent('kitchero:countdown:refresh'));

        if (window.Kitchero && Kitchero.bus) {
          Kitchero.bus.emit('collection:filtered', { url: newUrl });
        }
      })
      .catch(function (err) {
        if (err && err.name === 'AbortError') return;

        if (window.Kitchero && typeof Kitchero.announce === 'function') {
          Kitchero.announce(
            (Kitchero.cartStrings && Kitchero.cartStrings.error) || 'Loading results…'
          );
        }
        window.location.href = newUrl;
      })
      .then(function () {
        var oldGrid = document.querySelector('[data-product-grid]');
        if (oldGrid) {
          oldGrid.removeAttribute('aria-busy');
          oldGrid.classList.remove('kt-collection__grid--loading');
        }

        document.querySelectorAll('[data-collection-filters-form], [data-filter-drawer-form], [data-collection-filter-bar]').forEach(function (form) {
          form.removeAttribute('aria-busy');
        });

        window.requestAnimationFrame(function () {
          window.scrollTo({ top: preservedScrollY, behavior: 'instant' });
        });
      });
  }

  init();

  document.addEventListener('shopify:section:load', init);

  document.addEventListener('shopify:section:unload', function (event) {
  });

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

        var newGrid = doc.querySelector('[data-product-grid]');
        var oldGrid = document.querySelector('[data-product-grid]');
        var newEmpty = doc.querySelector('.kt-collection__empty');
        var oldEmpty = document.querySelector('.kt-collection__empty');
        if (newGrid && oldGrid) {
          oldGrid.innerHTML = newGrid.innerHTML;
        } else if (newEmpty && oldGrid) {
          oldGrid.replaceWith(newEmpty.cloneNode(true));
        } else if (newGrid && oldEmpty) {
          oldEmpty.replaceWith(newGrid.cloneNode(true));
        } else if (newEmpty && oldEmpty) {
          oldEmpty.outerHTML = newEmpty.outerHTML;
        }
        var newPagination = doc.querySelector('.kt-collection__pagination');
        var oldPagination = document.querySelector('.kt-collection__pagination');
        if (newPagination && oldPagination) oldPagination.innerHTML = newPagination.innerHTML;
        else if (!newPagination && oldPagination) oldPagination.remove();

        var newFilters = doc.querySelector('.kt-collection__active-filters');
        var oldFilters = document.querySelector('.kt-collection__active-filters');
        if (newFilters && oldFilters) oldFilters.outerHTML = newFilters.outerHTML;
        else if (!newFilters && oldFilters) oldFilters.remove();
      })
      .catch(function (err) {
        if (err && err.name === 'AbortError') return;

        window.location.reload();
      });
  });
})();
}
