/**
 * Password match — client-side match check for the reset-password and
 * activate-account flows.
 *
 * The confirm-password input carries `data-password-match="<id>"`
 * pointing at the primary password field. On each change + the form's
 * submit, we run a match test and:
 *
 *   - On mismatch: call setCustomValidity() with the localized
 *     message from `data-mismatch-message` so the browser's native
 *     validation surface (and screen readers) picks it up, and
 *     preventDefault() on submit so the form doesn't POST.
 *   - On match: clear the custom validity so the form can submit
 *     normally.
 *
 * Using setCustomValidity() means we don't need a separate visible
 * error element — the browser already paints a tooltip on the invalid
 * input, and screen readers announce the constraint violation when
 * the user lands on the field. The server-side error rendering
 * (form.errors['password_confirmation']) remains as the
 * authoritative fallback for any edge case the client check missed.
 *
 * Progressive enhancement: when JS is disabled the form posts with
 * whatever values the customer typed; Shopify's backend still checks
 * match and returns the usual error. Feature loss is only the
 * instant feedback.
 */
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
