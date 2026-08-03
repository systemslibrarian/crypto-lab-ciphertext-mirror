import { expect, test, type Locator, type Page } from '@playwright/test';

/**
 * Claims gate. The a11y suite proves the page is reachable; this suite proves the
 * numbers on it are true. Every headline verdict, metric and chart in the three
 * replays is re-derived from the page's own rendered values and cross-checked
 * against the other places the same quantity appears.
 *
 * The lab is explicit that its side-channel numbers are *scaled teaching
 * estimates*, so nothing here asserts an absolute break cost. What is asserted is
 * everything the lab does claim: internal consistency (a summary metric equals the
 * chart it summarizes), the direction and magnitude of each documented effect (the
 * Takeaway panels promise specific outcomes at specific settings), the mechanism
 * arithmetic shown tile by tile, and each defense/limit path reaching its stated
 * end state.
 */

/** Parse the compact numbers the charts print: "10.0K", "3.36M", "1.76B", "842". */
function parseCompact(text: string): number {
  const m = /^(-?[\d.,]+)([KMB])?$/.exec(text.trim());
  expect(m, `unparseable compact number: ${text}`).not.toBeNull();
  const n = Number(m![1]!.replace(/,/g, ''));
  const scale = { K: 1e3, M: 1e6, B: 1e9 }[m![2] ?? ''] ?? 1;
  return n * scale;
}

/** The verdict banner's <dl> metrics as a label -> value record. */
async function metrics(page: Page): Promise<Record<string, string>> {
  return page.locator('.verdict-metrics').first().evaluate((dl) => {
    const out: Record<string, string> = {};
    const kids = [...dl.children];
    for (let i = 0; i + 1 < kids.length; i += 2) {
      out[kids[i]!.textContent!.trim()] = kids[i + 1]!.textContent!.trim();
    }
    return out;
  });
}

interface BarRow {
  label: string;
  value: string;
  best: boolean;
  caption: string;
}

async function barRows(page: Page): Promise<BarRow[]> {
  return page.locator('.bar-chart-row').evaluateAll((rows) =>
    rows.map((r) => ({
      label: r.querySelector('.bar-chart-label')!.textContent!.trim(),
      value: r.querySelector('.bar-chart-value strong')!.textContent!.trim(),
      best: r.querySelector('.bar-chart-best') !== null,
      caption: r.querySelector('.bar-chart-caption')?.textContent?.trim() ?? '',
    })),
  );
}

/** Range inputs cannot be typed into; set the value and fire the events the UI listens for. */
async function setSlider(input: Locator, value: string): Promise<void> {
  await input.evaluate((el, v) => {
    const range = el as HTMLInputElement;
    range.value = v;
    range.dispatchEvent(new Event('input', { bubbles: true }));
    range.dispatchEvent(new Event('change', { bubbles: true }));
  }, value);
}

/** Click a replay's run button and wait for the run to finish (button re-enables). */
async function runReplay(page: Page, name: string): Promise<void> {
  const btn = page.getByRole('button', { name });
  await btn.click();
  await expect(btn).toBeEnabled({ timeout: 120_000 });
  await expect(page.locator('.verdict-banner').first()).toBeVisible();
}

// ─── Landing page and routing ────────────────────────────────────────────────

test('the landing page offers three paper replays and each opens its own workspace', async ({ page }) => {
  await page.goto('.');
  const cards = page.locator('.paper-card');
  await expect(cards).toHaveCount(3);
  await expect(cards.nth(0)).toContainText('Masked Comparison Leakage');
  await expect(cards.nth(1)).toContainText('Imperfect DF-Oracle');
  await expect(cards.nth(2)).toContainText('NTT + CRT RNR Blinding');
  // Each card cites its paper — the lab's "evidence, not assertion" rule.
  await expect(page.locator('.paper-card').nth(0)).toContainText('2024/060');
  await expect(page.locator('.paper-card').nth(1)).toContainText('2026/070');
  await expect(page.locator('.paper-card').nth(2)).toContainText('2025/181');
  await expect(page.locator('#replay-lab')).toHaveCount(0);

  await cards.nth(1).getByRole('button', { name: 'Open replay' }).click();
  await expect(page).toHaveURL(/\?card=imperfect-df-oracle/);
  const lab = page.locator('#replay-lab');
  await expect(lab).toBeVisible();
  // The workspace names the paper it is replaying, and the card stays highlighted.
  await expect(lab.locator('.replay-title-block')).toContainText('Imperfect DF-Oracle Replay');
  await expect(lab.locator('.replay-citation')).toHaveText('Guo, Nabokov, Johansson, ePrint 2026/070');
  await expect(page.locator('.paper-card-active')).toHaveCount(1);
  await expect(page.locator('.paper-card-active')).toHaveAttribute('data-card', 'imperfect-df-oracle');

  await page.getByRole('button', { name: 'Close replay' }).click();
  await expect(page.locator('#replay-lab')).toHaveCount(0);
  await expect(page).not.toHaveURL(/card=/);

  // The replay is a real route, not just local state: history restores it.
  await page.goBack();
  await expect(page.locator('#replay-lab')).toBeVisible();
  await expect(page.locator('.replay-title-block')).toContainText('Imperfect DF-Oracle Replay');
});

