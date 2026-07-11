import AxeBuilder from '@axe-core/playwright';
import { expect, test, type Page } from '@playwright/test';

/**
 * WCAG regression gate. Deploys are already gated on the NIST KAT vectors;
 * this gates them on accessibility the same way. Scans the full page in both
 * themes with every collapsible region revealed.
 *
 * This lab has no <details>: the replay workspace (containing the <select>,
 * run buttons, result/reality panels, etc.) is a separate view opened by
 * clicking a paper card's "open" button. We open a card so that content is
 * present in the DOM and scanned, then reveal any class-toggled or [hidden]
 * regions before scanning. We also neutralize reveal animations that start
 * from opacity:0 so panels are scanned settled rather than mid-transition.
 */

const TAGS = ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'];

async function revealAll(page: Page): Promise<void> {
  // Open the first paper card so its replay workspace renders into the DOM.
  const opener = page.locator('.open-btn').first();
  if (await opener.count()) {
    await opener.click();
    // Wait for the replay workspace (with its controls) to mount.
    await page.locator('#replay-lab').waitFor({ state: 'visible' });
  }
  await page.evaluate(() => {
    // Expand any native disclosure widgets, if present.
    for (const details of document.querySelectorAll('details')) {
      (details as HTMLDetailsElement).open = true;
    }
    // Neutralize any reveal/transition animations that start from opacity:0 so
    // panels are scanned in their settled, fully-opaque state.
    const style = document.createElement('style');
    style.textContent =
      '*,*::before,*::after{animation:none !important;transition:none !important;}' +
      '[hidden]{}';
    document.head.appendChild(style);
    // Reveal any class-toggled / [hidden] panels so hidden content is scanned.
    for (const el of document.querySelectorAll('[hidden]')) {
      el.removeAttribute('hidden');
    }
  });
}

async function scan(page: Page): Promise<void> {
  const results = await new AxeBuilder({ page }).withTags(TAGS).analyze();
  const summary = results.violations.map((v) => ({
    id: v.id,
    impact: v.impact,
    help: v.help,
    nodes: v.nodes.map((n) => n.target.join(' ')).slice(0, 5),
  }));
  expect(summary).toEqual([]);
}

test('no WCAG A/AA violations in dark theme', async ({ page }) => {
  await page.goto('.');
  await revealAll(page);
  await scan(page);
});

test('no WCAG A/AA violations in light theme', async ({ page }) => {
  await page.goto('.');
  await page.locator('#cl-theme-toggle').click();
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'light');
  await revealAll(page);
  await scan(page);
});
