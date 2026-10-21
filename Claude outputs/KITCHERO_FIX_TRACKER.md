# Kitchero — Theme Store Audit Fix Tracker (v2, doğrulanmış)

Kaynak: `KITCHERO_Audit.pdf` (20.10.2026, kitchero-kitchen.myshopify.com, tema 1.0.0), 83 madde.
Bu listede raporun 83 maddesinin tamamı var. Raporun dışında bulduklarımız **E1–E6** olarak eklendi.
Her madde repoda tek tek kontrol edildi; kök neden ve dosya yolu yazıldı. Bazı maddeler sadece canlı mağazada ölçülebiliyor; onlar "runtime" olarak işaretli.

**Konum:** `main` = submission zip (gönderilen zip, `main` ile birebir aynı) · `demo` = demo branch + demo mağaza · `admin` = Shopify Admin içeriği · `karar` = iş kararı · `test` = veri/ortam gerektiren test
**Durum:** ☐ açık · ◐ devam · ☑ kapandı · ⊘ karar bekliyor

> Kritik not 1: `demo` branch, `main`'deki son code fix'lerin gerisinde. Demo mağaza daha eski kodla çalışıyor. Her code fix sonrası `main → demo` merge edilip demo mağazaya push edilmeli.
> Kritik not 2: Bazı "demo" maddeleri `main` default'larında da var (#15, #16, #40, #47, #62). Bunlar iki tarafta da düzeltilecek.
> Tema içindeki tüm metinler American English olacak.

---

## Uygulama sırası (kolaydan zora, bağımlılıklar gözetilerek)

