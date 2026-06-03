# Kitchero — Branch & Demo Content Workflow

This repo ships **two long-lived branches** to keep the Theme Store
submission clean while still letting us run a polished demo store.
Read this once before adding any merchant-facing content or running a
push to Shopify.

---

## TL;DR

| Branch | Purpose | Pushes to | Allowed to contain |
|--------|---------|-----------|---------------------|
| `main` | Theme Store submission baseline | `kitchero-prod` (live) when ready | Generic placeholders, niche-neutral defaults, audited code |
| `demo` | Demo store content + presentation | `kitchero-demo` (separate store / unpublished theme) | Real testimonials, real product handles, real brand names, polished copy |

**Rule of thumb:** if a string would embarrass a fresh-install merchant
who doesn't sell cabinets / kitchens / a specific brand, it lives on
`demo` — never on `main`.

---

## Branch Topology

```
                ┌── tag: submit-ready-2026-06-04
                │
   main  ─────●─────●─────●  ── (only generic/scrubbed commits)
              │                  ↑
              │       │  cherry-pick generic fixes upstream
              │       │
              └──→──● ●───●───●──  demo  (real content, free-form)
                                 ↑
                            push to demo store
```

- `main` only ever accepts commits that would be safe on any merchant's
  fresh install. Niche-lock copy, real brand names, fake stats, and
  identifiable testimonials are blocked by the same scrub rules that
  `REJECT_RULES.md` enforces.
- `demo` is forked from `main` and may diverge freely. When `main` ships
  a real code fix, cherry-pick or merge `main → demo` to pull it
  forward. Never merge `demo → main`.

---

## Day-to-Day Workflow

### Working on theme code (sections, snippets, CSS, JS)

```bash
git checkout main
# … edit files, run shopify theme check …
git commit -m "fix(section): …"
git push origin main
shopify theme push --theme "kitchero-v3" --allow-live   # if live store is the prod target
```

### Working on demo content (real testimonials, brand names, copy)

```bash
git checkout demo
git merge main                # pull latest theme code in
# … customise via Theme Editor on the demo store, or edit templates/*.json …
git commit -m "demo: … (NOT submit-safe)"
git push origin demo
shopify theme push --theme "kitchero-demo" --store=kitchero-demo.myshopify.com
```

The `demo:` prefix makes it easy to grep the log for content-only
commits when auditing what's on `main` vs `demo`.

### Submitting to Theme Store

The artifact you upload to the Partner Portal is a `.zip` of the
working tree on `main`. **Never zip `demo`.**

```bash
git checkout main
git pull origin main
shopify theme check     # must report 0 offenses
zip -r kitchero-submit.zip . -x "*.git*" "node_modules/*" ".DS_Store" "WORKFLOW.md"
# (WORKFLOW.md is a repo-internal doc; strip it from the submission zip
#  so the reviewer doesn't see the demo-branch reference.)
```

---

## What Lives Where

| Type of change | Branch |
|----------------|--------|
| New section / snippet / CSS / JS | `main` |
| Schema setting defaults (`"default": "Heading"`) | `main` — must stay generic |
| Locale string additions / translations | `main` |
| Theme-wide setting tweaks (color scheme, fonts, page width slider) | Either — Theme Store ships `settings_data.json` defaults, so be careful on `main` |
| `templates/index.json` with real testimonials/brands | `demo` only |
| `templates/page.about.json` / `page.contact.json` body copy | `demo` for real copy; `main` keeps placeholders |
| Real products / collections / customer accounts | Shopify Admin only (not in repo at all) |
| Brand metafields / metaobjects (testimonial / brand / faq) | Shopify Admin → demo store only |

---

## Shopify Admin Side

These belong in **Shopify Admin → demo store**, not in the repo:

- Products, collections, variants, inventory
- Customers, orders, customer testimonials
- Pages (the Body content; the template is in the repo)
- Articles (blog posts)
- Brand metaobjects, financing partner metaobjects, FAQ items
- Color scheme overrides per-store
- Logo, favicon, theme images uploaded as Files

When the merchant who installs Kitchero from the Theme Store opens
their fresh store, none of the above carries over — they see the
generic placeholders defined on `main`.

---

## Settings That Persist

These ARE bundled with the theme `.zip` and ship to every merchant:

- `config/settings_schema.json` — schema definitions (safe; structural)
- `config/settings_data.json` — current values of every setting
- `templates/*.json` — section instance and block configuration on every template
- `locales/*.json` and `locales/*.schema.json` — translations
- `assets/*` — CSS, JS, fonts, placeholder SVGs (NOT merchant-uploaded photos)
- `sections/*.liquid` / `snippets/*.liquid` / `layout/*.liquid`

Anything edited via Theme Editor lands in either `settings_data.json`
or `templates/*.json`. **Both are submit-bundled.** That's why we keep
real content on the `demo` branch only.

---

## Cherry-picking from `demo` back to `main`

Occasionally a code fix happens while you're on `demo` (you spot a CSS
bug while customising a section). Move that commit to `main`:

```bash
git log --oneline demo ^main                    # see what's only on demo
git checkout main
git cherry-pick <commit-sha>                    # bring just the fix
git push origin main
git checkout demo
git rebase main                                 # re-anchor demo on the new main
```

---

## Recovery: "I edited content directly on main"

If you accidentally commit real testimonials / brand names / niche-lock
copy onto `main`, recover with:

```bash
git checkout main
git log --oneline                               # find the bad commit SHA
git revert <commit-sha>                         # safe reset, preserves history
git push origin main
```

Then move the same change onto `demo`:

```bash
git checkout demo
git cherry-pick <original-bad-commit-sha>
git push origin demo
```

---

## Tags

- `submit-ready-2026-06-04` — the clean baseline before demo content
  work began. Use `git diff submit-ready-2026-06-04..main` to inspect
  what's drifted since the last verified submit-safe state.
- Future submit milestones tagged `submit-ready-YYYY-MM-DD`.

---

## See Also

- `CLAUDE.md` — coding conventions
- `REJECT_RULES.md` — Theme Store rejection patterns
- `PORT_PLAN.md` — original port roadmap
