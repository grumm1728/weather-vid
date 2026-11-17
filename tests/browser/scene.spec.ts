import { expect, test } from '@playwright/test';

test('opens scene previews from live settings, shares selections and restores hidden controls', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 800 });
  await page.route('https://api.open-meteo.com/**', route => route.abort());
  await page.goto('./');
  await page.getByText('Display settings', { exact: true }).click();
  await page.getByRole('link', { name: 'Preview weather animations' }).click();
  await page.getByLabel('Preview scene').selectOption('landscape');
  await page.getByLabel('Weather fixture').selectOption('snow');
  await expect(page).toHaveURL(/fixture=snow&scene=landscape/);
  await expect(page.locator('#condition')).toHaveText('Snow');
  await expect(page.locator('#weather-status')).toHaveText('Weather preview');
  await page.getByRole('button', { name: 'Hide controls' }).click();
  await expect(page.locator('#weather-panel')).toBeHidden();
  await expect(page.locator('#display')).toHaveCSS('background-color', 'rgb(0, 0, 0)', { timeout: 1500 });
  expect(await page.locator('#scene').boundingBox()).toEqual({ x: 39, y: 80, width: 312, height: 640 });
  await page.keyboard.press('Tab');
  await expect(page.getByRole('button', { name: 'Show controls' })).toBeFocused();
  await page.keyboard.press('Escape');
  await expect(page.getByRole('button', { name: 'Hide controls' })).toBeFocused();
  expect(await page.locator('#scene').boundingBox()).toEqual({ x: 0, y: 0, width: 390, height: 800 });
  await page.getByRole('button', { name: 'Hide controls' }).click();
  await page.dispatchEvent('#show-controls', 'click', { pointerType: 'touch' });
  await expect(page.getByRole('link', { name: 'Return to live weather' })).toBeVisible();
  await page.getByRole('link', { name: 'Return to live weather' }).click();
  expect(new URL(page.url()).searchParams.has('fixture')).toBe(false);
});

test('contains the live canvas and fallback poster within the black surround', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.setViewportSize({ width: 390, height: 800 });
  await page.goto('./?fixture=storm&scene=theatre&controls=hidden');
  await expect(page.locator('#display')).toHaveCSS('background-color', 'rgb(0, 0, 0)');
  await expect(page.locator('meta[name="theme-color"]')).toHaveAttribute('content', '#000000');
  await expect(page.locator('#scene')).toHaveAttribute('data-renderer', 'webgl');
  expect(await page.locator('#scene canvas').boundingBox()).toEqual({ x: 39, y: 80, width: 312, height: 640 });
  await page.route('**/scenes/theatre.glb', route => route.abort());
  await page.reload();
  await expect(page.locator('#poster')).toBeVisible();
  await expect(page.locator('#poster')).toHaveCSS('object-fit', 'contain');
  expect(await page.locator('#poster').boundingBox()).toEqual({ x: 39, y: 80, width: 312, height: 640 });
  await page.goto('./?fixture=storm&scene=theatre&display=ghost&controls=hidden');
  await page.keyboard.press('Escape');
  await expect(page.getByLabel('Pepper’s ghost display')).toBeChecked();
  await expect(page.locator('#display')).toHaveCSS('background-color', 'rgb(0, 0, 0)');
});

test('uses the detailed render by default and retains the fixture comparison setting', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('./?fixture=rain-night&scene=theatre');
  await expect(page.locator('#scene')).toHaveAttribute('data-renderer', 'webgl');
  const canvas = page.locator('#scene canvas');
  await expect(canvas).toHaveAttribute('width', '319');
  await expect(canvas).toHaveAttribute('height', '692');
  await page.goto('./?fixture=rain-night&scene=theatre&quality=baseline');
  await expect(page.locator('#scene')).toHaveAttribute('data-renderer', 'webgl');
  await expect(canvas).toHaveAttribute('width', '265');
  await expect(canvas).toHaveAttribute('height', '573');
});