test('the decapsulation primer pins each card to the stage it attacks or defends', async ({ page }) => {
  await page.goto('.');
  const stages = page.locator('.decap-stage');
  await expect(stages).toHaveCount(5);
  const labels = await page.locator('.decap-stage-label').allTextContents();
  expect(labels[0]).toContain('Ciphertext c');
  expect(labels[1]).toContain('Decrypt');
  expect(labels[2]).toContain('Re-encrypt');
  expect(labels[3]).toContain('Compare');
  expect(labels[4]).toContain('Accept K');

  // Two attacks and one defense, each on the stage the README says it targets.
  await expect(page.locator('.decap-stage-attack')).toHaveCount(2);
  await expect(page.locator('.decap-stage-defense')).toHaveCount(1);
  await expect(stages.nth(3)).toContainText('Attacked here');
  await expect(stages.nth(3)).toContainText('Card 1 — Masked Comparison');
  await expect(stages.nth(4)).toContainText('Attacked here');
  await expect(stages.nth(4)).toContainText('Card 2 — Imperfect DF-Oracle');
  await expect(stages.nth(2)).toContainText('Defended here');
  await expect(stages.nth(2)).toContainText('Card 3 — RNR Blinding');
});

// ─── Card 1 — masked comparison leakage ──────────────────────────────────────

test('card 1: the verdict summarizes the chart it sits above, exactly', async ({ page }) => {
  test.setTimeout(180_000);
  await page.goto('.?card=masked-comparison');
  await expect(page.locator('#replay-lab')).toBeVisible();
  await runReplay(page, 'Run leakage replay');

  const rows = await barRows(page);
  expect(rows.map((r) => r.label)).toEqual(['d=0', 'd=1', 'd=2', 'd=3']);
  const m = await metrics(page);

  // "Best order" must be the row the chart marks best, and "Best estimate" must be
  // that row's own printed value — not a separately formatted number.
  const bestRows = rows.filter((r) => r.best);
  expect(bestRows).toHaveLength(1);
  expect(m['Best order']).toBe(`d=${bestRows[0]!.label.slice(2)}`);
  expect(m['Best estimate']).toBe(`${bestRows[0]!.value} traces`);
  // ...and it really is the cheapest bar.
  const values = rows.map((r) => parseCompact(r.value));
  expect(parseCompact(bestRows[0]!.value)).toBe(Math.min(...values));

  // "Average across d=0..3" must be the mean of those four bars (compact rounding
  // gives at most ~0.2% slack).
  const mean = values.reduce((a, b) => a + b, 0) / values.length;
  expect(parseCompact(m['Average across d=0..3']!)).toBeGreaterThan(mean * 0.995);
  expect(parseCompact(m['Average across d=0..3']!)).toBeLessThan(mean * 1.005);

  // The headline repeats the best estimate rather than inventing one.
  await expect(page.locator('.verdict-headline').first()).toContainText(bestRows[0]!.value);
  // The sigma metric matches the slider the run used.
  expect(m['Sigma']).toBe('0.60');

  // Seeded runs are deterministic: same seed and settings, same chart.
  await runReplay(page, 'Run leakage replay');
  expect(await barRows(page)).toEqual(rows);
});

