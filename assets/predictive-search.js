/**
 * Predictive Search — fetches suggestions from Shopify API
 * Uses routes.predictive_search_url for search-as-you-type.
 * Re-initializes on shopify:section:load.
 */
(function () {
  'use strict';

  var searchInput = document.getElementById('search-input');
  var resultsContainer = document.getElementById('predictive-search-results');
  var debounceTimer;

  if (!searchInput || !resultsContainer) return;
  if (!window.routes || !window.routes.predictive_search_url) return;

  function fetchResults(query) {
    if (query.length < 2) {
      resultsContainer.innerHTML = '';
      return;
    }

    /* Which resource types to ask Shopify for. Driven by theme settings
       (Theme options → Search behavior → Include in results). Falls back
       to a sane default if the globals haven't been exposed yet. */
    var types = (window.searchSettings && window.searchSettings.types) || 'product,article,page';
    if (!types) {
      resultsContainer.innerHTML = '';
      return;
    }

    var url = window.routes.predictive_search_url
      + '?q=' + encodeURIComponent(query)
      + '&resources[type]=' + encodeURIComponent(types)
      + '&resources[limit]=4'
      + '&section_id=predictive-search';

    fetch(url)
      .then(function (response) {
        if (!response.ok) throw new Error('Search failed');
        return response.text();
      })
      .then(function (html) {
        /* Parse and extract results from section rendering */
        var temp = document.createElement('div');
        temp.innerHTML = html;

        var products = temp.querySelectorAll('.predictive-search__item');
        if (products.length === 0) {
          /* Fallback: show raw text results */
          resultsContainer.innerHTML = html;
          return;
        }
        resultsContainer.innerHTML = '';
        products.forEach(function (item) {
          resultsContainer.appendChild(item.cloneNode(true));
        });
      })
      .catch(function () {
        resultsContainer.innerHTML = '';
      });
  }

  searchInput.addEventListener('input', function () {
    clearTimeout(debounceTimer);
    var query = this.value.trim();
    debounceTimer = setTimeout(function () {
      fetchResults(query);
    }, 300);
  });

  /* Suggestion pills — populate input and trigger search */
  document.querySelectorAll('[data-search-term]').forEach(function (pill) {
    pill.addEventListener('click', function () {
      var term = this.dataset.searchTerm;
      searchInput.value = term;
      fetchResults(term);
      searchInput.focus();
    });
  });
})();
