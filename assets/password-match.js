(function () {
  'use strict';

  function bind(confirmInput) {
    if (!confirmInput || confirmInput.__ktPasswordMatchBound) return;
    confirmInput.__ktPasswordMatchBound = true;

    var primaryId = confirmInput.getAttribute('data-password-match');
    if (!primaryId) return;
    var primary = document.getElementById(primaryId);
    if (!primary) return;

    var message = confirmInput.getAttribute('data-mismatch-message') || 'Passwords do not match.';

    function check() {
      if (confirmInput.value && primary.value && confirmInput.value !== primary.value) {
        confirmInput.setCustomValidity(message);
      } else {
        confirmInput.setCustomValidity('');
      }
    }

    confirmInput.addEventListener('input', check);
    primary.addEventListener('input', check);

    var form = confirmInput.closest('form');
    if (form) {
      form.addEventListener('submit', function (event) {
        check();
        if (!confirmInput.checkValidity()) {
          event.preventDefault();
          confirmInput.reportValidity();
        }
      });
    }
  }

  function init(scope) {
    var inputs = (scope || document).querySelectorAll('[data-password-match]');
    for (var i = 0; i < inputs.length; i++) bind(inputs[i]);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', function () { init(document); });
  } else {
    init(document);
  }

  document.addEventListener('shopify:section:load', function (event) {
    init(event.target || document);
  });
})();