test('card 1: order costs more, but only noise makes the orders separate', async ({ page }) => {
  test.setTimeout(240_000);
  await page.goto('.?card=masked-comparison');
  await expect(page.locator('#replay-lab')).toBeVisible();
  const sigmaA = page.getByLabel('Noise σ (Run A)', { exact: true });

  // The card's own Takeaway makes two falsifiable promises about the extremes.
  await setSlider(sigmaA, '0.2');
  await runReplay(page, 'Run leakage replay');
  const low = (await barRows(page)).map((r) => parseCompact(r.value));
  // "Set σ to 0.20 and run: the four orders barely separate."
  expect(low[3]! / low[0]!).toBeLessThan(3);

  await setSlider(sigmaA, '1.5');
  await runReplay(page, 'Run leakage replay');
  const high = (await barRows(page)).map((r) => parseCompact(r.value));
  // "Raise σ to 1.5: now d=3 costs thousands of times more than d=0."
  expect(high[3]! / high[0]!).toBeGreaterThan(1000);

  // In both regimes cost is non-decreasing in masking order, and every order is
  // more expensive under the noisier channel — the coupling the card is about.
  for (const set of [low, high]) {
    for (let i = 1; i < set.length; i += 1) expect(set[i]).toBeGreaterThanOrEqual(set[i - 1]!);
  }
  for (let i = 0; i < 4; i += 1) expect(high[i]).toBeGreaterThan(low[i]!);

  // The tier captions are the hedged, non-citable labels the lab insists on.
  const captions = (await barRows(page)).map((r) => r.caption);
  for (const c of captions) expect(c).toMatch(/^(Illustrative: |Out of replay reach)/);
  await expect(page.locator('.bar-chart-badge')).toContainText('not real-world break costs');
});

test('card 1: the mechanism strip is arithmetic, not decoration', async ({ page }) => {
  test.setTimeout(180_000);
  await page.goto('.?card=masked-comparison');
  await expect(page.locator('#replay-lab')).toBeVisible();
  await runReplay(page, 'Run leakage replay');

  const traces = page.locator('.mech-trace');
  await expect(traces).toHaveCount(6, { timeout: 60_000 });

  const decomposed = await traces.evaluateAll((rows) =>
    rows.map((row) => ({
      head: row.querySelector('.mech-trace-head')!.textContent!,
      shares: [...row.querySelectorAll('.mech-tile')].map((t) => ({
        bit: t.querySelector('.mech-tile-bit')!.textContent!,
        leak: t.querySelector('.mech-tile-leak')!.textContent!,
        calc: t.querySelector('.mech-tile-calc')!.textContent!,
      })),
      dist: row.querySelector('.mech-dist-val')!.textContent!,
    })),
  );

  for (const [i, trace] of decomposed.entries()) {
    const where = `trace ${i + 1}`;
    // The strip illustrates order d=2, so three Boolean shares.
    expect(trace.shares, where).toHaveLength(3);
    const decisionBit = Number(/decision bit b = (\d)/.exec(trace.head)![1]);
    expect(trace.head, where).toContain('split into 3 shares');

    let xor = 0;
    let product = 1;
    let slack = 0.005; // the distinguisher's own rounding
    for (const share of trace.shares) {
      const bit = Number(/bit (\d)/.exec(share.bit)![1]);
      const leak = Number(/leak ([+-][\d.]+)/.exec(share.leak)![1]);
      const [, hw, noise] = /\(([+-][\d.]+) HW ([+-][\d.]+) noise\)/.exec(share.calc)!;
      expect([0, 1], where).toContain(bit);
      // The tile's own claim: leak = centered Hamming weight + Gaussian noise.
      expect(Math.abs(Number(hw) + Number(noise) - leak), where).toBeLessThanOrEqual(0.011);
      // A Boolean share's centered Hamming weight is exactly ±0.5.
      expect(Math.abs(Number(hw)), where).toBeCloseTo(0.5, 10);
      expect(Number(hw) > 0, where).toBe(bit === 1);
      xor ^= bit;
      product *= leak;
    }
    // "XOR of the bits = b" — the strip says it; the tiles must honour it.
    expect(xor, where).toBe(decisionBit);

    // The distinguisher is the product of the leaks. Every displayed leak is rounded
    // to 2dp, so bound the propagated rounding error rather than guessing a tolerance.
    const leaks = trace.shares.map((s) => Number(/leak ([+-][\d.]+)/.exec(s.leak)![1]));
    const hi = leaks.reduce((a, l) => a * (Math.abs(l) + 0.005), 1);
    const lo = leaks.reduce((a, l) => a * Math.max(0, Math.abs(l) - 0.005), 1);
    slack += hi - lo;
    expect(Math.abs(Number(trace.dist) - product), where).toBeLessThanOrEqual(slack);
  }

  // One accumulation dot per trace shown, and the readout reports the last value.
  await expect(page.locator('.mech-accum-dot')).toHaveCount(6);
  const accum = (await page.locator('.mech-accum-track').getAttribute('aria-label'))!;
  expect(accum).toContain('After 6 traces');
  expect(Number(/running correlation is only ([\d.]+)/.exec(accum)![1])).toBeLessThanOrEqual(1);
});

