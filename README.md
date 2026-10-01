# stackformstudios.com

Static site for Stackform Studios. Plain HTML with inline CSS and a few KB of
vanilla JS — no build step, no framework, no runtime. Vercel deploys `main`
on every push; the directory is served as-is.

```
index.html      the whole page (CSS + JS inlined)
assets/         3 latin-subset woff2 fonts, 9 device scenes, 4 client
                logos, the mark, and the Open Graph card
tools/devices/  the scene renderer and source screens (not deployed —
                see .vercelignore)
vercel.json     cache and security headers
```

## Design

The layout follows a reference site's structure — floating pill nav, coral
hero with tabs that switch a full-width feature panel, overlaid-title cards, a
moving client rail, sticky intro beside stacked capability cards, a CTA band
and a black footer — with Stackform's own content throughout. No assets, copy
or artwork from the reference are used.

Type sizes are in `vw`, measured off the reference at its 2590px capture width,
with floors for small screens. Display type is Archivo at weight 340; Archivo
is a variable font (100–900), so it is the same file the earlier design used.

The mark is rendered through a CSS mask (`.mark`) so it can take the accent
colour; the source file is black.

## Imagery

`assets/dev-*.webp` show real Stackform work on device frames — laptops, a
monitor, a tablet and phones — lit in the site's coral. Nine scenes, ~345 KB
total, rendered at 4/3 density so screen text stays sharp on large displays.

| file | scene |
|---|---|
| `dev-websites` | laptop — X-League site |
| `dev-software` | monitor — D2D admin suite |
| `dev-operations` | tablet + phone — D2D fixtures, D2D app |
| `dev-apps` | two phones — Makan dark splash, D2D app |
| `dev-automation` | laptop + phone — D2D site, D2D app |
| `dev-sitin` | tablet — X-League player profile |
| `dev-build` | laptop — this site's client-rail code, pulled live from `index.html` |
| `dev-stay` | phone — D2D app |
| `dev-about` | monitor + laptop + phone — X-League, D2D, Makan |

The devices are drawn in CSS in `tools/devices/studio.html` (generic hardware,
no brand marks); the screens are in `tools/devices/screens/`. To change a
screen or a layout, edit those and re-render:

```sh
python3 -m http.server 8898 &            # from the repo root
node tools/devices/render.mjs            # needs playwright-core + Chromium
python3 tools/devices/encode.py          # needs Pillow; writes assets/dev-*.webp
```

The wide scenes feed both the hero panel and the capability cards, so their
devices stay in the right 45% of the frame: clear of the panel's glass card and
the cards' copy, and whole in a 4:3 crop anchored right — which is how phones
show them, picture above copy.

## Client logos

| file | note |
|---|---|
| `d2d-logo.webp` | **Stopgap.** Keyed out of a website screenshot; the source is only 79 px wide, so it is soft. Replace with the original file. |
| `xleague-logo-light.webp` | **Stopgap.** The original has white lettering that disappears on the white tiles; this copy recolours only the lettering. Replace with an official light-background version. |
| `nsg-logo.svg` | The original mark with its viewBox cropped to the content. |
| `makan-logo.webp` | From the supplied artwork. No URL yet, so its tile is not a link — add `u:` to its entry to link it. |

The client rail is built in JS from the `clients` array near the bottom of
`index.html` — add an entry there to add a client.

## Caching

`vercel.json` gives `assets/` a week's `max-age` with a month of
`stale-while-revalidate`. Asset filenames are not content-hashed, so this is
deliberately not `immutable` — **when replacing an image, give it a new
filename** or visitors may see the old one for up to a week.

## Local preview

```sh
python3 -m http.server 8000
```
