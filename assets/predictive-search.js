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

  function fetchResults(input, resultsContainer, query) {
    if (query.length < 2) {
      resultsContainer.innerHTML = '';
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

    var url = routes.predictiveSearch
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
          announceResultCount(0);
          return;
        }
        resultsContainer.innerHTML = '';
        products.forEach(function (item) {
          resultsContainer.appendChild(item.cloneNode(true));
        });
        announceResultCount(products.length);
      })
      .catch(function () {
        resultsContainer.innerHTML = '';
      });
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
        setActive(links, next);
      } else if (event.key === 'ArrowUp') {
        event.preventDefault();
        var prev = currentIndex - 1;
        if (prev < 0) prev = links.length - 1;
        setActive(links, prev);
      } else if (event.key === 'Enter' && currentIndex >= 0) {
        /* Only intercept Enter when the user has navigated into the
           results — otherwise allow the default form submit to reach
           the full-page /search results. */
        event.preventDefault();
        links[currentIndex].click();
      } else if (event.key === 'Escape') {
        clearActive(links);
      }
    });
  }

  function setActive(links, index) {
    clearActive(links);
    var link = links[index];
    if (!link) return;
    link.classList.add('is-active');
    link.setAttribute('aria-selected', 'true');
    /* Scroll the result into view if the list is tall enough to
       overflow its container. `block: 'nearest'` avoids a jumpy
       center-scroll on short result lists. */
    if (typeof link.scrollIntoView === 'function') {
      link.scrollIntoView({ block: 'nearest' });
    }
  }

  function clearActive(links) {
    for (var i = 0; i < links.length; i++) {
      links[i].classList.remove('is-active');
      links[i].removeAttribute('aria-selected');
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
       from the document. */
    var input = document.getElementById('search-input');
    var resultsContainer = document.getElementById('predictive-search-results');
    if (!input || !resultsContainer) return;
    if (!window.Kitchero || !Kitchero.routes || !Kitchero.routes.predictiveSearch) return;

    bindInput(input, resultsContainer);
    bindPills(input, resultsContainer, root);
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
