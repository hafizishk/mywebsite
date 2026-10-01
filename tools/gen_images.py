#!/usr/bin/env python3
"""Generate the abstract imagery in assets/gen-*.webp.

Usage:  python3 tools/gen_images.py      (needs numpy and Pillow)


The reference leans on photography in seven places. Stackform has no photo
library, does not want portfolio screenshots there, and stock people-in-offices
would misrepresent a one-person studio — so each slot gets a composition of
light rendered here, one idea per subject, in the site palette. Every image is
deterministic (fixed seeds) so a rebuild reproduces it exactly, and each one is
a straight swap for a real photograph later.
"""
import math, os
import numpy as np
from PIL import Image, ImageDraw, ImageFilter

OUT = os.environ.get('OUT', os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', 'assets'))
os.makedirs(OUT, exist_ok=True)

INK   = np.array([15, 13, 11]) / 255
CORAL = np.array([235, 84, 67]) / 255
DEEP  = np.array([176, 40, 30]) / 255
AMBER = np.array([242, 166, 90]) / 255
ROSE  = np.array([248, 198, 197]) / 255
WARM  = np.array([251, 243, 236]) / 255


def canvas(w, h, base=INK):
    return np.ones((h, w, 3)) * base


def grid(w, h):
    y, x = np.mgrid[0:h, 0:w].astype(float)
    return x / w, y / h


def blob(img, cx, cy, sx, sy, color, k=1.0):
    h, w, _ = img.shape
    x, y = grid(w, h)
    g = np.exp(-(((x - cx) / sx) ** 2 + ((y - cy) / sy) ** 2) / 2)
    img += g[..., None] * color * k


def layer_from_pil(w, h, draw_fn, ss=2, blur=0):
    L = Image.new('L', (w * ss, h * ss), 0)
    draw_fn(ImageDraw.Draw(L), ss)
    L = L.resize((w, h), Image.LANCZOS)
    if blur:
        L = L.filter(ImageFilter.GaussianBlur(blur))
    return np.asarray(L, dtype=float) / 255


def glow_lines(w, h, draw_fn, color, core=1.0, halo=1.6, halo_blur=14):
    sharp = layer_from_pil(w, h, draw_fn)
    soft = layer_from_pil(w, h, draw_fn, blur=halo_blur)
    return (sharp * core + soft * halo)[..., None] * color


def finish(img, name, seed, grain=0.0, vignette=0.55, exposure=1.0, post=None):
    h, w, _ = img.shape
    img = 1 - np.exp(-img * exposure * 1.6)          # soft tone map
    x, y = grid(w, h)
    v = 1 - vignette * (((x - .5) ** 2 + (y - .5) ** 2) * 1.6)
    img *= np.clip(v, 0, 1)[..., None]
    rng = np.random.default_rng(seed)
    if grain: img += rng.normal(0, grain, (h, w, 1))
    img = np.clip(img, 0, 1) ** (1 / 1.05)
    path = os.path.join(OUT, name)
    out = Image.fromarray((img * 255).astype(np.uint8))
    if post:                      # composited after tone mapping so brand colours stay exact
        out = post(out)
    out.save(path, 'WEBP', quality=78, method=6)
    return path, os.path.getsize(path)


made = []

# ── 1. Websites — a perspective grid of light: structure people move through.
def websites():
    w, h = 1800, 760
    img = canvas(w, h) * 1.4
    blob(img, .72, .7, .34, .4, CORAL, .95)
    blob(img, .7, .42, .18, .06, AMBER, .35)
    hy = int(h * .44)
    def draw(d, s):
        vx = int(w * .70 * s)
        for i in range(-14, 15):
            d.line([(vx, hy * s), (vx + i * 260 * s, h * s)], fill=int(40 + 90 * (1 - abs(i) / 15)), width=int(1.1 * s))
        for j in range(2, 11):
            t = (j / 11) ** 2.3
            yy = hy + (h - hy) * t
            d.line([(0, yy * s), (w * s, yy * s)], fill=int(30 + 110 * t), width=int(1.1 * s))
    img += glow_lines(w, h, draw, ROSE, core=.32, halo=.35, halo_blur=8)
    made.append(finish(img, 'gen-websites.webp', 1))

# ── 2. Custom software — strata: layered bands, built up from the ground.
def software():
    w, h = 1800, 760
    img = canvas(w, h)
    x, y = grid(w, h)
    cols = [DEEP, CORAL, AMBER, ROSE, CORAL, DEEP]
    for i, c in enumerate(cols):
        off = .18 + i * .12
        edge = off + .06 * np.sin(x * (2.6 + i * .4) * math.pi + i * 1.3) + .03 * np.sin(x * 9 + i)
        band = 1 / (1 + np.exp((y - edge) * 70))
        img = img * (1 - band[..., None] * .55) + band[..., None] * c * (.32 + .07 * i)
    blob(img, .3, .2, .25, .2, AMBER, .35)
    made.append(finish(img, 'gen-software.webp', 2, vignette=.7))

# ── 3. Operations systems — orbits: many moving parts held in one rhythm.
def operations():
    w, h = 1800, 760
    img = canvas(w, h) * 1.2
    blob(img, .5, .62, .22, .3, CORAL, .9)
    cx, cy = .5, 1.05
    def draw(d, s):
        for i in range(18):
            r = (180 + i * 46) * s
            a0, a1 = 196 + i * 2.2, 344 - i * 1.7
            box = [cx * w * s - r, cy * h * s - r, cx * w * s + r, cy * h * s + r]
            d.arc(box, a0, a1, fill=90 + i * 8, width=int((1.2 + (i % 4 == 0) * 1.4) * s))
        for i in range(0, 18, 3):        # nodes riding the orbits
            r = 180 + i * 46
            a = math.radians(250 + i * 6.5)
            px, py = cx * w + r * math.cos(a), cy * h + r * math.sin(a)
            d.ellipse([(px - 5) * s, (py - 5) * s, (px + 5) * s, (py + 5) * s], fill=255)
    img += glow_lines(w, h, draw, ROSE, core=.75, halo=1.2, halo_blur=12)
    made.append(finish(img, 'gen-operations.webp', 3))

# ── 4. Mobile apps — a tall pill of light, the shape of a screen held up.
# Phone geometry, shared by the glow pass and the splash composite. Sized to stay
# whole inside every crop it gets: 3.8:1 cards keep the middle 474px of 760.
PHONE_W, PHONE_H, PHONE_R = 200, 410, 40
SPLASH = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'makan-splash.png')