**Paralel yürüyecek, Faz 0 kararları (yönetici onayı bekleyenler):** #18, #65 · E16 (GSAP lisans/sürüm kararı, Seviye 3'te sunulacak) · #19 detay istişaresi · #80 görsel taraması
**Seviye 1 durumu (21.10):** kod tarafı tamamlandı. Kalan: E4/E5 (doküman güncellemesi, kod bittikten sonra). Demo tarafları Faz 2'de.
**Seviye 1, default ve tek satırlık düzeltmeler:** E1, #4, #51, #26, #24, #52, #53, #23, #22, #25, #33, #82, #39, #35, #16, #40, #47, #15, #62 (main default'ları), #14, #63 (kod kısmı), E2, E4, E5, E6, E13 (kod kısmı)
**Seviye 2, küçük mantık değişiklikleri:** #17 (metin + form eklemeleri), #20, #21, #36, #38, #54, #6, #27, #2, #48, #50, #1, #37, #29 (main: `page.financing.json` ref'leri)
**Seviye 3, orta büyüklükte işler:** #49, #3 + #28, #19, #18 (karar sonrası), #56, #30 (karar sonrası template + settings senkronu)
**Seviye 4, büyük refactor'lar:** #8 + #9 → ardından metin taraması #10, #11, #12, #13, #32 + E14 (de/fr/es çeviri kalitesi) → #57, #58, #55 → #59 (kod fazının en sonunda, script ile)
**Ölçüm (kod bittikten sonra):** #5 + E17 (düşük alpha renkler), #7, #34
**Kod bittikten sonra:** E8 (doküman düzeltmeleri), E12 (SETUP.md)
**Sonrasında:** E3 (`main → demo` merge) → Faz 2 (demo: #15, #16, #29, #31, #40–47, #60–63, E13 favicon yükleme) → Faz 3 (test: #66–77) → Faz 4 (paket: #64, #78–83, E11) → Faz 5 (final gate)

Çalışma kuralı: commit ve push'u kullanıcı yapar (GitHub Desktop). Değişiklikler hazırlanır; commit ancak istenirse atılır. Detaylar: `KITCHERO_PROJECT_NOTES.md`.

Bağımlılık kuralları:
- #10–13 ve #32, #8/#9'dan sonra yapılacak. #8/#9 yaklaşık 100 label'ı siler; önce yapılmazsa silinecek metinler boşuna düzeltilir.
- #59 (comment temizliği) kodun en sonunda yapılacak. Diğer fix'lerle çakışmasın ve bulunan her yeni yorum da temizlensin.
- #5, #7 ve #34 ölçümü tüm kod değişikliklerinden sonra yapılacak; yoksa sonuç değişir.
- Her fix 5 locale'e (en/tr/de/fr/es) birlikte uygulanacak. Her seviyenin sonunda theme-check çalıştırılacak, `main → demo` merge yapılacak ve demo mağazada hızlı kontrol edilecek.

## Faz 0 — Kararlar (kodlamadan önce)

| # | Konu | Seçenekler | Durum |
|---|---|---|---|
| 17 | Appointment drawer app fonksiyonu gibi görünüyor | **Tespit:** form zaten standart `{% form 'contact' %}` (ad, soyad, e-posta, telefon, mesaj, honeypot); takvim/slot yok. Custom olan sadece slide-in panel UI'ı + JS. Sorun isimlendirme: "book/appointment" metinleri planlanmış randevu vaat ediyor. **Fix planı (kullanıcı onayı, 20.10):** (1) Form alanları ve gönderim aynen kalır. (2) "Book/appointment" metinleri "Request a consultation" diline çevrilir: showroom `primary_cta_text` default'u ("Book your free appointment"), "Book a Free Home Measure", `product.showroom.json` "Book a studio visit" + açıklaması, `visualize-studio` "Book your visualization", ayar `kt_appointment_enabled` label/info → "Consultation request form"; 5 locale + demo template'leri. (3) Drawer başlığının altına açıklama satırı (ör. "Send us a few details and we'll contact you to plan next steps."). (4) Gizli `contact[Product]` alanı (PDP'den açılınca ürün adı + URL). (5) Kullanılmayan `interested_in` / `interest_option_*` locale key'leri silinir (5 locale). Kod içi "appointment" class/dosya adları teknik olduğu için kalabilir. Not: reviewer'ın "app gibi" algısını gidermesi beklenir, garanti değil; final gate'te yeniden değerlendirilecek | ◐ plan kayıtlı, Seviye 2'de uygulanacak |
| 18 | Back-in-stock, `{% form 'contact' %}` ile merchant'a mail atıyor; müşteriye otomatik bildirim gitmiyor | **Tespit (20.10):** sorun sadece buton adı değil; metinlerin hepsi otomatik bildirim vaat ediyor: button "Notify me when available", heading "Notify me when back in stock", açıklama "we will let you know the moment…", success "we will email you the moment this item is back", ayar "Enable restock notifications" / header "Back-in-stock notifications". **Öneri (dürüst metin, form aynı kalır):** button "Ask about availability" · heading "Ask about this item" · açıklama "This item is currently sold out. Send us your details and our team will get back to you about availability." · submit "Send request" · success "Thanks — your request has been sent. We'll be in touch." · ayar "Enable availability request form" + info "…sends a contact message to your store. It doesn't send automatic restock emails; use a back-in-stock app for that." · header "Availability requests". 5 locale. Alternatif: tamamen kaldır. **Yönetici onayı bekleniyor** | ⊘ |
| 19 | Showroom template bilinçli olarak ATC'siz tasarlanmış (kitchen cabinet'ler sepete eklenemediği için). Default `product.json` normal PDP olarak kalıyor | **Yön (20.10, kullanıcı):** en alttaki sample product bloğu yukarı taşınacak; ATC, quantity ve `payment_button` ne gerekiyorsa eklenecek. **Öneri (20.10):** yeni `buy_buttons` block'u mevcut `snippets/product-form` ile eklenecek (quantity + ATC + `payment_button` + `payment_terms`); gizli button'sız form kaldırılacak. Default sıra: brand → title → price → variant picker → buy buttons → consultation CTA'ları (ikincil, #17 kararına göre) → sample box → tags → accordions → warranty. Sample box kendi küçük ATC'sini korur, dynamic checkout yalnızca ana form'da olur. Stale "payment_button removed" comment'i silinecek. Onay bekleniyor | ◐ yön belli, detay bekliyor |
| 65 | İsim, Kitchery ve Kitchor'a çok yakın | Seçenekler: koru / önce trademark kontrolü / yeni isim. **Yönetici onayı bekleniyor (20.10)** | ⊘ |
| 80 | Demo görsellerinin hakları | Kullanıcı: görsellerin hepsi kendisi tarafından AI ile üretildi. Audit'in işaret ettiği "bayiden gelen" dosya bulunacak: Admin'den ürün CSV + Files export → dosya adı, EXIF/C2PA metadata, watermark/logo ve reverse image search taraması | ◐ |
| 81 | Theme Store dağıtım exclusivity'si | **Karar: sadece Shopify Theme Store'da satılacak (20.10)** | ☑ |
| 30 | Zip kurulumu demoyu birebir vermiyor | **Karar: zip demoya eşitlenecek (20.10).** Demo'daki tema ayarları `main` settings_data'ya taşınacak; 5 demo-only page template'i (content-faq, galleries, heroes-banners, image-with-text, sliders) resource referansı olmadan `main`'e eklenecek; içerik yalnızca Admin'de kalacak | ☑ karar |

