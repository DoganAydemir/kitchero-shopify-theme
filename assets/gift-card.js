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
      if (host.__giftCardQrRetries === undefined) host.__giftCardQrRetries = 0;
      if (host.__giftCardQrRetries < 30) {
        host.__giftCardQrRetries += 1;
        window.requestAnimationFrame(renderQR);
      }
      return;
    }

    try {
      new window.QRCode(host, {
        text: identifier,
        width: 160,
        height: 160,
        imageAltText: host.getAttribute('data-alt-text') || ''
      });
      host.__giftCardQrRendered = true;
    } catch (e) {
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
