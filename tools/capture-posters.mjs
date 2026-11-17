import { mkdir, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { chromium } from 'playwright';

const base = process.env.WEATHER_PREVIEW_URL ?? 'http://127.0.0.1:4173/';
const venue = process.argv[2] ?? 'bridge';
const fixture = process.argv[3] ?? 'fog';
const destination = resolve('public/scenes');
const visualDirectory = process.env.WEATHER_VISUAL_DIR;
const browser = await chromium.launch({
  executablePath: process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE,
  args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader'],
});

try {
  await mkdir(destination, { recursive: true });
  if (visualDirectory) await mkdir(visualDirectory, { recursive: true });
  for (const [width, height, suffix] of [[1280, 720, ''], [450, 800, '-portrait']]) {
    const page = await browser.newPage({ viewport: { width, height }, reducedMotion: 'reduce' });
    const url = new URL(base);
    url.searchParams.set('fixture', fixture);
    url.searchParams.set('scene', venue);
    await page.goto(url.href);
    const scene = page.locator('#scene[data-renderer=webgl] canvas');
    if (visualDirectory) {
      await scene.waitFor();
      await page.screenshot({ path: resolve(visualDirectory, `${venue}${suffix}.png`) });
    }
    const screenshot = await scene.screenshot({ style: '.weather-panel { visibility: hidden !important; }' });
    const webp = await page.evaluate(async png => {
      const img = new Image();
      img.src = `data:image/png;base64,${png}`;
      await img.decode();
      const canvas = document.createElement('canvas');
      canvas.width = img.naturalWidth;
      canvas.height = img.naturalHeight;
      canvas.getContext('2d').drawImage(img, 0, 0);
      return canvas.toDataURL('image/webp', .88).split(',')[1];
    }, screenshot.toString('base64'));
    await writeFile(resolve(destination, `${venue}${suffix}.webp`), Buffer.from(webp, 'base64'));
    await page.close();
  }
} finally {
  await browser.close();
}
