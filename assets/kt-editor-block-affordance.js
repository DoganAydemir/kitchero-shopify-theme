/**
 * Kitchero Theme — Theme-editor block affordance.
 *
 * Theme Store reviewers walk the section blocks list in the theme editor
 * and click each block to verify it gets visible feedback. Slider /
 * accordion / tab sections already have dedicated `shopify:block:select`
 * handlers that goTo a slide, open a <details>, etc. (see
 * `kt-section-hero.js`, `kt-section-collapsible-accordion.js`,
 * `kt-section-testimonials-pullquote.js`, …).
 *
 * For the rest — content sections whose blocks render as inert cards
 * inside a grid (brands, multicolumn, why-choose-us, deals-grid, trust
 * stats, rich-text rows, partner cards, image-with-text rows, PDP
 * blocks, etc.) — there is no slide to navigate to. Without a handler
 * the merchant clicks a block in the editor sidebar and nothing
 * happens; Theme Store flags this as "blocks not selectable in the
 * editor".
 *
 * This file provides the universal fallback: when a block is selected
 * in the editor, find the rendered `[data-block-id="<id>"]` element
 * (Shopify emits this attribute on any element rendered with
 * `{{ block.shopify_attributes }}`) and:
 *
 *   1. Smoothly scroll it into view, accounting for the sticky header
 *      offset so the block doesn't end up hidden under the editor's
 *      preview toolbar or the storefront header.
 *   2. Add a `kt-editor-selected` class for a brief visual outline so
 *      the merchant has a clear "yes, you selected this" signal.
 *   3. Remove the class on `shopify:block:deselect`.
 *
 * Design constraints honoured:
 *   - Only runs in the editor (`Shopify.designMode === true`). Has zero
 *     cost on the live storefront — the listener is never registered
 *     when the editor is not active.
 *   - Co-exists with section-specific handlers. Those run first (their
 *     `closest('[data-section-type="hero"]')` check matches their own
 *     section); ours runs in addition and only scrolls if the element
 *     is outside the viewport. If a slider's `goTo` has already brought
 *     the slide into the visible area, we skip scrolling and just
 *     apply the outline.
 *   - Respects `prefers-reduced-motion`: falls back to instant scroll.
 *   - Vanilla JS, no framework, defer-loaded.
 */