def makan_splash(im):
    """Dark splash screen with the Makan mark, set inside the glowing phone."""
    w, h = im.size
    x0, y0 = round(w * .58 - PHONE_W / 2), round(h * .5 - PHONE_H / 2)
    inset, ss = 8, 4
    sx0, sy0, sx1, sy1 = x0 + inset, y0 + inset, x0 + PHONE_W - inset, y0 + PHONE_H - inset
    mask = Image.new('L', ((sx1 - sx0) * ss, (sy1 - sy0) * ss), 0)
    ImageDraw.Draw(mask).rounded_rectangle([0, 0, mask.width - 1, mask.height - 1],
                                           radius=(PHONE_R - inset) * ss, fill=255)
    mask = mask.resize((sx1 - sx0, sy1 - sy0), Image.LANCZOS)
    im.paste((14, 12, 11), (sx0, sy0), mask)
    logo = Image.open(SPLASH).convert('RGBA')
    lw = round((sx1 - sx0) * .58)
    logo = logo.resize((lw, round(logo.height * lw / logo.width)), Image.LANCZOS)
    cx, cy = (sx0 + sx1) // 2, (sy0 + sy1) // 2
    rgba = im.convert('RGBA')
    rgba.alpha_composite(logo, (cx - logo.width // 2, cy - logo.height // 2))
    return rgba.convert('RGB')

def apps():
    w, h = 1800, 760
    img = canvas(w, h)
    blob(img, .58, .5, .17, .5, CORAL, .7)
    def draw(d, s):
        x0, y0 = int(w * .58 - PHONE_W / 2), int(h * .5 - PHONE_H / 2)
        d.rounded_rectangle([x0 * s, y0 * s, (x0 + PHONE_W) * s, (y0 + PHONE_H) * s],
                            radius=PHONE_R * s, outline=255, width=int(3 * s))
    img += glow_lines(w, h, draw, WARM, core=.5, halo=1.4, halo_blur=30)
    blob(img, .58, .5, .07, .3, ROSE, .35)
    made.append(finish(img, 'gen-apps-makan.webp', 4, post=makan_splash))

# ── 5. Automation — a stream of particles finding one path.
def automation():
    w, h = 1800, 760
    img = canvas(w, h) * 1.1
    rng = np.random.default_rng(55)
    n = 2600
    t = rng.random(n)
    px = t * w
    py = h * (.55 + .22 * np.sin(t * 2.4 * math.pi + .6)) + rng.normal(0, 1, n) * (40 + 120 * (1 - t))
    size = rng.gamma(1.6, 1.6, n) * (.6 + 1.6 * t)
    def draw(d, s):
        for X, Y, r in zip(px, py, size):
            d.ellipse([(X - r) * s, (Y - r) * s, (X + r) * s, (Y + r) * s], fill=int(120 + 135 * rng.random()))
    near = layer_from_pil(w, h, draw)
    far = layer_from_pil(w, h, draw, blur=6)
    img += (near[..., None] * .8 + far[..., None] * 1.2) * AMBER
    blob(img, .82, .5, .2, .3, CORAL, .8)
    made.append(finish(img, 'gen-automation.webp', 5))

# ── 6-8. The difference cards: understand / build / stay on.
def understand():
    w, h = 1100, 880
    img = canvas(w, h)
    blob(img, .5, .78, .5, .28, DEEP, .8)
    blob(img, .36, .5, .26, .3, CORAL, .55)
    blob(img, .26, .26, .09, .11, WARM, .85)      # a single light source
    blob(img, .26, .26, .22, .26, AMBER, .3)
    made.append(finish(img, 'gen-understand.webp', 6, vignette=.95))

def build():
    w, h = 1100, 880
    img = canvas(w, h) * 1.2
    def draw(d, s):
        for i in range(30):
            x0 = -400 + i * 64
            d.line([(x0 * s, h * s), ((x0 + 900) * s, 0)], fill=60 + (i * 37) % 190,
                   width=int((1 + (i % 5 == 0) * 3) * s))
    img += glow_lines(w, h, draw, CORAL, core=.6, halo=1.2, halo_blur=16)
    blob(img, .66, .4, .2, .25, AMBER, .6)
    made.append(finish(img, 'gen-build.webp', 7))

def stay():
    w, h = 1100, 880
    img = canvas(w, h)
    x, y = grid(w, h)
    horizon = np.exp(-((y - .62) / .16) ** 2)
    img += horizon[..., None] * CORAL * .9
    img += np.exp(-((y - .6) / .04) ** 2)[..., None] * AMBER * .8
    img += (y > .62)[..., None] * (1 - y)[..., None] * DEEP * .4
    blob(img, .5, .6, .4, .1, WARM, .35)
    made.append(finish(img, 'gen-stay.webp', 8))

# ── 9. About — one vertical bloom: one person, standing in the work.
def about():
    w, h = 1000, 1100
    img = canvas(w, h)
    blob(img, .5, .62, .16, .46, CORAL, .95)
    blob(img, .5, .3, .07, .12, WARM, .7)
    blob(img, .5, .95, .5, .1, DEEP, .6)
    made.append(finish(img, 'gen-about.webp', 9))

for f in (websites, software, operations, apps, automation, understand, build, stay, about):
    f()
total = 0
for path, size in made:
    total += size
    print(f'  {os.path.basename(path):<22} {size/1024:6.1f} KB')
print(f'  total {total/1024:.0f} KB')
