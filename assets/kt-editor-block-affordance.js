(function () {
  'use strict';

  if (typeof Shopify === 'undefined' || !Shopify.designMode) return;

  var SELECTED_CLASS = 'kt-editor-selected';

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

  function findBlockElement(event) {
    var sectionRoot = event.target;
    var blockId = event.detail && event.detail.blockId;
    if (!sectionRoot || !blockId) return null;

    var escapedId = (window.CSS && CSS.escape)
      ? CSS.escape(blockId)
      : String(blockId).replace(/"/g, '\\"');
    return sectionRoot.querySelector('[data-block-id="' + escapedId + '"]');
  }

  function getStickyHeaderOffset() {
    var offset = 0;
    var header = document.querySelector('.shopify-section-header, .kt-header, [data-section-type="header"]');
    if (header) {
      var rect = header.getBoundingClientRect();

      var computed = window.getComputedStyle(header);
      var pinned = (computed.position === 'sticky' || computed.position === 'fixed') && rect.top <= 1;
      if (pinned) offset = rect.height;
    }
    return offset;
  }

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
    var targetY = currentScroll + rect.top - headerOffset - 24;
    if (targetY < 0) targetY = 0;
    var prefersReduced = reduceMotionMQ && reduceMotionMQ.matches;
    try {
      window.scrollTo({
        top: targetY,
        behavior: prefersReduced ? 'auto' : 'smooth'
      });
    } catch (err) {
      window.scrollTo(0, targetY);
    }
  }

  document.addEventListener('shopify:block:select', function (event) {
    var blockEl = findBlockElement(event);
    if (!blockEl) return;

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
})();