(function () {
  'use strict';

  // Bail entirely on the live storefront — `Shopify.designMode` is
  // only true inside the theme editor preview iframe. Without this
  // guard the listener stays attached for every shopper, which is
  // wasted work even though the event never fires.
  if (typeof Shopify === 'undefined' || !Shopify.designMode) return;

  var SELECTED_CLASS = 'kt-editor-selected';
  // Inject the visual-outline CSS once so we don't depend on every
  // component stylesheet shipping its own rule. Editor-only payload,
  // so the bytes never touch the live storefront.
  var styleEl = document.createElement('style');
  styleEl.id = 'kt-editor-block-affordance-style';
  styleEl.textContent =
    '.' + SELECTED_CLASS + '{' +
      'outline:2px dashed rgba(120,120,255,0.85);' +
      'outline-offset:6px;' +
      'transition:outline-color 200ms ease;' +
    '}' +
    '@media (prefers-reduced-motion: reduce){.' + SELECTED_CLASS + '{transition:none;}}';
  if (document.head) document.head.appendChild(styleEl);

  var reduceMotionMQ = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)');

  /**
   * Find the rendered block element for a Shopify editor event.
   * Shopify dispatches the event with `event.target` set to the
   * section root and `event.detail.blockId` set to the block id; the
   * actual DOM element we want is whichever descendant carries
   * `data-block-id="<id>"` (emitted automatically by
   * `block.shopify_attributes`).
   */
  function findBlockElement(event) {
    var sectionRoot = event.target;
    var blockId = event.detail && event.detail.blockId;
    if (!sectionRoot || !blockId) return null;
    // CSS.escape guards against block ids that contain characters
    // which would otherwise break the attribute selector (Shopify
    // block ids are alphanumeric + hyphen in practice, but the spec
    // does not forbid quotes, so be defensive).
    var escapedId = (window.CSS && CSS.escape)
      ? CSS.escape(blockId)
      : String(blockId).replace(/"/g, '\\"');
    return sectionRoot.querySelector('[data-block-id="' + escapedId + '"]');
  }

  /**
   * Measure the height of any sticky/fixed header so we can offset
   * the scroll target. Without this, a block that lands at viewport
   * top sits hidden behind the announcement bar + sticky header in
   * the editor preview.
   */
  function getStickyHeaderOffset() {
    var offset = 0;
    var header = document.querySelector('.shopify-section-header, .kt-header, [data-section-type="header"]');
    if (header) {
      var rect = header.getBoundingClientRect();
      // Only add the header height if it is actually pinned to the
      // top — a scrolled-away non-sticky header should not be
      // counted. `position: sticky` reports `rect.top === 0` once
      // stuck; `position: fixed` always does. Either way, `rect.top
      // <= 1` means it is currently overlapping the viewport top.
      var computed = window.getComputedStyle(header);
      var pinned = (computed.position === 'sticky' || computed.position === 'fixed') && rect.top <= 1;
      if (pinned) offset = rect.height;
    }
    return offset;
  }

  /**
   * Decide whether the block is sufficiently visible. If a
   * section-specific handler (slider, accordion) has already brought
   * it into the viewport, skip the scroll to avoid jank. Threshold:
   * at least 50% of the block height intersecting the visible area
   * below the sticky header.
   */
  function isBlockVisible(el) {
    var rect = el.getBoundingClientRect();
    var headerOffset = getStickyHeaderOffset();
    var visibleTop = Math.max(rect.top, headerOffset);
    var visibleBottom = Math.min(rect.bottom, window.innerHeight || document.documentElement.clientHeight);
    var visibleHeight = visibleBottom - visibleTop;
    if (visibleHeight <= 0) return false;
    var threshold = Math.min(rect.height * 0.5, 240);
    return visibleHeight >= threshold;
  }

  function scrollBlockIntoView(el) {
    var headerOffset = getStickyHeaderOffset();
    var rect = el.getBoundingClientRect();
    var currentScroll = window.pageYOffset || document.documentElement.scrollTop;
    var targetY = currentScroll + rect.top - headerOffset - 24; // 24 px breathing room
    if (targetY < 0) targetY = 0;
    var prefersReduced = reduceMotionMQ && reduceMotionMQ.matches;
    try {
      window.scrollTo({
        top: targetY,
        behavior: prefersReduced ? 'auto' : 'smooth'
      });
    } catch (err) {
      // Older browsers without options-object support
      window.scrollTo(0, targetY);
    }
  }

  document.addEventListener('shopify:block:select', function (event) {
    var blockEl = findBlockElement(event);
    if (!blockEl) return;
    // Outline first so the highlight is in place by the time the
    // smooth-scroll arrives. Reapplying the class is idempotent.
    blockEl.classList.add(SELECTED_CLASS);
    if (!isBlockVisible(blockEl)) {
      scrollBlockIntoView(blockEl);
    }
  });

  document.addEventListener('shopify:block:deselect', function (event) {
    var blockEl = findBlockElement(event);
    if (!blockEl) return;
    blockEl.classList.remove(SELECTED_CLASS);
  });

  // When a section reloads in the editor (a setting change triggers a
  // re-render), the previously-selected block element is replaced by
  // a fresh DOM node; the class doesn't carry over. The editor will
  // refire `shopify:block:select` for the still-selected block, so
  // there is nothing to do here — but we explicitly document the
  // behaviour so future maintenance does not "fix" the absence of a
  // section:load handler that is intentionally not needed.
})();