test('reports the storm frame-rate benchmark only for opted-in fixtures', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto('./?fixture=storm&scene=theatre');
  await expect(page.locator('#frame-benchmark')).toHaveCount(0);
  await page.goto('./?fixture=storm&scene=theatre&benchmark=1');
  await expect(page.locator('#scene')).toHaveAttribute('data-renderer', 'webgl');
  await expect(page.locator('#frame-benchmark')).toHaveText(/Measuring frame rate/);
  await page.getByText('Display settings', { exact: true }).click();
  await page.getByLabel('Pause animation').uncheck();
  await expect(page.locator('#frame-benchmark')).toHaveText(/Median frame rate: \d+\.\d fps/, { timeout: 15_000 });
});

test('renders the model through a nested base and supports keyboard fixture and pause controls', async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', error => errors.push(error.message));
  page.on('console', message => {
    if (message.type() === 'error') errors.push(message.text());
  });
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto('./?fixture=fog');
  await expect(page.locator('#scene')).toHaveAttribute('data-renderer', 'webgl');
  await expect(page.getByRole('heading', { name: 'Golden Gate Bridge' })).toBeVisible();
  await expect(page.locator('#condition')).toHaveText('Fog');
  await expect(page.locator('#temperature')).toHaveText('58°F');
  await page.keyboard.press('Tab');
  const settings = page.getByText('Display settings', { exact: true });
  await expect(settings).toBeFocused();
  await page.keyboard.press('Enter');
  await expect(page.getByLabel('Pause animation')).toBeChecked();
  await page.keyboard.press('Tab');
  await expect(page.getByLabel('Pause animation')).toBeFocused();
  await page.keyboard.press('Space');
  await expect(page.getByLabel('Pause animation')).not.toBeChecked();
  await page.getByLabel('Pause weather updates').check();
  await expect(page.getByRole('status')).toHaveText(/updates paused/i);
  await page.getByLabel('Weather fixture').selectOption('rain-night');
  await expect(page.locator('#condition')).toHaveText('Rain');
  await expect(page.locator('#temperature')).toHaveText('53°F');
  expect(errors).toEqual([]);
});

test('shows a loaded still and keeps controls when WebGL2 is unavailable', async ({ page }) => {
  await page.addInitScript(() => {
    const getContext = HTMLCanvasElement.prototype.getContext;
    Object.defineProperty(HTMLCanvasElement.prototype, 'getContext', {
      value(this: HTMLCanvasElement, kind: string, ...options: unknown[]) {
        return kind === 'webgl2' ? null : Reflect.apply(getContext, this, [kind, ...options]);
      },
    });
  });
  await page.goto('./?fixture=clear-day');
  await expect(page.locator('#scene')).toHaveAttribute('data-renderer', 'still');
  await expect.poll(() => page.locator('#poster').evaluate((image: HTMLImageElement) => image.naturalWidth)).toBeGreaterThan(0);
  await page.getByText('Display settings', { exact: true }).click();
  await page.getByLabel('Weather fixture').selectOption('neutral');
  await expect(page.locator('#condition')).toHaveText('Weather unavailable');
});

test('shows the still when the model cannot load', async ({ page }) => {
  let requests = 0;
  await page.route('**/scenes/bridge.glb', route => {
    requests += 1;
    return route.abort('failed');
  });
  await page.goto('./?fixture=clear-night');
  await expect.poll(() => requests).toBe(1);
  await expect(page.locator('#scene')).toHaveAttribute('data-renderer', 'still');
  await expect(page.locator('#poster')).toBeVisible();
  await expect(page.getByText('Display settings', { exact: true })).toBeVisible();
});

test('switches to the still on context loss and returns when WebGL is restored', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto('./?fixture=fog');
  await expect(page.locator('#scene')).toHaveAttribute('data-renderer', 'webgl');
  await page.locator('#scene canvas').evaluate((canvas: HTMLCanvasElement) => {
    const extension = canvas.getContext('webgl2')?.getExtension('WEBGL_lose_context');
    if (!extension) throw new Error('Test browser does not expose WEBGL_lose_context');
    canvas.addEventListener('webglcontextlost', () => setTimeout(() => extension.restoreContext(), 1200), { once: true });
    extension.loseContext();
  });
  await expect(page.locator('#scene')).toHaveAttribute('data-renderer', 'still');
  await expect(page.locator('#poster')).toBeVisible();
  await expect(page.locator('#scene')).toHaveAttribute('data-renderer', 'webgl');
});
