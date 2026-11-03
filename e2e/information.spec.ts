import { expect, test } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

for (const width of [1280, 380]) {
  test(`channel endpoints and burst comparison at ${width}px`, async ({ page }) => {
    await page.setViewportSize({ width, height: 900 });
    await page.goto('./?card=imperfect-df-oracle#oracle-information');
    const section = page.locator('#oracle-information');
    await expect.poll(async () => (await section.boundingBox())?.y).toBeGreaterThanOrEqual(60);
    await expect.poll(async () => (await section.boundingBox())?.y).toBeLessThan(200);
    await expect(section.locator('[data-info="selected"]')).toContainText('0.7136');
    await expect(section.locator('[data-error="iid"]')).toHaveText('0.1158%');
    await expect(section.locator('[data-error="burst"]')).toHaveText('5.0000%');
    await page.getByLabel('Channel accuracy ρ', { exact: true }).fill('0.5');
    await expect(section.locator('[data-info="selected"]')).toContainText('0.0000');
    await expect(section.locator('[data-error="iid"]')).toHaveText('50.0000%');
    await page.getByLabel('Channel accuracy ρ', { exact: true }).fill('1');
    await expect(section.locator('[data-info="selected"]')).toContainText('1.0000');
    await page.getByLabel('True query probability q', { exact: true }).fill('0');
    await expect(section.locator('[data-info="selected"]')).toContainText('0.0000');
    await page.getByLabel('Channel accuracy ρ', { exact: true }).fill('0.8');
    await page.getByLabel('Repeated answers for one bit', { exact: true }).fill('1');
    await expect(section.locator('[data-error="iid"]')).toHaveText('20.0000%');
    await page.getByLabel('Repeated answers for one bit', { exact: true }).fill('15');
    await expect(section.locator('[data-error="burst"]')).toHaveText('20.0000%');
    await expect(section.locator('[data-error="iid"]')).not.toHaveText('20.0000%');
    expect((await new AxeBuilder({ page }).include('#oracle-information').withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa']).analyze()).violations).toEqual([]);
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  });
}
