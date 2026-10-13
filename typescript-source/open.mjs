import { chromium } from 'playwright-core';
const b = await chromium.connectOverCDP('http://127.0.0.1:29229');
const ctx = b.contexts()[0];
const page = ctx.pages()[0] ?? (await ctx.newPage());
await page.goto('http://127.0.0.1:4180/', { waitUntil: 'networkidle' });
await page.bringToFront();
console.log(await page.title());
await b.close();
