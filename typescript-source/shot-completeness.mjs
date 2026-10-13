import { chromium } from 'playwright-core';

const b = await chromium.connectOverCDP('http://localhost:29229');
const ctx = b.contexts()[0];
const page = await ctx.newPage();
const errs = [];
page.on('console', (m) => m.type() === 'error' && errs.push(m.text()));
page.on('pageerror', (e) => errs.push(String(e)));
await page.setViewportSize({ width: 1600, height: 1100 });
await page.goto('http://127.0.0.1:4180/', { waitUntil: 'networkidle' });
await page.click('.kpipill:nth-child(2)');
await page.waitForTimeout(1200);
await page.screenshot({ path: '/home/ubuntu/cmdb-shots/completeness-top.png' });
await page.screenshot({ path: '/home/ubuntu/cmdb-shots/completeness-full.png', fullPage: true });
// attribute gaps mode
const gaps = page.locator('.seg button', { hasText: 'Attribute gaps' });
await gaps.click();
await page.waitForTimeout(600);
await page.screenshot({ path: '/home/ubuntu/cmdb-shots/completeness-gaps.png', fullPage: true });
// switch pillar to Data Center
await page.locator('.svc-card', { hasText: 'Data Center' }).click();
await page.waitForTimeout(600);
await page.screenshot({ path: '/home/ubuntu/cmdb-shots/completeness-dc.png', fullPage: true });
console.log('errors:', JSON.stringify(errs));
await page.close();
await b.close();
