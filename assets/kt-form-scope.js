/**
 * Contact-form feedback scoping.
 *
 * Shopify's `form.posted_successfully?` (and `form.errors`) are PAGE-GLOBAL:
 * after any {% form 'contact' %} submit, every contact form on the page
 * renders its success/error banner — so a page with two contact forms (the
 * showroom "Book a studio visit" form and the consultation lead drawer)
 * would show feedback on BOTH, even though only one was submitted.
 *
 * Shopify appends the submitted form's `id` to the URL as a fragment
 * (e.g. `#appointment-form` or `#visualize-studio-form`). We use that to
 * hide any feedback banner whose owning form id doesn't match — feedback
 * stays only on the form that was actually submitted.
 *
 * Markup contract: tag each success/error banner with
 *   data-contact-feedback="<the form's id>"
 * Forms must render their fields unconditionally (banner sits above the
 * fields) so hiding the banner never leaves an empty form.
 */
(function () {
  'use strict';

  function scopeFeedback() {
    var current = (window.location.hash || '').replace('#', '');
    var nodes = document.querySelectorAll('[data-contact-feedback]');
    for (var i = 0; i < nodes.length; i++) {
      var owner = nodes[i].getAttribute('data-contact-feedback');
      /* Only hide when there IS a fragment and it belongs to a DIFFERENT
         form. If the fragment is missing (rare), leave everything as
         server-rendered so a real submission never loses its feedback. */
      if (current && owner !== current) {
        nodes[i].hidden = true;
        nodes[i].style.display = 'none';
      }
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', scopeFeedback);
  } else {
    scopeFeedback();
  }
})();
