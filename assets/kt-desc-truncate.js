/* Description Truncate Toggle.
 *
 * Swaps between the server-rendered truncated preview and the
 * full description body. Handles multiple instances on the same
 * page (PDP + featured-product block could both use the
 * description block).
 *
 * Markup contract (rendered by main-product.liquid +
 * main-product-showroom.liquid):
 *   <div data-desc-truncate>
 *     <div data-desc-short>truncated text…</div>
 *     <div data-desc-full rte hidden>full text</div>
 *     <button data-desc-toggle aria-expanded="false">
 *       <span data-desc-toggle-more>Read more</span>
 *       <span data-desc-toggle-less hidden>Read less</span>
 *     </button>
 *   </div>
 */
(function () {
  'use strict';

  function initToggle(container) {
    if (!container || container._kitcheroDescTruncateInited) return;
    container._kitcheroDescTruncateInited = true;

    var shortEl = container.querySelector('[data-desc-short]');
    var fullEl = container.querySelector('[data-desc-full]');
    var toggleBtn = container.querySelector('[data-desc-toggle]');
    var moreLabel = container.querySelector('[data-desc-toggle-more]');
    var lessLabel = container.querySelector('[data-desc-toggle-less]');

    /* Bail if any required node is missing — defensive guard so a
       partial markup state (custom merchant overrides, future
       refactors) doesn't throw. */
    if (!shortEl || !fullEl || !toggleBtn || !moreLabel || !lessLabel) return;

    toggleBtn.addEventListener('click', function () {
      var expanded = toggleBtn.getAttribute('aria-expanded') === 'true';
      if (expanded) {
        /* Collapse */
        fullEl.hidden = true;
        shortEl.hidden = false;
        moreLabel.hidden = false;
        lessLabel.hidden = true;
        toggleBtn.setAttribute('aria-expanded', 'false');
        /* Scroll the container's top edge into view so the user
           lands at the start of the description, not somewhere
           halfway down the full text. `scrollIntoView({ behavior:
           'smooth' })` does NOT automatically honor `prefers-
           reduced-motion` — the browser only consults the media
           query for CSS `scroll-behavior`, not for the JS API. We
           branch explicitly on `matchMedia('(prefers-reduced-
           motion: reduce)')` to fall back to `behavior: 'auto'`
           (instant scroll) for users who set the system
           preference. WCAG 2.3.3 (Animation from Interactions). */
        container.scrollIntoView({ behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth', block: 'nearest' });
      } else {
        /* Expand */
        shortEl.hidden = true;
        fullEl.hidden = false;
        moreLabel.hidden = true;
        lessLabel.hidden = false;
        toggleBtn.setAttribute('aria-expanded', 'true');
      }
    });
  }

  function init(root) {
    var scope = root || document;
    var containers = scope.querySelectorAll('[data-desc-truncate]');
    Array.prototype.forEach.call(containers, initToggle);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', function () { init(); });
  } else {
    init();
  }

  document.addEventListener('shopify:section:load', function (e) {
    init(e.target);
  });
})();
