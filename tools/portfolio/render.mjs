// Render every scene in tools/portfolio/studio.html to assets/work/*.webp.
// Serve the repo root on :8898 first. Needs playwright-core + Pillow (python3.13).
import { chromium } from 'playwright-core';
import { mkdirSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
const BASE = process.env.BASE || 'http://127.0.0.1:8898/tools/portfolio/studio.html';
const out = new URL('../../assets/work/', import.meta.url).pathname;
const tmp = new URL('./.raw/', import.meta.url).pathname;
mkdirSync(out, { recursive: true }); mkdirSync(tmp, { recursive: true });
const browser = await chromium.launch({ executablePath: process.env.CHROME, args: ['--no-sandbox'] });
const probe = await browser.newPage(); await probe.goto(BASE + '?scene=sq-kf');
await probe.waitForSelector('body[data-ready="1"]');
const names = await probe.evaluate(() => window.SCENE_NAMES);
for (const name of names) {
  const [w, h] = await probe.evaluate(n => { const s = n.split('-')[0]; return s === 'sq' ? [540, 540] : s === 'pt' ? [600, 780] : [1600, 1000]; }, name);
  const page = await (await browser.newContext({ viewport: { width: w, height: h }, deviceScaleFactor: name.startsWith('ls') ? 1 : 4 / 3 })).newPage();
  await page.goto(`${BASE}?scene=${name}`); await page.waitForSelector('body[data-ready="1"]');
  await page.locator('#scene').screenshot({ path: `${tmp}${name}.png` });
}
await browser.close();
execFileSync(process.env.PY || '/usr/bin/python3.13', ['-I', '-c', `
import glob,os,sys
from PIL import Image
t=0
for p in sorted(glob.glob(sys.argv[1]+'*.png')):
    n=os.path.basename(p)[:-4]; d=sys.argv[2]+n+'.webp'
    Image.open(p).convert('RGB').save(d,'WEBP',quality=80,method=6); t+=os.path.getsize(d)
    print(f'  {n:<14} {Image.open(p).size}  {os.path.getsize(d)/1024:5.1f} KB')
print(f'  total {t/1024:.0f} KB')`, tmp, out], { stdio: 'inherit' });
