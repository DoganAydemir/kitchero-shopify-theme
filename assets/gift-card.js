/**
 * Gift card copy-to-clipboard handler.
 *
 * Moved here from an inline <script> in templates/gift_card.liquid per the
 * CLAUDE.md rule that inline scripts only belong in Liquid when they are
 * strictly a Liquid-to-JS config payload. The success-label string the
 * button shows after a successful copy now travels via a
 * `data-success-label` attribute on the button, so the JS can live in a
 * deferrable asset and still pick up the merchant's localized copy.
 *
 * Behaviour: clicks on `[data-gift-card-copy]` focus + select the input
 * identified by the attribute's value, copy its contents to the clipboard
 * (Clipboard API when available, `execCommand('copy')` as fallback), and
 * briefly swap the button's label element to the success string before
 * restoring the original after 1.8s.
 */
(function () {
  'use strict';

  function init() {
    var button = document.querySelector('[data-gift-card-copy]');
    if (!button || button.__giftCardCopyBound) return;
    button.__giftCardCopyBound = true;

    var targetId = button.getAttribute('data-gift-card-copy');
    var input = document.getElementById(targetId);
    if (!input) return;

    var label = button.querySelector('.kt-gift-card__copy-text');
    var originalLabel = label ? label.textContent : '';
    var successLabel = button.getAttribute('data-success-label') || originalLabel;

    button.addEventListener('click', function () {
      input.focus();
      input.select();
      try {
        if (navigator.clipboard && navigator.clipboard.writeText) {
          navigator.clipboard.writeText(input.value);
        } else {
          document.execCommand('copy');
        }
        if (label) label.textContent = successLabel;
        button.classList.add('kt-gift-card__copy--success');
        setTimeout(function () {
          if (label) label.textContent = originalLabel;
          button.classList.remove('kt-gift-card__copy--success');
        }, 1800);
      } catch (e) {
        /* Clipboard blocked (no-permission iframe, insecure context) —
           the browser's native select + Ctrl+C still works as fallback. */
      }
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
