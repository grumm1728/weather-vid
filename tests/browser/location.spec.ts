import { expect, test } from '@playwright/test';

const forecast = 'https://api.open-meteo.com/v1/forecast?**';
const places = 'https://geocoding-api.open-meteo.com/v1/search?**';
const weather = (temperature: number) => ({
  current: { time: Math.floor(Date.now() / 1000), weather_code: 0, is_day: 1, temperature_2m: temperature },
  timezone: 'America/Los_Angeles',
});

test('searches, disambiguates and restores a generic location while preserving the Oakland landmark preset', async ({ page }) => {
  const fetches: string[] = [];
  await page.route(forecast, route => {
    const latitude = new URL(route.request().url()).searchParams.get('latitude')!;
    fetches.push(latitude);
    const temperature = latitude === '37.8199' ? 58 : latitude === '37.811' ? 63 : 65;
    return route.fulfill({ json: weather(temperature) });
  });
  await page.route(places, route => {
    const query = new URL(route.request().url()).searchParams.get('name');
    if (query === 'offline') return route.abort();
    if (query !== 'Oakland') return route.fulfill({ json: {} });
    return route.fulfill({ json: { results: [
      { id: 5378538, name: 'Oakland', latitude: 37.8044, longitude: -122.2712, admin1: 'California', country: 'United States' },
      { id: 4364362, name: 'Oakland', latitude: 39.4079, longitude: -79.4067, admin1: 'Maryland', country: 'United States' },
    ] } });
  });

  await page.goto('./');
  await expect(page.locator('#temperature')).toHaveText('58°F');
  await expect(page.locator('#scene')).toHaveAttribute('data-scene', 'bridge');
  await page.getByText('Change location', { exact: true }).click();
  const query = page.getByLabel('City or postal code');
  await query.fill('Nowhere');
  await query.press('Enter');
  await expect(page.locator('#search-status')).toHaveText('No places found.');
  await query.fill('offline');
  await query.press('Enter');
  await expect(page.locator('#search-status')).toHaveText('Search unavailable. Try again.');
  await expect(page.locator('#temperature')).toHaveText('58°F');
  await query.fill('Oakland');
  await query.press('Enter');
  await expect(page.locator('#search-results button')).toHaveCount(2);
  await page.locator('#search-results button').filter({ hasText: 'California' }).click();
  await expect(page.getByRole('heading', { name: 'Oakland' })).toBeVisible();
  await expect(page.locator('#scene')).toHaveAttribute('data-scene', 'landscape');
  await expect(page.locator('#temperature')).toHaveText('65°F');

  await page.reload();
  await expect(page.getByRole('heading', { name: 'Oakland' })).toBeVisible();
  await expect(page.locator('#temperature')).toHaveText('65°F');
  await page.getByText('Change location', { exact: true }).click();
  await page.getByRole('button', { name: 'Grand Lake Theater' }).click();
  await expect(page.locator('#scene')).toHaveAttribute('data-scene', 'theatre');
  await expect(page.locator('#temperature')).toHaveText('63°F');
  expect(fetches).toEqual(['37.8199', '37.8044', '37.8044', '37.811']);
});

test('uses an unavailable state for the new location after a failed first lookup', async ({ page }) => {
  await page.route(forecast, route => {
    const latitude = new URL(route.request().url()).searchParams.get('latitude');
    return latitude === '37.811' ? route.fulfill({ status: 503 }) : route.fulfill({ json: weather(58) });
  });
  await page.addInitScript(() => {
    Object.defineProperty(window, 'localStorage', { get() { throw new DOMException('Disabled', 'SecurityError'); } });
  });
  await page.goto('./');
  await expect(page.locator('#temperature')).toHaveText('58°F');
  await page.getByText('Change location', { exact: true }).click();
  await page.getByRole('button', { name: 'Grand Lake Theater' }).click();
  await expect(page.getByRole('heading', { name: 'Grand Lake Theater' })).toBeVisible();
  await expect(page.locator('#condition')).toHaveText('Weather unavailable');
  await expect(page.locator('#temperature')).toHaveText('');
  await expect(page.getByRole('button', { name: 'Retry weather' })).toBeVisible();
});