test('card 1: recovered key bits accumulate, and agree with the mechanism strip', async ({ page }) => {
  test.setTimeout(240_000);
  await page.goto('.?card=masked-comparison');
  await expect(page.locator('#replay-lab')).toBeVisible();
  await expect(page.locator('.key-strip-label')).toContainText('No key bits resolved yet');
  await expect(page.locator('.key-cell')).toHaveCount(0);

  const bitInput = page.getByLabel(/Target bit/);
  const recovered = new Map<number, string>();

  for (const bit of ['0', '7', '129']) {
    await bitInput.fill(bit);
    await bitInput.dispatchEvent('change');
    await runReplay(page, 'Run leakage replay');

    // The strip's headline count, its cells, and its aria-label must all agree.
    const label = (await page.locator('.key-strip-label').textContent())!;
    const claimed = Number(/Recovered (\d+) shared-secret bit/.exec(label)![1]);
    const cells = await page.locator('.key-cell').evaluateAll((els) =>
      els.map((el) => ({
        idx: el.querySelector('.key-cell-idx')!.textContent!,
        val: el.querySelector('.key-cell-val')!.textContent!,
      })),
    );
    expect(cells).toHaveLength(claimed);
    const aria = (await page.locator('.key-strip').getAttribute('aria-label'))!;
    expect(aria.match(/bit \d+ = [01]/g) ?? []).toHaveLength(claimed);

    // The value in the cell must be a real bit, and it must match what the
    // mechanism strip independently computed for the same secret bit — the two
    // come from different functions over the same ML-KEM shared secret.
    const mech = (await page.locator('.mech-intro').textContent())!;
    const [, mechIdx, mechVal] = /bit #(\d+), value ([01])/.exec(mech)!;
    expect(mechIdx).toBe(bit);
    const cell = cells.find((c) => c.idx === `#${bit}`)!;
    expect(cell, `bit ${bit} missing from the key strip`).toBeDefined();
    expect(cell.val).toBe(mechVal);
    expect(aria).toContain(`bit ${bit} = ${mechVal}`);

    // Bits already broken stay broken as new ones are added.
    recovered.set(Number(bit), cell.val);
    expect(claimed).toBe(recovered.size);
    for (const [i, v] of recovered) expect(aria).toContain(`bit ${i} = ${v}`);
  }
});

// ─── Card 2 — imperfect decryption-failure oracle ────────────────────────────

test('card 2: a clean oracle takes everything, a coin-flip oracle takes nothing', async ({ page }) => {
  test.setTimeout(180_000);
  await page.goto('.?card=imperfect-df-oracle');
  await expect(page.locator('#replay-lab')).toBeVisible();
  const pErr = page.getByLabel('Oracle error rate', { exact: true });
  const alpha = page.getByLabel('Oracle availability', { exact: true });

  // Near-perfect oracle: the paper's premise — the key falls.
  await setSlider(pErr, '0.01');
  await setSlider(alpha, '1');
  await runReplay(page, 'Run oracle replay');
  let m = await metrics(page);
  expect(Number(m['Recovered fraction']!.replace('%', ''))).toBeGreaterThanOrEqual(90);
  await expect(page.locator('.verdict-headline').first()).toContainText('Oracle leaked the secret');
  await expect(page.locator('.verdict-label').first()).toHaveText('Leakage detected');
  expect(m['Oracle pErr / α']).toBe('0.01 / 1.00');

  // The card's own limit: at pErr → 0.5 the channel carries nothing and recovery
  // sits at coin-flip. This is the honest boundary, not a stronger claim.
  await setSlider(pErr, '0.49');
  await setSlider(alpha, '0.5');
  await runReplay(page, 'Run oracle replay');
  m = await metrics(page);
  const stalled = Number(m['Recovered fraction']!.replace('%', ''));
  expect(stalled).toBeLessThan(70);
  expect(Number(m['Avg confidence']!.replace('%', ''))).toBeLessThan(10);
  await expect(page.locator('.verdict-headline').first()).toContainText('Replay stalled');

  // A noisy, mostly-silent oracle still beats guessing — the paper's actual point.
  await setSlider(pErr, '0.2');
  await setSlider(alpha, '0.5');
  await runReplay(page, 'Run oracle replay');
  m = await metrics(page);
  expect(Number(m['Recovered fraction']!.replace('%', ''))).toBeGreaterThan(stalled);
});

