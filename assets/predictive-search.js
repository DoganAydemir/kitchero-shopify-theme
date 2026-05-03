/**
 * Predictive Search — fetches suggestions from Shopify API.
 *
 * Uses routes.predictive_search_url (exposed via Kitchero.routes) for
 * search-as-you-type. Calls Shopify's Section Rendering API with
 * `section_id=predictive-search` so the response HTML is pre-rendered
 * by the section at `sections/predictive-search.liquid`.
 *
 * Lifecycle: the script binds one `input` listener on the search input
 * and one `click` listener per suggestion pill. Both need to survive
 * the theme editor's `shopify:section:load` event (fires when a
 * merchant re-renders a section containing the search overlay or
 * the suggestion pills inside search-popular-queries snippet). We
 * achieve that by re-running `bindSearch` on every section:load, using
 * per-node bound flags so the same DOM node never gets duplicate
 * listeners when the surrounding section is re-rendered without the
 * input itself being replaced.
 */
(function () {
  'use strict';

  var debounceTimer;

  /* AbortController for in-flight predictive-search requests. Fast
     typists trigger several overlapping fetches as they type — without
     cancellation, responses race each other and whichever lands LAST
     wins the DOM, which is often the response to a PRIOR query. Users
     see stale matches that don't reflect what they typed. On each new
     fetch, abort the previous controller before firing the new one. */
  var abortCtl = null;

  /* SR announcement helper — pushes result counts through the global
     Kitchero.announce() live region. The results container itself has
     aria-live="polite" but mass DOM replacement doesn't always fire
     announcements reliably across SRs; a discrete textContent swap
     on the persistent announcer is the belt-and-braces. */
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

  /* Toggle the combobox's `aria-expanded` based on whether the listbox
     currently has result content. Lets AT announce "listbox collapsed"
     when the query clears and "listbox expanded, N results" when
     suggestions appear. Pair with aria-controls on the input. */
  function setExpanded(input, expanded) {
    if (input && input.setAttribute) {
      input.setAttribute('aria-expanded', expanded ? 'true' : 'false');
    }
  }

  function fetchResults(input, resultsContainer, query) {
    if (query.length < 2) {
      resultsContainer.innerHTML = '';
      setExpanded(input, false);
      return;
    }

    /* Which resource types to ask Shopify for. Driven by theme settings
       (Theme options → Search behavior → Include in results). Falls back
       to a sane default including collection so merchants who land on a
       store with no explicit setting still get category matches (e.g.
       typing "sofa" surfaces the /collections/sofas page, not just
       individual sofa products). Previously omitted collection, which
       hid a navigation shortcut customers expected from every other
       Shopify store. */
    var types = (window.Kitchero && Kitchero.searchSettings && Kitchero.searchSettings.types) || 'product,collection,article,page';
    if (!types) {
      resultsContainer.innerHTML = '';
      return;
    }

    var routes = window.Kitchero && Kitchero.routes;
    if (!routes || !routes.predictiveSearch) return;

    /* JSON endpoint instead of Section Rendering API.
     *
     * History: this code went through 5+ debugging rounds across
     * multiple commits trying to make the section-rendering pattern
     * work (`/search/suggest?section_id=predictive-search`). Bugs
     * surfaced at every level:
     *   • disabled_on wildcard in the section schema → Section
     *     Rendering API silently refused to invoke the Liquid path.
     *   • encodeURIComponent(types) → commas became %2C →
     *     Shopify treated the type list as one literal string.
     *   • Even with both fixed, /search/suggest with section_id
     *     kept returning the empty-state branch in some
     *     environments — the user reported "still no results"
     *     after every theoretically-complete fix.
     *
     * Switching to the JSON endpoint eliminates the entire class
     * of section-render bugs. We call /search/suggest.json
     * directly, get a guaranteed JSON payload back, and render
     * the result groups manually in JS. The DOM output matches
     * the kt-predictive-search markup the section template would
     * have produced — same classes, same a11y semantics, same
     * keyboard navigation hooks. The Liquid section file is
     * retained as a no-JS fallback hook + defensive scaffold but
     * is no longer on the critical path. */
    var jsonUrl = routes.predictiveSearch
      + (routes.predictiveSearch.indexOf('.json') === -1 ? '.json' : '');

    var params = new URLSearchParams();
    params.set('q', query);
    params.set('resources[type]', types);
    params.set('resources[limit]', '4');
    var url = jsonUrl + '?' + params.toString();

    /* Cancel any prior in-flight fetch so a slow earlier response
       can't overwrite the DOM with stale matches. */
    if (abortCtl) abortCtl.abort();
    abortCtl = new AbortController();

    fetch(url, { signal: abortCtl.signal })
      .then(function (response) {
        if (!response.ok) throw new Error('Search failed: HTTP ' + response.status);
        return response.json();
      })
      .then(function (data) {
        var resources = (data && data.resources && data.resources.results) || {};
        var products = resources.products || [];
        var collections = resources.collections || [];
        var articles = resources.articles || [];
        var pages = resources.pages || [];

        var totalCount = products.length + collections.length + articles.length + pages.length;

        if (totalCount === 0) {
          resultsContainer.innerHTML = renderEmpty(query);
          announceResultCount(0);
          setExpanded(input, true);
          return;
        }

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
        /* AbortError is expected — we cancelled the request ourselves
           on a newer keystroke. Silently ignore; any other error
           clears the results so the UI doesn't freeze on stale data. */
        if (err && err.name === 'AbortError') return;
        if (window.console && console.warn) {
          console.warn('[Kitchero] predictive search failed:', err);
        }
        resultsContainer.innerHTML = '';
        setExpanded(input, false);
      });
  }

  /* HTML render helpers — produce the same kt-predictive-search markup
     the Liquid section ships, so existing CSS + keyboard nav hooks
     continue to work without changes. Use innerHTML strings rather
     than DOM construction because the tree is shallow + read-only and
     the perf delta is negligible vs the readability win. All user-
     supplied strings are escaped via escapeHtml(). */

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
    var html = '<div class="kt-predictive-search__group" data-group="products">';
    html += '<h2 class="kt-predictive-search__group-title">' + escapeHtml(heading) + '</h2>';
    html += '<ul class="kt-predictive-search__list" role="list">';
    products.forEach(function (p) {
      var img = p.featured_image && p.featured_image.url ? p.featured_image.url : '';
      var alt = (p.featured_image && p.featured_image.alt) || p.title || '';
      var price = p.price ? formatMoney(p.price, p.currency) : '';
      html += '<li class="predictive-search__item kt-predictive-search__item">';
      html += '<a href="' + escapeHtml(p.url) + '" class="kt-predictive-search__link" role="option">';
      if (img) {
        html += '<img src="' + escapeHtml(img) + '" alt="' + escapeHtml(alt) + '" width="60" height="60" class="kt-predictive-search__thumb" loading="lazy">';
      } else {
        html += '<span class="kt-predictive-search__thumb kt-predictive-search__thumb--empty" aria-hidden="true"></span>';
      }
      html += '<span class="kt-predictive-search__text">';
      html += '<span class="kt-predictive-search__title">' + escapeHtml(p.title) + '</span>';
      if (price) html += '<span class="kt-predictive-search__price">' + price + '</span>';
      html += '</span></a></li>';
    });
    html += '</ul></div>';
    return html;
  }

  function renderCollectionGroup(collections) {
    var s = strings();
    var heading = s.groupCollections || 'Collections';
    var html = '<div class="kt-predictive-search__group" data-group="collections">';
    html += '<h2 class="kt-predictive-search__group-title">' + escapeHtml(heading) + '</h2>';
    html += '<ul class="kt-predictive-search__list" role="list">';
    collections.forEach(function (c) {
      html += '<li class="predictive-search__item kt-predictive-search__item">';
      html += '<a href="' + escapeHtml(c.url) + '" class="kt-predictive-search__link" role="option">';
      html += '<span class="kt-predictive-search__title">' + escapeHtml(c.title) + '</span>';
      html += '</a></li>';
    });
    html += '</ul></div>';
    return html;
  }

  function renderArticleGroup(articles) {
    var s = strings();
    var heading = s.groupArticles || 'Journal';
    var html = '<div class="kt-predictive-search__group" data-group="articles">';
    html += '<h2 class="kt-predictive-search__group-title">' + escapeHtml(heading) + '</h2>';
    html += '<ul class="kt-predictive-search__list" role="list">';
    articles.forEach(function (a) {
      html += '<li class="predictive-search__item kt-predictive-search__item">';
      html += '<a href="' + escapeHtml(a.url) + '" class="kt-predictive-search__link" role="option">';
      html += '<span class="kt-predictive-search__title">' + escapeHtml(a.title) + '</span>';
      html += '</a></li>';
    });
    html += '</ul></div>';
    return html;
  }

  function renderPageGroup(pages) {
    var s = strings();
    var heading = s.groupPages || 'Pages';
    var html = '<div class="kt-predictive-search__group" data-group="pages">';
    html += '<h2 class="kt-predictive-search__group-title">' + escapeHtml(heading) + '</h2>';
    html += '<ul class="kt-predictive-search__list" role="list">';
    pages.forEach(function (p) {
      html += '<li class="predictive-search__item kt-predictive-search__item">';
      html += '<a href="' + escapeHtml(p.url) + '" class="kt-predictive-search__link" role="option">';
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
    var searchUrl = (routes && routes.search) ? routes.search : '/search';
    return '<div class="kt-predictive-search__footer">' +
      '<a href="' + escapeHtml(searchUrl) + '?q=' + encodeURIComponent(query) + '" class="kt-predictive-search__view-all">' +
      escapeHtml(label) + '</a></div>';
  }

  function renderEmpty(query) {
    var s = strings();
    var tpl = s.noResults || 'No results found for "[terms]".';
    var msg = tpl.replace('[terms]', query);
    return '<p class="kt-predictive-search__empty" role="status">' + escapeHtml(msg) + '</p>';
  }

  /* Money formatting — best-effort using Intl.NumberFormat. Shopify's
     /search/suggest.json returns price as cents (integer) under
     `price` and the currency under `currency`. Falls back to plain
     "$X.YY" formatting if Intl isn't available. */
  function formatMoney(cents, currency) {
    var amount = (cents || 0) / 100;
    if (typeof Intl !== 'undefined' && Intl.NumberFormat) {
      try {
        return new Intl.NumberFormat(undefined, {
          style: 'currency',
          currency: currency || 'USD',
        }).format(amount);
      } catch (e) { /* fall through */ }
    }
    return '$' + amount.toFixed(2);
  }

  function bindInput(input, resultsContainer) {
    if (!input || input.__ktPredictiveBound) return;
    input.__ktPredictiveBound = true;
    input.addEventListener('input', function () {
      clearTimeout(debounceTimer);
      var query = this.value.trim();
      /* 180 ms debounce — tuned to match Shopify's predictive-search
         endpoint latency (typically 60-120 ms). 300 ms felt laggy
         vs. live-search UX; 180 ms still drops typed-and-deleted
         characters before firing the request. */
      debounceTimer = setTimeout(function () {
        fetchResults(input, resultsContainer, query);
      }, 180);
    });

    /* Keyboard navigation through predictive results. ArrowDown moves
       the highlight down, ArrowUp moves it up, Enter follows the
       highlighted link. Without this, keyboard-only users have to
       Tab through every result individually to pick one. */
    input.addEventListener('keydown', function (event) {
      var links = resultsContainer.querySelectorAll('.kt-predictive-search__link');
      if (!links.length) return;

      /* Each option needs a unique id so the input's
         `aria-activedescendant` can point at it — that's how the
         WAI-ARIA combobox pattern tells screen readers WHICH option
         in the listbox is currently highlighted while DOM focus
         stays on the input. Without ids + activedescendant, NVDA /
         JAWS users typing into the search and arrowing through
         suggestions hear only the input value, never the highlighted
         result. Assign lazily here (idempotent — keeps ids stable
         across re-renders within the same query). */
      for (var idx = 0; idx < links.length; idx++) {
        if (!links[idx].id) {
          links[idx].id = 'kt-predictive-option-' + idx;
        }
      }

      var currentIndex = -1;
      for (var i = 0; i < links.length; i++) {
        if (links[i].classList.contains('is-active')) {
          currentIndex = i;
          break;
        }
      }

      if (event.key === 'ArrowDown') {
        event.preventDefault();
        var next = currentIndex + 1;
        if (next >= links.length) next = 0;
        setActive(links, next, input);
      } else if (event.key === 'ArrowUp') {
        event.preventDefault();
        var prev = currentIndex - 1;
        if (prev < 0) prev = links.length - 1;
        setActive(links, prev, input);
      } else if (event.key === 'Enter' && currentIndex >= 0) {
        /* Only intercept Enter when the user has navigated into the
           results — otherwise allow the default form submit to reach
           the full-page /search results. */
        event.preventDefault();
        links[currentIndex].click();
      } else if (event.key === 'Escape') {
        clearActive(links, input);
      }
    });
  }

  function setActive(links, index, input) {
    clearActive(links, input);
    var link = links[index];
    if (!link) return;
    link.classList.add('is-active');
    link.setAttribute('aria-selected', 'true');
    /* Sync the combobox input's aria-activedescendant to point at
       the currently-highlighted option. SR users focused on the
       input hear the option announced. */
    if (input && link.id) {
      input.setAttribute('aria-activedescendant', link.id);
    }
    /* Scroll the result into view if the list is tall enough to
       overflow its container. `block: 'nearest'` avoids a jumpy
       center-scroll on short result lists. */
    if (typeof link.scrollIntoView === 'function') {
      link.scrollIntoView({ block: 'nearest' });
    }
  }

  function clearActive(links, input) {
    for (var i = 0; i < links.length; i++) {
      links[i].classList.remove('is-active');
      links[i].removeAttribute('aria-selected');
    }
    if (input) {
      input.removeAttribute('aria-activedescendant');
    }
  }

  function bindPills(input, resultsContainer, root) {
    /* Suggestion pills — populate input and trigger search. Scoped to
       `root` so re-binding after a section:load only touches the pills
       inside the just-re-rendered node. */
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
    /* Re-resolve the input + results container every run — on a theme
       editor section:load the old references may have been detached
       from the document.

       Each `[data-search-input]` pairs with its OWN results container
       via `aria-controls="..."`. Previously we looked up ONE global
       `#predictive-search-results` which only matched the overlay —
       the full-page /search input had no listbox target and its
       live-suggestions path was dead. Reading aria-controls off each
       input scopes the pairing and aligns with the ARIA combobox
       pattern already in the markup. */
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

  /* Theme editor lifecycle — re-init when a section containing the
     search input or the suggestion pills is re-rendered. Without this,
     merchants who add/reorder sections in the editor would see dead
     search UI (listeners bound to DOM nodes that are no longer in the
     document). */
  document.addEventListener('shopify:section:load', function (event) {
    init(event.target || document);
  });
})();
