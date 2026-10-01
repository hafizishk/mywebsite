// Screenshot every scene in studio.html into tools/devices/out/*.png at 4/3
// density. Serve the repo root first (python3 -m http.server 8898), then:
//   node tools/devices/render.mjs && python3 tools/devices/encode.py
import { chromium } from 'playwright-core';
import { mkdirSync } from 'node:fs';

const BASE = process.env.BASE || 'http://127.0.0.1:8898/tools/devices/studio.html';
const SCENES = { websites: [1800, 760], software: [1800, 760], operations: [1800, 760], apps: [1800, 760],
  automation: [1800, 760], sitin: [1100, 880], build: [1100, 880], stay: [1100, 880], about: [1500, 1000] };
const out = new URL('./out/', import.meta.url).pathname;
mkdirSync(out, { recursive: true });

const browser = await chromium.launch({
  executablePath: process.env.CHROME || '/opt/pw-browsers/chromium-1194/chrome-linux/chrome', args: ['--no-sandbox'] });
for (const [name, [w, h]] of Object.entries(SCENES)) {
  const page = await (await browser.newContext({ viewport: { width: w, height: h }, deviceScaleFactor: 4 / 3 })).newPage();
  await page.goto(`${BASE}?scene=${name}`);
  await page.waitForSelector('body[data-ready="1"]');
  await page.locator('#scene').screenshot({ path: `${out}${name}.png` });
  console.log('rendered', name);
}
await browser.close();
