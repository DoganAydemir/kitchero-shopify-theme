/**
 * Gift card template client logic.
 *
 * Three responsibilities:
 *   1. Copy-to-clipboard — click on [data-gift-card-copy] copies the gift
 *      card code to the clipboard (Clipboard API, with execCommand fallback)
 *      and briefly swaps the button label to the localized success string.
 *   2. QR code rendering — draws a scannable QR code encoding
 *      `gift_card.qr_identifier` into the [data-gift-card-qr] container,
 *      using Shopify's first-party vendor/qrcode.js bundle loaded in the
 *      template. The container's data-identifier + data-alt-text attributes
 *      carry the Liquid-rendered values.
 *   3. Print button — click on [data-gift-card-print] invokes window.print()
 *      so customers can print the gift card. The template CSS already has
 *      a @media print block that hides the action buttons and keeps the
 *      card artwork + code + QR visible.
 *
 * All three behaviours are wired in a single IIFE so the script can be
 * deferred and still pick up everything after DOMContentLoaded. The QR
 * library is loaded with `defer` alongside this file, so we retry once on
 * a requestAnimationFrame tick if `window.QRCode` isn't ready yet (rare
 * race between two deferred scripts on very slow connections).
 */
(function () {
  'use strict';

  function bindCopy() {
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

  function bindPrint() {
    var buttons = document.querySelectorAll('[data-gift-card-print]');
    for (var i = 0; i < buttons.length; i++) {
      (function (btn) {
        if (btn.__giftCardPrintBound) return;
        btn.__giftCardPrintBound = true;
        btn.addEventListener('click', function () {
          if (typeof window.print === 'function') window.print();
        });
      })(buttons[i]);
    }
  }

  function renderQR() {
    var host = document.querySelector('[data-gift-card-qr]');
    if (!host || host.__giftCardQrRendered) return;
    var identifier = host.getAttribute('data-identifier');
    if (!identifier) return;

    if (typeof window.QRCode !== 'function') {
      /* QR vendor script still loading — try again on the next frame. The
         deferred vendor script should be ready within 1–2 frames. After a
         short retry budget we give up silently; the gift card still works
         without the QR (customer can type the code). */
      if (host.__giftCardQrRetries === undefined) host.__giftCardQrRetries = 0;
      if (host.__giftCardQrRetries < 30) {
        host.__giftCardQrRetries += 1;
        window.requestAnimationFrame(renderQR);
      }
      return;
    }

    try {
      /* eslint-disable no-new */
      new window.QRCode(host, {
        text: identifier,
        width: 160,
        height: 160,
        imageAltText: host.getAttribute('data-alt-text') || ''
      });
      host.__giftCardQrRendered = true;
    } catch (e) {
      /* If the vendor lib throws (rare: invalid identifier, OOM), leave
         the container empty. The code + copy button stay usable. */
    }
  }

  function init() {
    bindCopy();
    bindPrint();
    renderQR();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
