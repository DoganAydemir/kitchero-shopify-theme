/*
 * Product detail tabs (default PDP).
 *
 * Enhances the full-width detail set into a WAI-ARIA tab interface:
 * one tablist of role="tab" buttons + role="tabpanel" panels. The
 * markup ships with the first panel visible and the rest `hidden`; with
 * JS disabled the `.no-js` stylesheet rules reveal every panel and hide
 * the tab bar, so all content stays reachable (progressive enhancement).
 *
 * Keyboard: Left/Right (and Up/Down) move between tabs, Home/End jump to
 * the ends, focus follows selection — the standard tabs pattern.
 * Editor: re-inits on shopify:section:load and activates the matching
 * tab on shopify:block:select.
 */
(function () {
  function initTabs(root) {
    if (root.__ktTabsReady) return;
    var tabs = Array.prototype.slice.call(root.querySelectorAll('[role="tab"]'));
    if (!tabs.length) return;

    function select(tab, focus) {
      for (var i = 0; i < tabs.length; i++) {
        var t = tabs[i];
        var on = t === tab;
        t.setAttribute('aria-selected', on ? 'true' : 'false');
        t.tabIndex = on ? 0 : -1;
        var panel = document.getElementById(t.getAttribute('aria-controls'));
        if (panel) { panel.hidden = !on; }
      }
      if (focus) { tab.focus(); }
    }

    tabs.forEach(function (tab) {
      tab.addEventListener('click', function () { select(tab, false); });
      tab.addEventListener('keydown', function (e) {
        var i = tabs.indexOf(tab);
        var next = null;
        if (e.key === 'ArrowRight' || e.key === 'ArrowDown') { next = tabs[(i + 1) % tabs.length]; }
        else if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') { next = tabs[(i - 1 + tabs.length) % tabs.length]; }
        else if (e.key === 'Home') { next = tabs[0]; }
        else if (e.key === 'End') { next = tabs[tabs.length - 1]; }
        if (next) { e.preventDefault(); select(next, true); }
      });
    });

    // Expose for the editor block:select hook.
    root.__ktTabsSelect = select;
    root.__ktTabsReady = true;
  }

  function initAll(scope) {
    var roots = (scope || document).querySelectorAll('[data-kt-pdp-tabs]');
    for (var i = 0; i < roots.length; i++) { initTabs(roots[i]); }
  }

  if (document.readyState !== 'loading') { initAll(); }
  else { document.addEventListener('DOMContentLoaded', function () { initAll(); }); }

  // Theme editor compatibility.
  document.addEventListener('shopify:section:load', function (e) { initAll(e.target); });
  document.addEventListener('shopify:block:select', function (e) {
    var el = e.target;
    var tab = el && el.matches && el.matches('[role="tab"]')
      ? el
      : (el && el.querySelector ? el.querySelector('[role="tab"]') : null);
    if (!tab) { return; }
    var root = tab.closest('[data-kt-pdp-tabs]');
    if (root && root.__ktTabsSelect) { root.__ktTabsSelect(tab, false); }
  });
})();
