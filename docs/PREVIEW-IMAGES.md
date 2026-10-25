# Listing images

Images uploaded with the Theme Store submission (audit #83). They are taken
from the live demo store, never mocked.

## Required images

| Slot | Size | File |
|---|---|---|
| Desktop home page | 2000 x 2496 (or 1000 x 1248) | `kitchero-home-desktop-2000x2496.png` |
| Mobile home page | 750 x 1334 | `kitchero-home-mobile-750x1334.png` |
| Key highlight 1 | 1600 x 1200 | `kitchero-highlight-1-shop-the-look-1600x1200.png` |
| Key highlight 2 | 1600 x 1200 | `kitchero-highlight-2-shop-by-color-1600x1200.png` |
| Key highlight 3 | 1600 x 1200 | `kitchero-highlight-3-showroom-1600x1200.png` |

Every image needs alt text in the listing form. Titles, descriptions and alt
text are in [`THEME-STORE-LISTING.md`](./THEME-STORE-LISTING.md).

Rules:

- No browser chrome, cookie banners, pop-ups or the preview bar.
- Real demo store content only; no stretched or upscaled screenshots.
- Use the same store content shown to reviewers.

## How the images are made

The `Listing screenshots` workflow (`.github/workflows/listing-shots.yml`)
runs `.github/scripts/listing_shots.py` with Playwright:

1. Logs in to the password-protected demo store with the
   `SHOP_STORE_PASSWORD` secret.
2. Hides the cookie banner, newsletter pop-up, age gate and preview bar.
3. Scrolls the page once so lazy images and scroll animations finish.
4. Captures the desktop home page at 1250 x 1560 (1.6x), mobile at 375 x 667 (2x,
   iPhone user agent) and highlights at 1200 x 900 (1.33x, header hidden).
5. Commits the PNG files to the `listing-assets` branch, so they stay out of
   `main` and the theme zip.

Run it from **Actions > Listing screenshots > Run workflow**, then check the
images on the `listing-assets` branch before uploading.

## When to retake

Retake after any change to the home page, the shop-the-look or shop-by-color
sections, the premium product page or the demo store's catalog.
