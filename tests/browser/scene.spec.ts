import { expect, test } from '@playwright/test';

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