## Faz 1 — Code fix'leri (`main`)

### 1A. Engelleyici (blocking)

| # | Sorun | Kök neden / dosya | Konum | Durum |
|---|---|---|---|---|
| 1 | 3 collection template'i collection image göstermiyor | `collection*.json` sadece `main-collection*` içeriyor; bu section'lar `collection.image` render etmiyor. `main-collection-banner` hiçbir template'te yok. Header'a image (ve toggle) eklenecek | main | ☐ |
| 2 | Showroom aylık taksiti faizi yok sayıyor | `snippets/product-price-showroom.liquid:108` `price / months`. Amortization formülü (APR>0) uygulanacak; financing-calculator ile tutarlı olacak | main | ☐ |
| 3 | Product template'leri, boş mağazada olmayan metafield'lara bağlı | `product.json`: countdown, meta (rating). `product.showroom.json`: brand, warranty, door_sample. Boşken render etme + editor'da hint göster | main | ☐ |
| 4 | Mobilde zoom kapalı | `layout/theme.liquid:53` `maximum-scale=1, user-scalable=no` → kaldır; input'lara min. 16px font | main | ☑ 21.10 |
| 5 | Kontrast 4.5:1'in altında (home, PDP, collection) | runtime: muted/eyebrow/price token'ları. Demo'da axe ile ölçülüp `kt-css-variables` + CSS'te düzeltilecek | main | ☐ |
| 6 | "Your Privacy Choices" hiçbir sayfada çalışmıyor | `sections/footer.liquid:478–498` link `/pages/your-privacy-choices` (sayfa yok) ve click handler `cookie-banner.js`'te; cookie-banner section yoksa çalışmıyor. Shopify native privacy API (`window.privacyBanner.showPreferences()` / `Shopify.customerPrivacy`) global JS'ten çağrılacak | main | ☐ |
| 7 | Tüm test edilen sayfalarda HTML validation hatası | #27'deki 8 parse hatası + runtime W3C taraması (home, PDP×2, collection×3, cart, search, blog, article, page, account) | main | ☐ |
| 8 | 53 section'da custom background var, text color yok | 52 section'da `bg_color` select + custom `color` var, text color yok (+ `video-split-modal`'da color_scheme yok) | main | ☐ |
| 9 | Renkler dropdown'dan seçiliyor | Aynı `bg_color` select'i (auto/white/stone_50/stone_100/custom) + `announcement-banner.color_theme` + `financing-calculator.accent_color`. #8 ile birlikte: hepsi kaldırılıp yalnızca `color_scheme` kullanılacak; template JSON'ları migrate edilecek | main | ☐ |
| 10 | British spelling (grey, catalogue, centred) | Schema locale: grey 2, catalogue 2, centre/centred 2. `en.default.json`, section schema literal'ları ve template'ler de taranacak | main | ☐ |
| 11 | Label/info metinlerinde `&` | Schema locale'da 5 adet + section literal'ları | main | ☐ |
| 12 | Section adları sentence case değil ("Parallax CTA") | Section `name` + preset adları (locale + literal) | main | ☐ |
| 13 | Terminoloji Shopify'dan farklı | slider→slideshow, CTA→call to action/button, sign-up→signup, title→heading (24 "title" adayı) | main | ☐ |
| 14 | Soru şeklinde default'lar | "Need a Custom Quote?", "Need help?", "…begin?" vb. → ifade cümlesi | main | ☑ 21.10 |
| 15 | Home'da placeholder metin kalmış | `main` default'larında da var: header-group "Add your announcement here", index.json "Add your financing partner here…", rich-text "Tell your story" | main + demo | ◐ main ☑ 21.10 (copy pass) · demo Faz 2 |
| 16 | Contact'ta example.com ve 555 numaraları | `main` default'larında da var: `contact-form.liquid:505–544`, `templates/page.contact.json:20–21` → boş default + editor hint | main + demo | ◐ main ☑ 21.10 · demo Faz 2 |

### 1B. Major

| # | Sorun | Kök neden / dosya | Konum | Durum |
|---|---|---|---|---|
| 17 | Appointment app gibi görünüyor | Faz 0 kararına göre | main | ⊘ |
| 18 | Back-in-stock bildirim göndermiyor | Faz 0 kararına göre | main | ⊘ |
| 19 | Showroom'da ATC, quantity ve dynamic checkout yok | `main-product-showroom.liquid:486–496` button'sız hidden form. Görünür product form + quantity + `form \| payment_button` | main | ☐ |
| 20 | "Now only" + kırmızı fiyat, olmayan bir indirimi ima ediyor | `product-price-showroom.liquid:44` label koşulsuz; yalnızca `on_sale` iken göster, normal fiyat nötr renkte | main | ☐ |
| 21 | Seçili variant'ta da "From" görünüyor | `snippets/product-price.liquid:48` `variant == selected_or_first_available_variant` → `product.selected_variant == blank` olmalı; JS variant change'de de "From" kalkmalı (`product-form.js`) | main | ☐ |
| 22 | Collection description formatını kaybediyor | `main-collection.liquid:94`, `-drawer:59`, `-vertical:39` `strip_html` → `rte` div | main | ☑ 21.10 |
| 23 | List collections `featured_image` kullanmıyor | `list-collections-grid.liquid:61–71` `collection.image` → `collection.featured_image` | main | ☑ 21.10 |
| 24 | Description yokken uydurma metin çıkıyor | `main-collection-banner` `description` default'u "A short paragraph that introduces…" → boş default | main | ☑ 21.10 |
| 25 | Collection heading level ayarı etkisiz | `main-collection.liquid:89` `heading_tag` 'h1' hardcode | main | ☑ 21.10 (ölü ayar kaldırıldı, h1 sabit) |
| 26 | Cart default olarak free shipping/returns vaat ediyor | `main-cart.liquid:1064,1071` default'lar → boş | main | ☑ 21.10 |
| 27 | 8 LiquidHTMLSyntaxError | contact-form:130, footer:180, hero:305, main-addresses:299, newsletter-popup:338, newsletter-signup:178, testimonials-pullquote:339, snippets/video-modal:81 | main | ☐ |
| 28 | Rating, features, deal end ve dimensions hardcoded metafield okuyor | `reviews.rating(_count)`, `custom.rating`, `custom.features`, `custom.deal_ends_at`, `custom.width/height/length/dimensions_unit`, `custom.country_of_origin`, `custom.swatch_*` → 8 dosya: main-product, main-product-showroom, main-collection, card-product, meta-tags, product-variant-picker, product-rating, countdown. Block'larda merchant-selectable dynamic source; boşken render yok | main | ☐ |
| 29 | JSON template'ler demoya özel resource'lara bağlı | `demo` branch'te 140+ `shopify://` ref (index 47, sliders 24, galleries 16…). `main`'de yalnızca `page.financing.json` (pages/contact, collections) | demo (+main kontrol) | ☐ |
| 30 | Kurulan tema demoyla aynı değil (color scheme 4, breadcrumb) | `settings_data.json` main ↔ demo farkı (114 satır). Ayrıca demo'da zip'te **olmayan 5 template** var: `page.content-faq`, `page.galleries`, `page.heroes-banners`, `page.image-with-text`, `page.sliders`. Ya `main`'e generic hâlleri eklenecek ya da demodan kaldırılacak. Faz 0 kararına göre | main + demo | ⊘ |
| 31 | "KITCHERO" adı ve demo metinleri template'lerde sabit | `demo` branch: 9+ template'te `"eyebrow": "KITCHERO"` + about metni. `main` gift_card yalnızca comment'te | demo | ☐ |
| 32 | Info metinleri teknik jargonla yazılmış | `en.default.schema.json` info alanlarının tamamı merchant diline göre gözden geçirilecek (1720 schema key) | main | ☐ |
| 33 | LICENSE, GSAP'ı MIT olarak gösteriyor | `LICENSE:22–26` → GSAP "Standard No Charge License"; `vendor-gsap.LICENSE.txt` / `vendor-scrolltrigger.LICENSE.txt` kontrol | main | ☑ 21.10 (GSAP sürüm/lisans notu: E16) |
| 34 | Desktop a11y ortalaması eşiği sadece 0.3 puan geçiyor | runtime: #4, #5, #35–39 sonrası Lighthouse ile yeniden ölçülecek, hedef ≥95 | main | ☐ |
| 35 | Screen reader "View image {{ index }} larger" okuyor | `snippets/product-media-gallery.liquid:171` `t` filtresine `index` gönderilmiyor; `main-product-showroom.liquid:141` `t: index: next_index \| plus: 1` filter zinciri hatalı | main | ☑ 21.10 |
| 36 | Showroom thumbnail label'ı yalnızca "1" | Showroom thumbnail button'ları (main-product-showroom ~110–260) → "Show image N of M" | main | ☐ |
| 37 | Filter list'leri geçersiz yapıda | `snippets/collection-filters.liquid` (+ drawer filter) ul>li yapısı | main | ☐ |
| 38 | Logo alt'ları generic; bazı alt'larda raw HTML var | `brands.liquid:64–80` "Brand logo" fallback; header mega menu `alt: block.settings.heading` (richtext/HTML olabilir) → `strip_html \| escape` | main | ☐ |
| 39 | Boş listeler okunuyor (payment icons, quantity breaks) | `footer.liquid:437`, `main-product.liquid:716`, `product-price.liquid:193` → `size > 0` guard | main | ☑ 21.10 |
| 40 | Uydurma testimonial'larda "Verified customer" | `main` default'larında da var: `index.json:499,507,515`, `page.testimonials.json:22,31,40,74` → kaldır | main + demo | ◐ main ☑ 21.10 · demo Faz 2 |
| 47 | Deals menüsünde Sale badge'i var ama indirimli ürün yok | `main` default'u: `header-group.json:42` `"badge_text": "SALE"` + `header.liquid:1166` default + `menu-link-badge.liquid:37` fallback | main + demo | ◐ main ☑ 21.10 · demo Faz 2 |

### 1C. Minor

| # | Sorun | Kök neden / dosya | Konum | Durum |
|---|---|---|---|---|
| 48 | Mobilde pause butonu announcement metninin üstüne biniyor | `kt-section-announcement-banner.css` padding/position | main | ☐ |
| 49 | Space ile dropdown açılmıyor, parent link klavyeyle erişilemiyor | `kt-section-header.js` keydown (Space/Enter) + parent link'i ayrı focus hedefi yap | main | ☐ |
| 50 | JS kapalıyken home'un bir kısmı görünmüyor | Motion reveal başlangıç state'i (`opacity:0`) yalnızca `html.js` altında olmalı; release notes "off by default" diyor ama `kt_motion_reveal` default true (E4) | main | ☐ |
| 51 | Fullscreen intro loader default açık | `settings_schema.json:287–290` + `settings_data` `kt_loader_enable: true` → false | main | ☑ 21.10 (demo mağaza ayarı Faz 2) |
| 52 | "Read article" her kartta iki kez | `snippets/article-card.liquid:105,108` | main | ☑ 21.10 |
| 53 | "The Archives" eyebrow'u zorunlu | 5 yerde: `main-collection.liquid:77`, `main-collection-drawer.liquid:54`, `main-collection-vertical.liquid:34` (hardcoded fallback), `main-collection-banner.liquid:137` ve `main-blog.liquid:197` (schema default), `en.default.json:594,613,737` → boş/opsiyonel ayar | main | ☑ 21.10 |
| 54 | Sabit öneriler "popular/trending" gibi sunuluyor | `snippets/search-popular-queries.liquid` heading/default → "Suggested searches", merchant-defined | main | ☐ |
| 55 | ScrollTrigger mobil home'da ~6 sn CPU | Motion bundle'ı mobilde ve `prefers-reduced-motion`'da yükleme; ScrollTrigger instance sayısını azalt | main | ☐ |
| 56 | Product card image'ları mobilde ~1.3 MB fazla | `card-product.liquid` `sizes`/`widths` | main | ☐ |
| 57 | Liquid complexity aşımı | main-product 168, main-product-showroom 125 → block'ları snippet'lere böl | main | ☐ |
| 58 | Script'ler Theme Check JS size threshold'unu aşıyor | `theme-check:all` ile **29 AssetSizeJavaScript error** çıkıyor (recommended ruleset bunu göstermiyor). Dosyalar: theme.liquid:258/840/844, header, main-product (4), main-product-showroom (4), main-collection(-drawer/-vertical), main-cart, featured-product, cookie-banner, recently-viewed, product-sticky-bar, gallery-focus-wall, gallery-stack, slider-cinematic-hero, slider-editorial-split, shop-the-look. Sayfa başına compressed JS < 10 KB hedefi: import-on-interaction, dosya bölme, vendor'ları conditional yükleme | main | ☐ |
| 59 | Kodda internal comment ve ticket numaraları | 202 dosyada ~1206 "R###" referansı + "TEMP DIAGNOSTIC", "user flagged" vb. Script ile temizlenecek; teknik açıklama gerekiyorsa nötr kısa yorum kalacak | main | ☐ |
| 62 | Aynı intro cümlesi çoğu sayfada tekrar ediyor | "A short paragraph that introduces this section…" 35 section'da default → section'a özel ya da boş default | main + demo | ◐ main ☑ 21.10 (35 section default'u + index/listing şablonları bölüme özel metne çevrildi) · demo Faz 2 |

### 1D. Raporun dışında bulduklarımız

| # | Sorun | Dosya | Durum |
|---|---|---|---|
| E1 | `global.js`'te 5 adet "TEMP DIAGNOSTIC" `console.log` | `assets/global.js:397–447` | ☑ 21.10 |
| E2 | Künye uyumsuz | `shopify.theme.toml` (Kitchero / kitchero.com) ↔ `settings_schema.json` (Freeman NYC / freemannyc.com); docs/support URL'leri canlı mı? | ☑ 21.10 (toml + LICENSE → Freeman NYC; linkler kullanıcı tarafından doğrulandı) |
| E3 | `demo` branch, `main`'in gerisinde | contact-form, footer, main-cart, showroom, product-rating… | ☐ |
| E4 | Release notes ile default'lar çelişiyor | `release-notes.md` "motion off by default" ↔ `kt_motion_reveal: true` | ☐ |
| E5 | Docs "0 offense" diyor ama güncel theme-check 10 offense veriyor | `docs/THEME_STORE_FIXES.md` | ☐ |
| E6 | `Kitchero-1.0.0.zip` repo kökünde duruyor | Submission zip'i her seferinde temiz build edilmeli | ☑ 21.10 (silinmedi; `_archive/submissions/` altına taşındı, gitignore + shopifyignore kapsamında) |
| E7 | Audit PDF'i sadece başlıklardan oluşuyor | **Karar: detay beklenmeyecek; demo mağaza kendimiz taranacak (axe/contrast, W3C, Lighthouse, ürün kontrolü) (20.10)** | ☑ karar |
| E8 | Dokümanlarda yanlış iddialar var ("Theme Check 0 errors", "160 rule compliant", "motion off by default", "fully translated", Showroom'da "CTA'lar ATC'nin yerini alıyor") | README, docs/THEME_STORE_FIXES, docs/THEME-STORE-LISTING (review notes), THEME_STORE_RULES_OFFICIAL, release-notes → fix'lerden sonra güncellenecek | ☐ |
| E9 | Konumlandırma: tema kitchen ve ev ürünleri satan merchant'lar için (kullanıcı kararı, 20.10) | Listing ve demo mağaza niche kalacak. `main` default'ları niche'e uygun ama nötr olacak: gerçek marka yok, sahte vaat/istatistik/kişi yok, "KITCHERO" yok; mobilya/dekor merchant'ında da anlamlı olmalı. Kitchen'a özel özellikler opsiyonel olacak ve gerçek Shopify akışlarıyla çalışacak. REJECT_RULES C6 bu çerçeveye göre güncellenecek | ☑ karar alındı |
| E10 | Submission demo mağazası: **kitchero-kitchen.myshopify.com** (kullanıcı teyidi, 20.10). Audit bu mağaza üzerinden yapılmış ve bulguları geçerli. `kitchero-4zilkgr1` AI_HANDOFF'taki eski/test kaydı | Tüm demo fix'leri ve Faz 3 testleri kitchero-kitchen'da yapılacak; `shopify.theme.toml` env ve AI_HANDOFF güncellenecek | ☑ |
| E11 | Packaging prosedürü | `.shopifyignore`'daki content pattern'leri geçici aç + `release-notes.md`'yi dahil et (#82) + temiz zip + doğrula + geri al | ☐ |
| E12 | Kodda okunan ama SETUP.md'de dokümante olmayan metafield'lar (`custom.features`, dimensions, `country_of_origin`) | #28 çözümüyle birlikte SETUP.md güncellenecek | ☐ |
| E13 | Favicon yok (kullanıcı tespiti, 20.10) | **Demo:** `kt_favicon` ayarı demo mağazada boş → Theme settings > Brand'den favicon yüklenecek (Faz 2). **Kod:** `templates/gift_card.liquid` favicon render etmiyor → eklenecek. `theme.liquid:174` `mask-icon` PNG veriyor (Safari SVG bekler) → satır kaldırılacak. Fresh install'da favicon olmaması normal (Shopify default'u devreye girer) | ◐ kod ☑ 21.10 · favicon yükleme Faz 2 |
| E14 | de/fr/es çevirilerinde kalite sorunları (ör. es "Listo para empezar?" `¿` eksik, de "Beginnen Sie Reise.") | Native-speaker review; en azından storefront default'ları gözden geçirilecek | ☐ |
| E15 | `templates/index.json` default'larında claim içeren metinler: trust bar sahte istatistikleri (500 Happy customers, 10+ Years, 99 Customer satisfaction — birimsiz), "Lifetime support", "built to order in our workshop… hand-rubbed", financing "Soft credit check, no application fee, decision in minutes", "0% APR available", testimonials açıklaması "We follow up…", `page.financing.json` FAQ cevapları | #15/#62 copy pass'te nötr placeholder'a çevrilecek (öneri metinleri kullanıcıya sunulacak) | ☑ 21.10 (index + listing index, page.financing FAQ, newsletter, product trust badge'leri, showroom warranty, financing section default'ları, testimonial preset'leri) |
| E16 | GSAP 3.12.5, eski GreenSock Standard License altında (dosya header'ı). Satılan bir tema içinde dağıtım koşulları doğrulanmalı; güncel GSAP sürümüne geçiş değerlendirilecek (R24 kuralı: vendor dosyalarına onaysız dokunulmaz) | Lisans metni gsap.com/standard-license üzerinden teyit + kullanıcı kararı | ⊘ |
| E17 | Muted metinlerde `rgba(var(--kt-c-fg), 0.55)` gibi düşük alpha kullanımları kontrast hatası üretiyor (bir tanesi collection description'da düzeltildi) | #5 kapsamında tüm CSS'te `--kt-c-fg-muted`'a geçilecek | ☐ |

## Faz 2 — Demo mağaza (`demo` branch + Admin), Faz 1'den sonra

| # | Sorun | Yapılacak | Konum | Durum |
|---|---|---|---|---|
| 15 | Home'da placeholder metin | Gerçek demo copy | demo | ☐ |
| 16 | example.com / 555 | Gerçek görünen ama fiktif marka iletişim bilgisi yerine kendi destek kanalımız | demo | ☐ |
| 29 | Demoya özel resource ref'leri | Faz 0 #30 kararına göre | demo | ☐ |
| 30 | Zip ↔ demo farkı | settings_data senkronu | demo + main | ☐ |
| 31 | "KITCHERO" eyebrow'ları | Kaldır ya da genericleştir | demo | ☐ |
| 40 | "Verified customer" yazan uydurma testimonial'lar | Rozeti kaldır; açıkça örnek olduğu belli içerik | demo | ☐ |
| 41 | Gerçek marka adları (Fabuwood, Forevermark, J&K Cabinetry, Wolf Classic) | Menü ve içerikten çıkar (menü Admin'de) | admin | ☐ |
| 42 | Judge.me yüklü | App'i kaldır; rating'i native metafield ile göster | admin | ☐ |
| 43 | Tüm mega menu linkleri aynı collection'a gidiyor | Menüye ayrı collection'lar oluşturup bağla | admin | ☐ |
| 44 | Ürünlerde foto, açıklama ve variant tutarsız | Ürün bazında düzelt | admin | ☐ |
| 45 | Birbirine çok benzeyen 27 kitchen set | Katalogu çeşitlendir / azalt | admin | ☐ |
| 46 | Logo section'ında iki fiktif marka tekrarlanıyor | Benzersiz fiktif logolar | demo | ☐ |
| 47 | Deals'ta Sale badge'i ama sale yok | Badge'i kaldır ya da ürünlere compare-at price gir | demo + admin | ☐ |
| 60 | Footer'daki New Arrivals linkinde fazla parantez | Footer menü/link | admin/demo | ☐ |
| 61 | "86+" birimsiz | Birim ekle (ör. "86%") ya da metriği değiştir | demo | ☐ |
| 62 | Tekrar eden intro cümlesi | Sayfaya özel copy | demo | ☐ |
| 63 | Bir product description'ı tekrar ediyor | **Kod hatası:** `main-product-showroom.liquid:626–643` içeriği boş olan her accordion `product.description`'a düşüyor. Demo showroom'da 4 accordion var; içeriği boş olan her biri açıklamayı tekrar gösteriyor. Fallback kaldırılacak (boşsa accordion render edilmeyecek) | main + admin | ◐ kod ☑ 21.10 (showroom accordion fallback düzeltildi) · Admin kontrolü Faz 2 |

## Faz 3 — Test (demo mağazada, Bogus Gateway + test verisiyle)

| # | Test | Hazırlık | Durum |
|---|---|---|---|
| 66 | Accelerated checkout butonları | Shopify Payments test mode / Bogus Gateway | ☐ |
| 67 | Shop Pay Installments banner | Shopify Payments + `payment_terms` | ☐ |
| 68 | Pickup availability | Location + local pickup aktif | ☐ |
| 69 | Video, 3D, AR media | Bir ürüne video + GLB model | ☐ |
| 70 | Subscriptions, gift card, recipient | Subscription app + gift card ürünü | ☐ |
| 71 | Unit price, tax-inclusive, automatic discounts | Market/tax ayarları + otomatik indirim | ☐ |
| 72 | Lighthouse (Shopify reference store) | Shopify reference data ile skor | ☐ |
| 73 | Safari, Firefox, Edge, Samsung Internet, in-app browser'lar | Cihaz/BrowserStack matrisi | ☐ |
| 74 | Editor'da section ekleme, silme, sıralama | Tüm 91 section | ☐ |
| 75 | Boş mağazaya kurulum | Yeni dev store'a zip kurulumu | ☐ |
| 76 | Test mode / Bogus Gateway | Demo'da aktif et | ☐ |
| 77 | Support formu auto-reply | Support altyapısı | ☐ |

## Faz 4 — Originality ve submission paketi

| # | Konu | Yapılacak | Durum |
|---|---|---|---|
| 78 | Header, product card ve collection'ların yayındaki temalardan farkı | Yan yana karşılaştırma dokümanı (Dawn, Horizon + benzer niş temalar) | ☐ |
| 79 | Kod kökeni: Dawn/Horizon izi yok ama kanıt yok | Skeleton lineage notu + grep raporu | ☐ |
| 64 | Support formu Shopify plan bilgisini istiyor ama e-postayı zorunlu tutmuyor | Support sitesindeki formda e-posta required | ☐ |
| 82 | `release-notes.md` export'ta yok | `.shopifyignore`'daki `*.md` istisnası + zip komutuna ekle | ◐ 21.10 `.shopifyignore` düzeltildi; paketlemede doğrulanacak (E11) |
| 83 | Listing screenshot'ları, tagline ve key feature'lar | `docs/THEME-STORE-LISTING.md` + `docs/PREVIEW-IMAGES.md` baz alınarak üretilecek | ☐ |
| 80, 81, 65 | Haklar, exclusivity, isim | Faz 0 kararları | ⊘ |

## Faz 5 — Final gate (submit öncesi)

1. 83 maddenin + E1–E6'nın hepsi ☑ ya da gerekçeli ⊘.
2. Güncel `@shopify/theme-check-node` → 0 error, 0 warning.
3. W3C validation: 12 template tipinde 0 error.
4. Lighthouse mobile + desktop (home, PDP, collection): a11y ≥ 95, perf hedefi.
5. axe taraması: 0 kontrast ve 0 ARIA ihlali.
6. Yeni dev store'a zip kur → demo ile görsel karşılaştırma.
7. Faz 3 testleri ☑.
8. Raporu yeniden madde madde yürü (aynı audit metodolojisiyle).

---

### Kapsam kontrolü
Raporun 1–83 numaralı maddelerinin tamamı bu dosyada en az bir kez yer alıyor (script ile doğrulandı). Birden fazla fazı ilgilendiren maddeler (#15, #16, #29, #30, #40, #47, #62, #63) her ilgili fazda ayrıca listelendi.
