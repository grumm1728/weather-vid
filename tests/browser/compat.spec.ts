import { expect, test } from '@playwright/test';

for (const fixture of [
  { scene: 'bridge', name: 'Golden Gate Bridge', weather: 'fog', label: 'Fog' },
  { scene: 'theatre', name: 'Grand Lake Theater', weather: 'rain-night', label: 'Rain' },
  { scene: 'landscape', name: 'Generic landscape', weather: 'snow', label: 'Snow' },
]) {
  test(`${fixture.scene} works at desktop and portrait sizes with reduced motion`, async ({ page }) => {
    const errors: string[] = [];
    const loadedModels: string[] = [];
    page.on('pageerror', error => errors.push(error.message));
    page.on('request', request => {
      const { pathname } = new URL(request.url());
      if (pathname.endsWith('.glb')) loadedModels.push(pathname);
    });
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await page.goto(`./?fixture=${fixture.weather}&scene=${fixture.scene}`);
    await expect(page.getByRole('heading', { name: fixture.name })).toBeVisible();
    await expect(page.locator('#condition')).toHaveText(fixture.label);
    const supported = await page.evaluate(() => !!document.createElement('canvas').getContext('webgl2'));
    await expect(page.locator('#scene')).toHaveAttribute('data-renderer', supported ? 'webgl' : 'still');
    expect(loadedModels).toEqual(supported ? [`/miniatures/scenes/${fixture.scene}.glb`] : []);
    if (!supported) {
      await expect.poll(() => page.locator('#poster').evaluate((image: HTMLImageElement) => image.naturalWidth))
        .toBeGreaterThan(0);
    }
    await page.setViewportSize({ width: 390, height: 844 });
    const bounds = await page.locator('.weather-panel').boundingBox();
    expect(bounds).toBeTruthy();
    expect(bounds!.x + bounds!.width).toBeLessThanOrEqual(390);
    expect(bounds!.y + bounds!.height).toBeLessThanOrEqual(844);
    await page.keyboard.press('Tab');
    await expect(page.getByText('Display settings', { exact: true })).toBeFocused();
    await page.keyboard.press('Enter');
    await expect(page.getByLabel('Pause animation')).toBeChecked();
    await expect(page.getByLabel('Pause weather updates')).toBeVisible();
    expect(errors).toEqual([]);
  });
}
