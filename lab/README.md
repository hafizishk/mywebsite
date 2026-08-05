# Lab — cinematic device section

Two takes on the scroll-choreographed device section. **Neither is linked from the
live site and neither is on `main`**, so nothing here can affect production. Both
pages carry `noindex, nofollow`.

| | Variation A | Variation B |
|---|---|---|
| File | `cinematic-css.html` | `cinematic-webgl.html` |
| Technique | CSS 3D, stacked silhouettes | WebGL, procedural geometry |
| Added weight | **0 KB** | **143 KB gzipped**, lazy |
| Scroll path | No JS where `animation-timeline: view()` exists | rAF, gated on visibility |
| Runs on | Every viewport | ≥480 px with WebGL2 and ≥4 GB RAM |
| Reflections | Faked with a gradient | Real, from a procedural environment |

## On the device model

Both build the phone from scratch at true iPhone 17 Pro Max dimensions —
163.3 × 77.6 × 8.75 mm, 12 mm corner radius. **There is no downloaded 3D model.**

That is deliberate, not a shortcut. A photorealistic licensed handset model would
mean a multi-megabyte `.glb` plus texture set, which is the opposite of the work
we just did to get the site to a 100 KB critical path — and marketplace models
carry licence terms that generally don't cover redistribution in a public page.
Generating the body in code costs nothing to download and has no licence
attached.

Two consequences worth knowing. The silhouette is a generic modern flagship, not
a millimetre-accurate replica of Apple's industrial design — it reads as "an
iPhone" without being a copy. And Apple's own marketing guidelines restrict how
their hardware may be depicted in commercial material, so a *deliberately*
generic device is the safer choice for a studio site regardless of file size.

## Variation A — CSS 3D

The body is 28 rounded silhouettes stacked 1 px apart along Z, which keeps the
corners genuinely round; a six-face box with `border-radius` cannot. Screen reuses
`assets/d2d-app.webp`, already on the site.

**Honest limitation:** the rail is built from slice *edges*, not geometry, so it
reads as a soft gradient rather than machined metal, and it will never catch a
real specular highlight. At shallow angles it holds up; past roughly 40° the
stacking becomes visible. There is no lens depth and no true perspective on the
chamfer.

## Variation B — WebGL

Chamfered chassis via a bevelled extrusion, clearcoat display, three-lens
plateau with separate housings, rims and glass, and the four side controls.
Reflections come from three's procedural `RoomEnvironment`, so there is no HDR
map to fetch. Scroll drives a sweep from three-quarter-back to face-on; the
pointer adds parallax.

Guard rails, because 143 KB is real:

- Nothing loads until the stage is within 200 px of the viewport
- Falls back to `assets/phone-poster.webp` (63 KB, baked from this same scene) on
  reduced-motion, no WebGL2, `deviceMemory < 4`, or viewport under 480 px
- `requestAnimationFrame` only runs while the stage is on screen and the tab is
  visible; device pixel ratio capped at 2

## Regenerating

Sources live in the session scratchpad, not the repo — `lab-src/phone.js` and
`lab-src/entry.js`, bundled with:

```sh
npx esbuild lab-src/entry.js --bundle --minify --format=esm \
  --target=es2020 --outfile=lab/assets/cinematic.js
```

If Variation B is chosen, those sources should move into the repo so the bundle
is reproducible.

## Preview

```sh
python3 -m http.server 8000   # then /lab/cinematic-css.html or /lab/cinematic-webgl.html
```
