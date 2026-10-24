(function () {
  'use strict';

  function initSection(section) {
    if (!section || section.dataset.addressesInit === 'true') return;
    section.dataset.addressesInit = 'true';

    var selects = section.querySelectorAll('select[id^="AddressCountry"]');
    selects.forEach(function (countrySelect) {
      var match = countrySelect.id.match(/AddressCountry(.*)$/);
      if (!match) return;
      var suffix = match[1];
      var provinceSelect = section.querySelector('#AddressProvince' + suffix);
      if (!provinceSelect) return;

      var provinceField = provinceSelect.closest('[data-province-field]');

      function updateProvinces() {
        var selectedOption = countrySelect.options[countrySelect.selectedIndex];
        var provinces = selectedOption ? selectedOption.getAttribute('data-provinces') : '[]';
        var parsed = [];
        try { parsed = JSON.parse(provinces || '[]'); } catch (e) { parsed = []; }

        provinceSelect.innerHTML = '';
        if (!parsed.length) {
          if (provinceField) provinceField.hidden = true;

          provinceSelect.disabled = true;
          return;
        }
        if (provinceField) provinceField.hidden = false;

        provinceSelect.disabled = false;
        var defaultValue = provinceSelect.getAttribute('data-default') || '';
        parsed.forEach(function (pair) {
          var opt = document.createElement('option');
          opt.value = pair[0];
          opt.textContent = pair[1];
          if (pair[0] === defaultValue) opt.selected = true;
          provinceSelect.appendChild(opt);
        });
      }

      var defaultCountry = countrySelect.getAttribute('data-default');
      if (defaultCountry) {
        for (var i = 0; i < countrySelect.options.length; i++) {
          if (countrySelect.options[i].value === defaultCountry) {
            countrySelect.selectedIndex = i;
            break;
          }
        }
      }
      updateProvinces();
      countrySelect.addEventListener('change', updateProvinces);
    });

    var newBtn = section.querySelector('[data-addresses-toggle-new]');
    var newForm = section.querySelector('[data-new-form]');
    if (newBtn && newForm) {
      newBtn.addEventListener('click', function () {
        var open = !newForm.hidden;
        newForm.hidden = open;
        newBtn.setAttribute('aria-expanded', String(!open));
        if (!open) {
          var firstField = newForm.querySelector('input, select, textarea');
          if (firstField) firstField.focus();
        }
      });
      var newCancel = newForm.querySelector('[data-addresses-cancel-new]');
      if (newCancel) {
        newCancel.addEventListener('click', function () {
          newForm.hidden = true;
          newBtn.setAttribute('aria-expanded', 'false');
          newBtn.focus();
        });
      }
    }

    section.querySelectorAll('[data-addresses-toggle-edit]').forEach(function (btn) {
      var id = btn.getAttribute('data-addresses-toggle-edit');
      var form = section.querySelector('[data-edit-form="' + id + '"]');
      if (!form) return;
      btn.addEventListener('click', function () {
        var open = !form.hidden;
        form.hidden = open;
        btn.setAttribute('aria-expanded', String(!open));
        if (!open) {
          var firstField = form.querySelector('input, select, textarea');
          if (firstField) firstField.focus();
        }
      });
      var cancel = form.querySelector('[data-addresses-cancel-edit]');
      if (cancel) {
        cancel.addEventListener('click', function () {
          form.hidden = true;
          btn.setAttribute('aria-expanded', 'false');
          btn.focus();
        });
      }
    });

    section.querySelectorAll('[data-addresses-delete]').forEach(function (btn) {
      var form = btn.closest('form');
      if (!form) return;
      form.addEventListener('submit', function (e) {
        var msg = btn.getAttribute('data-confirm-message') || '';
        if (msg && !confirm(msg)) {
          e.preventDefault();
        }
      });
    });
  }

  function initAll() {
    document.querySelectorAll('[data-section-id]').forEach(function (el) {
      if (el.querySelector('[data-new-form], [data-edit-form]')) initSection(el);
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initAll);
  } else {
    initAll();
  }

  document.addEventListener('shopify:section:load', function (event) {
    initSection(event.target.querySelector('[data-section-id]') || event.target);
  });
  document.addEventListener('shopify:section:unload', function (event) {
    var root = event.target.querySelector('[data-section-id]');
    if (root) root.dataset.addressesInit = '';
  });
})();
