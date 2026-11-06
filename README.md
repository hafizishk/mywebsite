# stackformstudios.com

Static site for Stackform Studios. Plain HTML with inline CSS and a few KB of
vanilla JS — no build step, no framework, no runtime. Vercel deploys `main`
on every push; the directory is served as-is.

```
index.html        the whole page (CSS + JS inlined)
assets/           3 latin-subset woff2 fonts, client logos, the mark, the
                  Open Graph card
assets/work/      project scenes (sq-* hero tiles, pt-* featured cards,
                  ls-* work grid), the founder portrait, Granix and Flair marks
tools/portfolio/  the scene renderer and source screens (not deployed —
                  see .vercelignore)
vercel.json       cache and security headers
```

## Design

A project-led portfolio: dark hero with a 3×3 board of project tiles that
slide one cell at a time into empty neighbours (and occasionally swap picture,
appear or leave); intro; capabilities accordion; four featured project cards;
client logo wall; "Why work with us?"; a work grid where each project tile
cycles through its scenes; contact with the founder portrait.

Projects: KlickFrame, X-League, D2D Sports, Flair Football Academy, Granix
(in development) and Helpr (in development).

Work-grid slides only advance while their tile is on screen. Both the hero
and the slides stand still under `prefers-reduced-motion`.

## Imagery

Every scene is real client work on CSS-drawn devices (phones, laptops, a
monitor, a tablet, browser windows) over each project's own brand colours.
The devices and scenes live in `tools/portfolio/studio.html`; the screens
they show are in `tools/portfolio/screens/`. To change one, edit those and
re-render:

```sh
python3 -m http.server 8898 &            # from the repo root
CHROME=/path/to/chrome node tools/portfolio/render.mjs   # needs playwright-core + Pillow
```

`render.mjs` writes every scene to `assets/work/*.webp` (hero/card scenes at
4/3 density). Helpr screens come from `/helpr-screens/`.

## Client logos

| file | note |
|---|---|
| `d2d-logo.webp` | **Stopgap.** Keyed out of a website screenshot; the source is only 79 px wide, so it is soft. Replace with the original file. |
| `xleague-logo-light.webp` | **Stopgap.** Recoloured lettering; replace with an official version. |
| `nsg-logo.svg` | The original mark with its viewBox cropped to the content. |
| `work/makan-mark.svg` | Granix mark, redrawn as SVG from the app icon (file name predates the rename). |
| `work/flair-crest-white.png` | Flair crest with the navy knocked out. |

## Caching

`vercel.json` gives `assets/` a week's `max-age` with a month of
`stale-while-revalidate`. Asset filenames are not content-hashed, so this is
deliberately not `immutable` — **when replacing an image, give it a new
filename or add a `?v=` query** or visitors may see the old one for up to a week.

## Local preview

```sh
python3 -m http.server 8000
```

## /spl — SPL fan app admin (Football Association of Singapore pitch)

`www.stackformstudios.com/spl` opens the SPL office admin; `/spl/index.html` is the fan app on the web.
The files are a copy of `mock/` from the private `hafizishk/SPL` repo, which is the source of truth: change them
there, then copy them across (`tools/sync-site.sh` in that repo) and push here.