test('card 2: the confidence strip and the curve agree with the verdict metrics', async ({ page }) => {
  test.setTimeout(180_000);
  await page.goto('.?card=imperfect-df-oracle');
  await expect(page.locator('#replay-lab')).toBeVisible();
  await setSlider(page.getByLabel('Oracle error rate', { exact: true }), '0.05');
  await setSlider(page.getByLabel('Oracle availability', { exact: true }), '0.6');
  await runReplay(page, 'Run oracle replay');

  const m = await metrics(page);
  const recovered = Number(m['Recovered fraction']!.replace('%', ''));

  // Headline and metric are two renderings of one number.
  await expect(page.locator('.verdict-headline').first()).toContainText(`${recovered.toFixed(1)}%`);

  // The convergence curve's own description must quote the same figure and budget.
  const curve = (await page.locator('.output-mount [role="img"]').first().getAttribute('aria-label'))!;
  expect(curve).toContain(`${recovered.toFixed(1)}%`);
  expect(curve).toContain(`over ${m['Queries used']} oracle queries`);

  // The per-component strip: one cell per secret coefficient, and its summary
  // count must equal the cells that actually exceed 50% confidence.
  const cells = await page.locator('.node-strip-cell').evaluateAll((els) =>
    els.map((el) => Number(/confidence ([\d.]+)%/.exec(el.getAttribute('title')!)![1])),
  );
  const strip = (await page.locator('.node-strip').getAttribute('aria-label'))!;
  const [, total, strong] = /across (\d+) secret components: (\d+) are above 50%/.exec(strip)!;
  expect(cells).toHaveLength(Number(total));
  expect(cells.filter((c) => c >= 50)).toHaveLength(Number(strong));

  // The average confidence metric is the mean of those same cells.
  const mean = cells.reduce((a, b) => a + b, 0) / cells.length;
  expect(Math.abs(Number(m['Avg confidence']!.replace('%', '')) - mean)).toBeLessThan(0.15);
});

test('card 2: the query budget follows the ML-KEM level', async ({ page }) => {
  test.setTimeout(180_000);
  await page.goto('.?card=imperfect-df-oracle');
  await expect(page.locator('#replay-lab')).toBeVisible();
  await runReplay(page, 'Run oracle replay');
  expect((await metrics(page))['Queries used']).toBe('180'); // default ML-KEM-768

  await page.getByLabel('ML-KEM level').selectOption('1024');
  await runReplay(page, 'Run oracle replay');
  expect((await metrics(page))['Queries used']).toBe('240');
});

test('card 2: the Tanner graph really repairs the wrong bit', async ({ page }) => {
  await page.goto('.?card=imperfect-df-oracle');
  await expect(page.locator('#replay-lab')).toBeVisible();

  // Start: exactly one variable node is wrong, and it is v2, as the caption says.
  const wrong = page.locator('.tanner-var.is-wrong');
  await expect(wrong).toHaveCount(1);
  await expect(page.locator('.tanner-step-label')).toHaveText('Start (channel readings only)');
  await expect(page.locator('.tanner-status')).toContainText('v2 is read wrong');
  await expect(page.locator('.tanner-svg')).toHaveAttribute('aria-label', /v2=1 \(wrong\)/);
  await expect(page.getByRole('button', { name: 'Previous step' })).toBeDisabled();

  // Step the real belief-propagation frames to the end.
  const next = page.getByRole('button', { name: 'Next step' });
  for (let i = 0; i < 20 && (await next.isEnabled()); i += 1) await next.click();
  await expect(next).toBeDisabled();

  // End: nothing is wrong any more, and the status says why.
  await expect(page.locator('.tanner-var.is-wrong')).toHaveCount(0);
  await expect(page.locator('.tanner-var.is-correct')).toHaveCount(6);
  await expect(page.locator('.tanner-status')).toContainText('v2 was repaired');
  await expect(page.locator('.tanner-svg')).not.toHaveAttribute('aria-label', /wrong/);

  // And it is reversible — the frames are real state, not a one-way animation.
  await page.getByRole('button', { name: 'Previous step' }).click();
  await expect(page.locator('.tanner-step-label')).toContainText('BP iteration');
});

