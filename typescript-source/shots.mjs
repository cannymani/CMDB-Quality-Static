import { chromium } from 'playwright-core';
import { mkdirSync } from 'node:fs';

const OUT = '/home/ubuntu/cmdb-shots';
mkdirSync(OUT, { recursive: true });

// Only the compliance home page is active; the other screens are switched off.
const screens = [];

const browser = await chromium.connectOverCDP('http://localhost:29229');
const ctx = browser.contexts()[0] ?? (await browser.newContext());
const page = await ctx.newPage();
const errors = [];
page.on('pageerror', (e) => errors.push(String(e)));
page.on('console', (m) => {
  if (m.type() === 'error') errors.push(m.text());
});
await page.setViewportSize({ width: 1600, height: 1400 });
await page.goto('http://127.0.0.1:4180/', { waitUntil: 'networkidle' });
await page.waitForTimeout(900);

// executive dashboard, one shot per KPI tab
const kpis = ['01-dashboard-compliance', '01b-dashboard-completeness', '01c-dashboard-correctness'];
for (let i = 0; i < kpis.length; i += 1) {
  await page.locator('.kpipill').nth(i).click();
  await page.waitForTimeout(800);
  await page.evaluate(async () => {
    for (let y = 0; y < document.body.scrollHeight; y += 600) {
      window.scrollTo(0, y);
      await new Promise((r) => setTimeout(r, 80));
    }
    window.scrollTo(0, 0);
  });
  await page.locator('.chart-head').scrollIntoViewIfNeeded();
  await page.waitForFunction(() => document.querySelectorAll('.recharts-line').length > 3);
  await page.waitForTimeout(1200);
  await page.evaluate(() => window.scrollTo(0, 0));
  await page.waitForTimeout(400);
  await page.screenshot({ path: `${OUT}/${kpis[i]}.png`, fullPage: true });
  console.log('shot', kpis[i]);
}
await page.locator('.kpipill').nth(0).click();
await page.waitForTimeout(500);
await page.screenshot({ path: `${OUT}/00-dashboard-above-fold.png` });
console.log('shot 00-dashboard-above-fold');

for (const [label, file] of screens) {
  await page.selectOption('.viewsel select', { label });
  await page.waitForTimeout(900);
  await page.screenshot({ path: `${OUT}/${file}.png`, fullPage: true });
  console.log('shot', file);
}

console.log('errors:', errors.length, errors.slice(0, 5));
await page.close();
await browser.close();
