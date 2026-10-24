(function () {
  'use strict';

  var sectionControllers = new WeakMap();

  function fetchRecommendations(section) {
    var url = section.getAttribute('data-url');
    if (!url) return;

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
          return;
        }

        var freshGrid = freshSection.querySelector('.kt-related__grid');
        var hasProducts = freshGrid && freshGrid.querySelector('.kt-card-product');

        if (!hasProducts) {
          section.setAttribute('hidden', '');
          return;
        }

        section.innerHTML = freshSection.innerHTML;
      })
      .catch(function (error) {
        if (error && error.name === 'AbortError') return;
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

  document.addEventListener('shopify:section:load', function (event) {
    initAll(event.target);
  });

  document.addEventListener('shopify:section:unload', function (event) {
    if (!event.target || !event.target.querySelectorAll) return;
    var sections = event.target.querySelectorAll('[data-product-recommendations]');
    for (var i = 0; i < sections.length; i++) {
      var ctrl = sectionControllers.get(sections[i]);
      if (ctrl) {
        try { ctrl.abort(); } catch (_) {  }
        sectionControllers.delete(sections[i]);
      }
    }
  });
})();