// ─── Card 3 — RNR blinding (the defense) ─────────────────────────────────────

test('card 3: blinding collapses the correlation, and the headline matches its own ratio', async ({ page }) => {
  test.setTimeout(180_000);
  await page.goto('.?card=rnr-blinding');
  await expect(page.locator('#replay-lab')).toBeVisible();
  await runReplay(page, 'Run blinding replay');

  const m = await metrics(page);
  const meanA = Number(m['Mean |corr| Run A']);
  const meanB = Number(m['Mean |corr| Run B']);
  const ratio = Number(m['B / A ratio']);

  // The defense's whole claim: the unblinded path leaks, the blinded one does not.
  expect(meanA).toBeGreaterThan(0.5);
  expect(meanB).toBeLessThan(0.1);
  // The printed ratio really is B over A.
  expect(Math.abs(ratio - meanB / meanA)).toBeLessThan(0.01);
  // ...and the headline's percentage is that ratio, not a separate claim.
  const headline = (await page.locator('.verdict-headline').first().textContent())!;
  const reduction = Number(/is (\d+)% lower/.exec(headline)![1]);
  expect(reduction).toBe(Math.round((1 - meanB / meanA) * 100));
  await expect(page.locator('.verdict-label').first()).toHaveText('Defense holding');

  // Both curves quote the same means they were plotted from.
  const panes = await page.locator('.compare-pane [role="img"]').evaluateAll((els) =>
    els.map((el) => el.getAttribute('aria-label')!),
  );
  expect(panes[0]).toContain(`climbs to ${meanA.toFixed(3)}`);
  expect(panes[1]).toContain(`stays near ${meanB.toFixed(3)}`);

  // No fault injected: both branches report a clean state.
  expect(m['Run A state']).toBe('OK');
  expect(m['Run B state']).toBe('OK');
  expect(m['Sigma / fault']).toBe('0.60 / off');
});

test('card 3: an injected fault is caught by the blinded path and missed by the unblinded one', async ({ page }) => {
  test.setTimeout(180_000);
  await page.goto('.?card=rnr-blinding');
  await expect(page.locator('#replay-lab')).toBeVisible();
  await page.getByLabel('Enable single-bit fault injection').check();
  await runReplay(page, 'Run blinding replay');

  const m = await metrics(page);
  // The asymmetry is the point: silent corruption vs a detected abort.
  expect(m['Run A state']).toBe('TAMPERED');
  expect(m['Run B state']).toBe('ABORT');
  expect(m['Sigma / fault']).toBe('0.60 / on');
  await expect(page.locator('.verdict-headline').first()).toHaveText(
    'Blinding caught the fault — unblinded path tampered, blinded path aborted',
  );
  await expect(page.locator('.verdict-detail').first()).toContainText('Run B aborted on the integrity check');

  // Turning the fault off returns both branches to OK — the ABORT was caused by
  // the injected bit flip, not by the blinding being permanently unhappy.
  await page.getByLabel('Enable single-bit fault injection').uncheck();
  await runReplay(page, 'Run blinding replay');
  const clean = await metrics(page);
  expect(clean['Run A state']).toBe('OK');
  expect(clean['Run B state']).toBe('OK');
  // ...and the leakage numbers are unchanged, because the fault facet and the
  // side-channel facet are independent under the same seed.
  expect(clean['Mean |corr| Run A']).toBe(m['Mean |corr| Run A']);
  expect(clean['Mean |corr| Run B']).toBe(m['Mean |corr| Run B']);
});
