# REJECT Sweep — Otonom Tur Prompt'u

Bu dosyanın içeriğini olduğu gibi mesaj olarak Claude'a ver. Tek tetikle
sürekli tur atar, REJECT_RULES.md temizlenene kadar durmaz. Limit
biterse "devam et" demen yeter, kaldığı yerden devam eder.

---

## ✂️ KOPYALAMA BAŞLANGICI ✂️

Hedef: `/Users/macos/Documents/GitHub/kitchero-shopify-theme` reposunda
`REJECT_RULES.md`'deki tüm REJECT'leri temizleyene kadar otonom tur at.
Bana sormadan turlar arasında geçiş yap. Sadece HARD STOP koşullarında
dur.

### Adım 0 — Resume kontrolü (her başlatmada İLK iş)

```bash
git status --short
git log -1 --format='%h %s'
git log --oneline --grep='reject-prevention' | wc -l
```

- **Uncommitted dosya varsa:** R(N-1) yarım kalmış. `shopify theme check`
  çalıştır, 0 offense ise yarım turu commit at, sonra yeni tura başla.
  Hata varsa dur ve raporla.
- **Working tree clean:** doğrudan yeni tura başla.
- N = (`git log --grep='reject-prevention' | wc -l`) + 1. Bu turun adı R{N}.

### Adım 1 — 6 ajanı paralel başlat

Tek mesajda 6 `general-purpose` ajan başlat. Her ajana şu prompt:

> Read `/Users/macos/Documents/GitHub/kitchero-shopify-theme/REJECT_RULES.md`
> in full. Run every rule in section(s) **[X]** from the repo root. For
> each grep hit, check section D (KNOWN FALSE POSITIVES) and section F
> (PAST FINDINGS) before flagging. Report ONLY confirmed REJECT-level
> findings:
>
> ```
> [RULE-ID] {file}:{line}
>   evidence: <one line>
>   fix: <what to change to what>
> ```
>
> Do not invent new rules — propose at end as "RULE CANDIDATES". Do not
> modify files. Cap 600 words. If 0 findings, say "Found 0 REJECT — clean."

Section atamaları:
- Ajan 1 → A (Absolute) + B3 (Mandatory features) + C5 (Policy)
- Ajan 2 → B2 + C2 (A11y)
- Ajan 3 → B1 + C3 (Perf)
- Ajan 4 → C1 (Security) + B4 (Form correctness)
- Ajan 5 → C4 (JavaScript)
- Ajan 6 → C6 (Demo content)

**Önemli:** REJECT_RULES.md'nin TÜM B-section kuralları (B1, B2, B3, B4)
mutlaka kapsama dahil edilmelidir. B3 (mandatory features: @app block,
payment_button, placeholder_svg, JSON-LD, theme_info, color_scheme,
locale parity) ve B4 (form correctness: native `<form>` vs `{% form %}`,
autocomplete, fieldset/legend, CSRF) paid Theme Store kritik kuralları.

### Adım 2 — Bulguları topla

6 ajan dönünce toplam REJECT sayısını hesapla.

### Adım 3 — Durma kontrolü

- **Toplam = 0** → DUR. Raporla:
  > ✅ R{N}: 0 REJECT. REJECT_RULES.md tamamen temiz. Submission'a hazır.

- **Toplam > 0** → Adım 4'e geç.

### Adım 4 — Düzeltmeleri uygula

Şu sırada düzelt: Security → JS → Policy → A11y → Perf → Demo.
Her dosyayı düzeltmeden önce Read et. Global `sed` kullanma.

### Adım 5 — Theme check + commit

```bash
shopify theme check
```

0 offense olana kadar düzelt. Sonra:

```bash
git add -A && git commit -m "$(cat <<'EOF'
fix(reject-prevention): R{N} REJECT_RULES.md sweep — {COUNT} REJECT closed

- Security: {n} ({rule IDs})
- JS: {n} ({rule IDs})
- Policy: {n} ({rule IDs})
- A11y: {n} ({rule IDs})
- Perf: {n} ({rule IDs})
- Demo: {n} ({rule IDs})

Theme check: 153 files / 0 offenses.

Co-Authored-By: Claude Opus 4.7 <noreply@anthropic.com>
EOF
)"
```

Tek satır özet bas:
> R{N}: {COUNT} REJECT kapatıldı, commit {SHA}. R{N+1} başlatılıyor...

### Adım 6 — Yeni tura geç

Sormadan Adım 0'a dön.

---

### HARD STOP koşulları (sadece bunlardan biri olursa dur)

1. 6 ajan toplam 0 bulgu (Adım 3)
2. Üst üste 3 tur aynı/artan REJECT sayısı → ilerleme yok
3. Theme check 3 kez üst üste düzeltilemiyor
4. Bir ajan "You've hit your limit" → DUR, raporla:
   > Limit hit, R{N} {DURUM}. Limit dönünce "devam et" de, kaldığım
   > yerden alırım.
5. Tur sayısı > 50

### Kurallar

- REJECT_RULES.md DIŞINDA kural icat etme
- `vendor-lenis.js` / `vendor-gsap.js` / `vendor-scrolltrigger.js`
  dokunulmaz (R24)
- Kullanıcıya "devam edeyim mi" SORMA
- Her tur ayrı atomic commit
- Theme check 0 offense ZORUNLU her commit öncesi

### "Devam et" sonrası akış

Kullanıcı "devam et" / "kaldığın yerden devam et" / bu prompt'u tekrar
verdiğinde: doğrudan Adım 0'dan başla. Resume Protocol git state'ini
okuyup ne yapacağını otomatik bulur.

ŞİMDİ ADIM 0'DAN BAŞLA.

## ✂️ KOPYALAMA SONU ✂️

---

## Kullanım

**Tek seferlik başlatma:**
1. Yukarıdaki "KOPYALAMA BAŞLANGICI" ile "KOPYALAMA SONU" arasındaki
   kısmı kopyala
2. Claude'a mesaj olarak yapıştır
3. Otomatik tur atmaya başlar

**Limit bittiyse:**
1. Conversation'ı bitir veya bekle
2. Limit dönünce: sadece "devam et" yaz
3. Resume Protocol otomatik kaldığı yerden alır

**Tamamen temiz olduğunda:**
- Claude "✅ R{N}: 0 REJECT" mesajı atar ve durur
- Submission'a hazırsın
