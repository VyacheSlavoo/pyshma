// Скриншоты и проверка вёрстки в Chromium: node tools/shots.mjs [dist-dir] [--pages=/,/price/] [--out=dir]
// Для каждой страницы и ширины 320/375/430/1280: горизонтальный скролл, выход элементов за экран, размер тап-зон CTA.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright-core';
import { serve } from './serve.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const args = process.argv.slice(2);
const dir = args.find((a) => !a.startsWith('--')) ?? 'dist';
const out = path.resolve(args.find((a) => a.startsWith('--out='))?.slice(6) ?? path.join(root, '.cache/shots'));
const only = args.find((a) => a.startsWith('--pages='))?.slice(8).split(',');
const widths = (args.find((a) => a.startsWith('--widths='))?.slice(9).split(',') ?? ['320', '375', '430', '1280']).map(Number);
const full = !args.includes('--viewport');
fs.mkdirSync(out, { recursive: true });

const { server, port } = await serve(dir);
const pages = JSON.parse(fs.readFileSync(path.join(root, '.cache', `pages-${path.basename(path.resolve(root, dir))}.json`), 'utf8')).map((p) => p.url);
const list = only ?? pages;
const browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH || '/opt/pw-browsers/chromium', headless: true, args: ['--no-sandbox'] });
const problems = [];
for (const w of widths) {
  const ctx = await browser.newContext({ viewport: { width: w, height: w >= 1000 ? 900 : 800 }, deviceScaleFactor: 1, isMobile: w < 700, hasTouch: w < 700 });
  const page = await ctx.newPage();
  page.on('pageerror', (e) => problems.push(`${w}px: JS-ошибка ${e.message}`));
  for (const url of list) {
    await page.goto(`http://127.0.0.1:${port}${url}`, { waitUntil: 'networkidle' });
    // в скриншотах lazy-картинки грузим сразу и ждём, пока все декодируются
    await page.evaluate(() => { document.querySelectorAll('img[loading=lazy]').forEach((i) => { i.loading = 'eager'; }); });
    await page.waitForFunction(() => [...document.images].filter((i) => !i.closest('dialog, template')).every((i) => i.complete && i.naturalWidth > 0), null, { timeout: 15000 }).catch(() => {});
    await page.evaluate(async () => { await Promise.all([...document.images].map((i) => (i.decode ? i.decode().catch(() => {}) : 1))); });
    await page.waitForTimeout(250);
    const r = await page.evaluate(() => {
      const vw = document.documentElement.clientWidth;
      const over = [];
      for (const el of document.querySelectorAll('body *')) {
        const b = el.getBoundingClientRect();
        if (b.width && b.right > vw + 1 && getComputedStyle(el).position !== 'fixed') {
          // внутри прокручиваемой обёртки таблицы это допустимо
          if (el.closest('.table-wrap, .callout, .skip, dialog, template')) continue;
          over.push(`${el.tagName.toLowerCase()}.${(el.className || '').toString().split(' ')[0]} right=${Math.round(b.right)}`);
          if (over.length > 3) break;
        }
      }
      const small = (window.innerWidth >= 700 ? [] : [...document.querySelectorAll('a.btn, button.btn, .nav__link, .mbar .btn')]).filter((el) => { const b = el.getBoundingClientRect(); return b.width && b.height && (b.height < 40 || b.width < 40) && getComputedStyle(el).display !== 'none'; }).map((el) => `${el.textContent.trim().slice(0, 20)} ${Math.round(el.getBoundingClientRect().width)}x${Math.round(el.getBoundingClientRect().height)}`);
      const broken = [...document.images].filter((i) => !i.closest('dialog, template') && i.complete && i.naturalWidth === 0).map((i) => i.currentSrc || i.src);
      return { scrollW: document.documentElement.scrollWidth, vw, over, small: small.slice(0, 4), broken };
    });
    if (r.scrollW > r.vw + 1) problems.push(`${w}px ${url}: горизонтальный скролл ${r.scrollW}>${r.vw}; ${r.over.join('; ')}`);
    else if (r.over.length) problems.push(`${w}px ${url}: элементы за краем: ${r.over.join('; ')}`);
    if (r.broken.length) problems.push(`${w}px ${url}: не загрузились картинки: ${r.broken.join('; ')}`);
    if (r.small.length) problems.push(`${w}px ${url}: мелкие тап-зоны: ${r.small.join('; ')}`);
    const name = `${url === '/' ? 'home' : url.replace(/^\/|\/$|\.html$/g, '').replace(/\//g, '_')}-${w}.png`;
    await page.screenshot({ path: path.join(out, name), fullPage: full });
  }
  await ctx.close();
}
await browser.close(); server.close();
console.log(problems.length ? `Замечания (${problems.length}):\n${problems.join('\n')}` : 'Вёрстка: горизонтального скролла и мелких тап-зон нет');
console.log(`Скриншоты: ${path.relative(root, out)}`);
process.exit(problems.length ? 2 : 0);
