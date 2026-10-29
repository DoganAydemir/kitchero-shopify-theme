(function () {
  'use strict';

  var debounceTimer;

  var abortCtl = null;

  var predictiveSearchRateLimitedUntil = 0;

  function announceResultCount(count) {
    if (!(window.Kitchero && typeof Kitchero.announce === 'function')) return;
    var tpl = window.Kitchero.searchSettings && window.Kitchero.searchSettings.resultsAnnouncement;
    var msg;
    if (count === 0) {
      msg = (window.Kitchero.searchSettings && window.Kitchero.searchSettings.noResults)
        || 'No results found';
    } else if (tpl) {
      msg = tpl.replace('[count]', count);
    } else {
      msg = count + ' results found';
    }
    Kitchero.announce(msg);
  }

  // Announces the message currently shown in the results area (no results,
  // offline, rate limited, failed). The results area itself is not a live
  // region, so these messages are announced explicitly.
  function announceMessage(container) {
    if (!(window.Kitchero && typeof Kitchero.announce === 'function')) return;
    var text = container.textContent.replace(/\s+/g, ' ').trim();
    if (text) Kitchero.announce(text);
  }

  // The results area is one listbox (groups inside are role="group") only
  // while it shows results; skeleton, empty and error messages are plain text.
  function setListbox(container, input, on) {
    if (on) {
      container.setAttribute('role', 'listbox');
      var label = (input && input.getAttribute('aria-label'))
        || (window.Kitchero && Kitchero.searchSettings && Kitchero.searchSettings.resultsLabel)
        || 'Search results';
      container.setAttribute('aria-label', label);
    } else {
      container.removeAttribute('role');
      container.removeAttribute('aria-label');
    }
  }

  function setExpanded(input, expanded) {
    if (input && input.setAttribute) {
      input.setAttribute('aria-expanded', expanded ? 'true' : 'false');
    }
  }

  // Cancels the request in flight so a late response can't re-render old results.
  function cancelPending(resultsContainer) {
    if (abortCtl) {
      try { abortCtl.abort(); } catch (e) {  }
      abortCtl = null;
    }
    if (resultsContainer) resultsContainer.removeAttribute('aria-busy');
  }

  // True when the response still belongs to what is in the search field.
  function isCurrentQuery(input, query, ctl) {
    return ctl === abortCtl && !ctl.signal.aborted && input.value.trim() === query;
  }

  function fetchResults(input, resultsContainer, query) {
    if (query.length < 2) {
      cancelPending(resultsContainer);
      setListbox(resultsContainer, input, false);
      resultsContainer.innerHTML = '';
      setExpanded(input, false);
      return;
    }

    var types = (window.Kitchero && Kitchero.searchSettings && Kitchero.searchSettings.types) || 'product,collection,article,page';
    if (!types) {
      setListbox(resultsContainer, input, false);
      resultsContainer.innerHTML = '';
      return;
    }

    var routes = window.Kitchero && Kitchero.routes;
    if (!routes || !routes.predictiveSearch) return;

    var jsonUrl = routes.predictiveSearch
      + (routes.predictiveSearch.indexOf('.json') === -1 ? '.json' : '');

    var params = new URLSearchParams();
    params.set('q', query);
    params.set('resources[type]', types);
    params.set('resources[limit]', '4');
    var url = jsonUrl + '?' + params.toString();

    if (abortCtl) abortCtl.abort();
    abortCtl = new AbortController();

    var localAbortCtl = abortCtl;

    if (typeof navigator !== 'undefined' && navigator.onLine === false) {
      setListbox(resultsContainer, input, false);
      resultsContainer.innerHTML = renderError('offline');
      announceMessage(resultsContainer);
      setExpanded(input, true);
      return;
    }

    if (predictiveSearchRateLimitedUntil > Date.now()) {
      setListbox(resultsContainer, input, false);
      resultsContainer.innerHTML = renderError('rate_limited');
      announceMessage(resultsContainer);
      setExpanded(input, true);
      return;
    }

    var timeoutId = setTimeout(function () {
      try { localAbortCtl.abort(); } catch (e) {  }
    }, 8000);

    resultsContainer.setAttribute('aria-busy', 'true');
    setListbox(resultsContainer, input, false);
    resultsContainer.innerHTML = renderSkeleton();

    fetch(url, { signal: localAbortCtl.signal })
      .then(function (response) {
        clearTimeout(timeoutId);
        if (isCurrentQuery(input, query, localAbortCtl)) resultsContainer.removeAttribute('aria-busy');
        if (response.status === 429) {
          predictiveSearchRateLimitedUntil = Date.now() + 5000;
          throw new Error('Search rate-limited');
        }
        if (!response.ok) throw new Error('Search failed: HTTP ' + response.status);
        return response.json();
      })
      .then(function (data) {
        if (!isCurrentQuery(input, query, localAbortCtl)) return;
        var resources = (data && data.resources && data.resources.results) || {};
        var products = resources.products || [];
        var collections = resources.collections || [];
        var articles = resources.articles || [];
        var pages = resources.pages || [];

        var totalCount = products.length + collections.length + articles.length + pages.length;

        if (totalCount === 0) {
          setListbox(resultsContainer, input, false);
          resultsContainer.innerHTML = renderEmpty(query);
          announceMessage(resultsContainer);

          setExpanded(input, false);
          return;
        }

        setListbox(resultsContainer, input, true);
        resultsContainer.innerHTML =
          (products.length    ? renderProductGroup(products)       : '') +
          (collections.length ? renderCollectionGroup(collections) : '') +
          (articles.length    ? renderArticleGroup(articles)       : '') +
          (pages.length       ? renderPageGroup(pages)             : '') +
          renderViewAll(query);
        announceResultCount(totalCount);
        setExpanded(input, true);
      })
      .catch(function (err) {
        clearTimeout(timeoutId);
        if (err && err.name === 'AbortError') return;
        if (!isCurrentQuery(input, query, localAbortCtl)) return;
        resultsContainer.removeAttribute('aria-busy');

        var errKind = (err && err.message === 'Search rate-limited') ? 'rate_limited' : 'generic';
        setListbox(resultsContainer, input, false);
        resultsContainer.innerHTML = renderError(errKind);
        announceMessage(resultsContainer);
        setExpanded(input, true);
      });
  }

  function escapeHtml(s) {
    if (s == null) return '';
    return String(s)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  function strings() {
    return (window.Kitchero && window.Kitchero.searchSettings) || {};
  }

  function renderProductGroup(products) {
    var s = strings();
    var heading = s.groupProducts || 'Products';
    var html = '<div class="kt-predictive-search__group" data-group="products" role="group" aria-labelledby="kt-predictive-search-products-heading">';
    html += '<h2 class="kt-predictive-search__group-title" id="kt-predictive-search-products-heading" role="presentation">' + escapeHtml(heading) + '</h2>';
    html += '<ul class="kt-predictive-search__list" role="none">';
    products.forEach(function (p) {
      var img = p.featured_image && p.featured_image.url ? p.featured_image.url : '';
      var alt = (p.featured_image && p.featured_image.alt) || p.title || '';
      // /search/suggest.json returns prices as decimal strings ("122.00");
      // formatMoney works in cents like the rest of the theme.
      var priceCents = typeof p.price === 'string' ? Math.round(parseFloat(p.price) * 100) : p.price;
      var price = priceCents ? formatMoney(priceCents, p.currency) : '';
      html += '<li class="predictive-search__item kt-predictive-search__item" role="option">';
      html += '<a href="' + escapeHtml(p.url) + '" class="kt-predictive-search__link">';
      if (img) {
        html += '<img src="' + escapeHtml(img) + '" alt="' + escapeHtml(alt) + '" width="60" height="60" class="kt-predictive-search__thumb" loading="lazy">';
      } else {
        html += '<span class="kt-predictive-search__thumb kt-predictive-search__thumb--empty" aria-hidden="true"></span>';
      }
      html += '<span class="kt-predictive-search__text">';
      html += '<span class="kt-predictive-search__title">' + escapeHtml(p.title) + '</span>';

      if (price) html += '<span class="kt-predictive-search__price">' + escapeHtml(price) + '</span>';
      html += '</span></a></li>';
    });
    html += '</ul></div>';
    return html;
  }

  function renderCollectionGroup(collections) {
    var s = strings();
    var heading = s.groupCollections || 'Collections';
    var html = '<div class="kt-predictive-search__group" data-group="collections" role="group" aria-labelledby="kt-predictive-search-collections-heading">';
    html += '<h2 class="kt-predictive-search__group-title" id="kt-predictive-search-collections-heading" role="presentation">' + escapeHtml(heading) + '</h2>';
    html += '<ul class="kt-predictive-search__list" role="none">';
    collections.forEach(function (c) {
      html += '<li class="predictive-search__item kt-predictive-search__item" role="option">';
      html += '<a href="' + escapeHtml(c.url) + '" class="kt-predictive-search__link">';
      html += '<span class="kt-predictive-search__title">' + escapeHtml(c.title) + '</span>';
      html += '</a></li>';
    });
    html += '</ul></div>';
    return html;
  }

  function renderArticleGroup(articles) {
    var s = strings();
    var heading = s.groupArticles || 'Journal';
    var html = '<div class="kt-predictive-search__group" data-group="articles" role="group" aria-labelledby="kt-predictive-search-articles-heading">';
    html += '<h2 class="kt-predictive-search__group-title" id="kt-predictive-search-articles-heading" role="presentation">' + escapeHtml(heading) + '</h2>';
    html += '<ul class="kt-predictive-search__list" role="none">';
    articles.forEach(function (a) {
      html += '<li class="predictive-search__item kt-predictive-search__item" role="option">';
      html += '<a href="' + escapeHtml(a.url) + '" class="kt-predictive-search__link">';
      html += '<span class="kt-predictive-search__title">' + escapeHtml(a.title) + '</span>';
      html += '</a></li>';
    });
    html += '</ul></div>';
    return html;
  }

  function renderPageGroup(pages) {
    var s = strings();
    var heading = s.groupPages || 'Pages';
    var html = '<div class="kt-predictive-search__group" data-group="pages" role="group" aria-labelledby="kt-predictive-search-pages-heading">';
    html += '<h2 class="kt-predictive-search__group-title" id="kt-predictive-search-pages-heading" role="presentation">' + escapeHtml(heading) + '</h2>';
    html += '<ul class="kt-predictive-search__list" role="none">';
    pages.forEach(function (p) {
      html += '<li class="predictive-search__item kt-predictive-search__item" role="option">';
      html += '<a href="' + escapeHtml(p.url) + '" class="kt-predictive-search__link">';
      html += '<span class="kt-predictive-search__title">' + escapeHtml(p.title) + '</span>';
      html += '</a></li>';
    });
    html += '</ul></div>';
    return html;
  }

  function renderViewAll(query) {
    var s = strings();
    var label = s.viewAll || 'View all results';
    var routes = window.Kitchero && window.Kitchero.routes;

    var fallbackRoot = (window.Shopify && window.Shopify.routes && window.Shopify.routes.root) || '/';
    var searchUrl = (routes && routes.search) ? routes.search : (fallbackRoot + 'search');
    return '<div class="kt-predictive-search__footer" role="none">' +
      '<a href="' + escapeHtml(searchUrl) + '?q=' + encodeURIComponent(query) + '" class="kt-predictive-search__view-all" role="option">' +
      escapeHtml(label) + '</a></div>';
  }

  function renderEmpty(query) {
    var s = strings();
    var tpl = s.noResults || 'No results found for "[terms]".';
    var msg = tpl.replace('[terms]', query);
    return '<p class="kt-predictive-search__empty">' + escapeHtml(msg) + '</p>';
  }

  function renderSkeleton() {
    var rows = '';
    for (var i = 0; i < 3; i++) {
      rows += '<div class="kt-predictive-search__skeleton-row" aria-hidden="true">'
        + '<div class="kt-predictive-search__skeleton-thumb"></div>'
        + '<div class="kt-predictive-search__skeleton-lines">'
        +   '<div class="kt-predictive-search__skeleton-line"></div>'
        +   '<div class="kt-predictive-search__skeleton-line kt-predictive-search__skeleton-line--short"></div>'
        + '</div>'
        + '</div>';
    }
    return '<div class="kt-predictive-search__skeleton">' + rows + '</div>';
  }

  function renderError(kind) {
    var s = strings();
    var key;
    switch (kind) {
      case 'offline':
        key = s.offline || 'You appear to be offline. Reconnect and try again.';
        break;
      case 'rate_limited':
        key = s.rateLimited || 'Search is temporarily unavailable. Please try again in a moment.';
        break;
      default:
        key = s.genericError || 'Search failed. Please try again.';
    }
    return '<p class="kt-predictive-search__error">' + escapeHtml(key) + '</p>';
  }

  function formatMoney(cents, currency) {
    if (window.Kitchero && typeof window.Kitchero.formatMoney === 'function') {
      return window.Kitchero.formatMoney(cents);
    }
    var amount = (cents || 0) / 100;
    var activeCurrency = currency
      || (window.Shopify && window.Shopify.currency && window.Shopify.currency.active)
      || 'USD';
    var locale = (document.documentElement && document.documentElement.lang) || 'en';
    if (typeof Intl !== 'undefined' && Intl.NumberFormat) {
      try {
        return new Intl.NumberFormat(locale, {
          style: 'currency',
          currency: activeCurrency,
        }).format(amount);
      } catch (e) {  }
    }
    return amount.toFixed(2) + ' ' + activeCurrency;
  }

  function bindInput(input, resultsContainer) {
    if (!input || input.__ktPredictiveBound) return;
    input.__ktPredictiveBound = true;

    var localDebounce = null;
    input.addEventListener('input', function () {
      clearTimeout(localDebounce);
      var query = this.value.trim();

      localDebounce = setTimeout(function () {
        fetchResults(input, resultsContainer, query);
      }, 180);
    });

    input.addEventListener('keydown', function (event) {
      var options = resultsContainer.querySelectorAll('[role="option"]');
      if (!options.length) return;

      for (var idx = 0; idx < options.length; idx++) {
        if (!options[idx].id) {
          options[idx].id = 'kt-predictive-option-' + idx;
        }
      }

      var currentIndex = -1;
      for (var i = 0; i < options.length; i++) {
        if (options[i].classList.contains('is-active')) {
          currentIndex = i;
          break;
        }
      }

      if (event.key === 'ArrowDown') {
        event.preventDefault();
        var next = currentIndex + 1;
        if (next >= options.length) next = 0;
        setActive(options, next, input);
      } else if (event.key === 'ArrowUp') {
        event.preventDefault();
        var prev = currentIndex - 1;
        if (prev < 0) prev = options.length - 1;
        setActive(options, prev, input);
      } else if (event.key === 'Enter' && currentIndex >= 0) {
        event.preventDefault();
        var current = options[currentIndex];
        var anchor = current.tagName === 'A' ? current : current.querySelector('a');
        if (anchor) anchor.click();
      } else if (event.key === 'Escape') {
        clearActive(options, input);
      }
    });
  }

  function setActive(options, index, input) {
    clearActive(options, input);
    var option = options[index];
    if (!option) return;
    option.classList.add('is-active');
    option.setAttribute('aria-selected', 'true');

    if (input && option.id) {
      input.setAttribute('aria-activedescendant', option.id);
    }

    if (typeof option.scrollIntoView === 'function') {
      option.scrollIntoView({ block: 'nearest' });
    }
  }

  function clearActive(options, input) {
    for (var i = 0; i < options.length; i++) {
      options[i].classList.remove('is-active');
      options[i].removeAttribute('aria-selected');
    }
    if (input) {
      input.removeAttribute('aria-activedescendant');
    }
  }

  function bindPills(input, resultsContainer, root) {
    var scope = root || document;
    var pills = scope.querySelectorAll('[data-search-term]');
    for (var i = 0; i < pills.length; i++) {
      (function (pill) {
        if (pill.__ktPredictivePillBound) return;
        pill.__ktPredictivePillBound = true;
        pill.addEventListener('click', function () {
          var term = this.dataset.searchTerm;
          if (!input) return;
          input.value = term;
          fetchResults(input, resultsContainer, term);
          input.focus();
        });
      })(pills[i]);
    }
  }

  function init(root) {
    var inputs = (root === document ? document : (root.querySelectorAll ? root : document))
      .querySelectorAll('[data-search-input]');
    if (!inputs.length) return;
    if (!window.Kitchero || !Kitchero.routes || !Kitchero.routes.predictiveSearch) return;

    var fallbackContainer = null;
    inputs.forEach(function (input) {
      var containerId = input.getAttribute('aria-controls');
      var container = containerId
        ? document.getElementById(containerId)
        : document.getElementById('predictive-search-results');
      if (!container) return;
      if (!fallbackContainer) fallbackContainer = container;
      bindInput(input, container);
    });
    if (fallbackContainer) bindPills(inputs[0], fallbackContainer, root);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', function () { init(document); });
  } else {
    init(document);
  }

  document.addEventListener('shopify:section:load', function (event) {
    init(event.target || document);
  });

  document.addEventListener('shopify:section:unload', function (event) {
  });
})();
