# Theme Store Compliance — Historical Audit Record

> **Purpose:** Historical record of the Theme-Store-blocking issues
> discovered during the early submission-prep audits and how each was
> resolved. Live source-of-truth for current rule compliance lives in
> [`THEME_STORE_RULES_OFFICIAL.md`](../THEME_STORE_RULES_OFFICIAL.md)
> (160-rule master checklist) and [`REJECT_RULES.md`](../REJECT_RULES.md)
> (the active reject-vector sweep ruleset).
>
> **Architecture statement:** The theme is built on Shopify Skeleton —
> the only approved baseline for new Theme Store submissions. No Dawn
> or Horizon code, markup, CSS classes, comment text, or naming
> conventions are referenced anywhere in the codebase (verified across
> R110–R117 reject-vector sweeps, all clean).

---

## Status snapshot

`shopify theme check` passes with **zero offenses** on 165 files
against the `theme-check:recommended` ruleset.

The 12 original audit tasks tracked in this document have all been
resolved or superseded by later rounds. The file is retained as an
audit-trail receipt — current compliance status is verified per-round
in commit history (`git log --grep='reject-prevention'`) and
annotated in `THEME_STORE_RULES_OFFICIAL.md`.

| # | Task | Status |
|---|------|--------|
| 1 | `@app` render handlers in header/footer/main-cart | ✅ Resolved |
| 2 | activate_account + reset_password sections with form tags | ✅ Resolved (sections + 5-locale parity) |
| 3 | `.theme-check.yml` → `theme-check:recommended` ruleset | ✅ Resolved |
| 4 | `outline: none` a11y fixes paired with `:focus-visible` | ✅ Resolved across all `kt-*.css` and section CSS files |
| 5 | Lighthouse CI workflow | ✅ Resolved (`.github/workflows/lighthouse.yml`) |
| 6 | Strip pre-built `*.zip` from repo | ✅ Resolved (deleted; `.gitignore` covers zips) |
| 7 | `theme_support_email` field | ⏭ Skipped — not a valid `theme_info` key per Theme Check ValidJSON rule; only `theme_support_url` is set |
| 8 | Empty `<img src="">` in JS-populated lightboxes | ✅ Resolved (transparent-pixel data URI placeholder) |
| 9 | `sections/featured-product.liquid` with @app block | ✅ Resolved (section + CSS + 5-locale parity) |
| 10 | Address country `<select>` autocomplete token | ✅ Resolved (R117: `country` → `country-name` for spec-correct match) |
| 11 | Settings preset declared with at least one named entry | ✅ Resolved (single `Kitchero` preset, name takes parent theme name per Shopify rule) |
| 12 | Locale schema strings (en/tr/de/fr/es) | ✅ Resolved (same keys in all 5 locales) |

---

## Final gate (current criteria)

Before resubmitting:
1. `shopify theme check` → 0 offenses (recommended ruleset), enforced in CI.
2. Lighthouse CI on the demo store → performance ≥ 60, accessibility ≥ 90.
3. Manual theme-editor walk-through of every template and the customer forms.
4. Every item in the October 2026 audit is closed in
   `Claude outputs/KITCHERO_FIX_TRACKER.md`.
