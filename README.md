# stackformstudios.com

Static site for Stackform Studios. Plain HTML, one CSS block, ~2 KB of vanilla
JS — no build step, no framework, no runtime. Deploy the directory as-is.

```
index.html      the whole page (CSS + JS inlined)
assets/         4 latin-subset woff2 fonts, 7 webp images, 1 svg
```

## Where this came from

The previously deployed page was a single 4.7 MB HTML file titled
`Bundled Page`. Every asset was base64-inlined into a manifest, and a 67 KB
client-side runtime had to download and "unpack" the whole thing before the
browser painted anything. That is what made it slow on mobile, and it also meant
crawlers and link previews only ever saw the placeholder title.

This version was reconstructed from that deployment: the resolved DOM was
captured, the assets extracted from the manifest, and the builder runtime
dropped entirely. Content and visual design are unchanged.

## What changed

**Payload — 3.36 MB → 0.45 MB over the wire (-87%)**

| | before | after |
|---|---|---|
| Documents | 1 × 4.7 MB blocking | 47 KB (9.7 KB gzipped) |
| Images | 2.9 MB PNG | 358 KB WebP, capped at 2× display size, lazy below the fold |
| Fonts | 15 woff2 (345 KB), incl. Cyrillic + Vietnamese | 4 latin-only woff2 (146 KB) |
| JS | 206 KB builder runtime | ~2 KB inline |

First paint no longer waits on a multi-megabyte download plus a JS unpack step.

**Responsive.** The original shipped a `viewport` meta tag but no breakpoints at
all — every dimension was a hard pixel value in an inline `style` attribute. Added
breakpoints at 1024 / 860 / 760 / 480 px: grids collapse to one column, column
dividers become row separators, flex rows stack, display type is fluid via
`clamp()`, and the nav becomes a toggle menu under 860 px.

**Width on large monitors.** Content is now capped at `--maxw` (1360 px) and
centred. The cap is applied as horizontal padding rather than a wrapper element,
so section borders and the dark contact panel still bleed to the full viewport.
The hero ceiling came down from 124 px to 104 px, which removes a chunk of
vertical sprawl.

**Metadata.** Real `<title>`, meta description, canonical, Open Graph and
Twitter card tags, `ProfessionalService` JSON-LD, and a favicon. Previously the
document title was literally `Bundled Page`, which is what Slack, WhatsApp and
LinkedIn previews displayed.

**Robustness.** Reveal-on-scroll is gated behind a `.js` class on `<html>`, so
the page is fully readable with scripting off or if the script fails. Verified:
3,719 characters of body text render with JS disabled. `prefers-reduced-motion`
is respected throughout.

## Things to know

**The countdown target is a real date now.** The old runtime restarted the clock
at `412 days 09 h 26 m` on every page load — two renders 18 minutes apart showed
identical values, so it was never counting toward anything. It is now anchored
to an actual instant, declared in the markup:

```html
<div data-countdown="2027-09-22T00:00:00+08:00">
```

`2027-09-22` is what the original numbers implied relative to when they were
captured. **If the real National Scout Games kick-off is a different date, edit
that one attribute** — nothing else needs to change.

**`assets/nsg-mark.svg` is 75 KB** (22 KB gzipped), large for a logo because it
is a traced bitmap rather than drawn vectors. Worth replacing with a real vector
mark if one exists.

**Serve gzip or brotli**, and set long `Cache-Control` on `assets/` — the
filenames are stable, so cache them hard.

**Republishing from the original builder will overwrite all of this.** These
fixes live in the output, not in whatever tool produced `Bundled Page`. If that
tool is still the source of truth, the changes need to be ported back into it.

## Local preview

```sh
python3 -m http.server 8000
```
