// Сборка статического сайта: node src/build.mjs [--fixture] [--date=YYYY-MM-DD]
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';
import { transform } from 'esbuild';

import { loadData } from './lib/data.mjs';
import { dateRu, markSlug } from './lib/util.mjs';
import { processPhotos, brandAssets } from './lib/images.mjs';
import { pageShell } from './lib/layout.mjs';
import { sitemapXml, robotsTxt, htaccess, assetsHtaccess, breadcrumbLd } from './lib/seo.mjs';
import { home } from './pages/home.mjs';
import { pricePage, categoryPage, markPage } from './pages/catalog.mjs';
import { rentalPage, deliveryPage, cityPage, galleryPage } from './pages/service.mjs';
import { contactsPage, aboutPage, privacyPage, consentPage, thanksPage, notFoundPage } from './pages/static.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const args = process.argv.slice(2);
const fixture = args.includes('--fixture');
const preview = args.includes('--preview');
const dateArg = args.find((a) => a.startsWith('--date='));
const now = dateArg ? new Date(`${dateArg.slice(7)}T00:00:00Z`) : new Date();
const contentDir = path.join(root, fixture ? 'tests/fixture/content' : 'content');
const outDir = path.join(root, fixture ? 'dist-fixture' : preview ? 'dist-preview' : 'dist');
const hash = (buf) => crypto.createHash('sha1').update(buf).digest('hex').slice(0, 8);

if (fixture && !fs.existsSync(path.join(contentDir, 'photos', 'hero.jpg'))) {
  spawnSync(process.execPath, [path.join(root, 'tests/fixture/make-photos.mjs')], { stdio: 'inherit' });
}

const ctx = loadData({ contentDir, now, fixture, preview });
for (const w of ctx.warnings) console.warn(`⚠ ${w}`);
if (ctx.errors.length) {
  console.error(`\nСборка остановлена: данные точки заполнены не полностью (${ctx.errors.length}).\n`);
  for (const e of ctx.errors) console.error(`  ✗ ${e}`);
  console.error('\nОписание полей: docs/BRIEF.md. Ничего не выдумываем: впишите реальные данные.\n');
  process.exit(1);
}

fs.rmSync(outDir, { recursive: true, force: true });
fs.mkdirSync(path.join(outDir, 'assets', 'fonts'), { recursive: true });

// ассеты с хешем
const css = await transform(fs.readFileSync(path.join(root, 'src/assets/css/site.css'), 'utf8'), { loader: 'css', minify: true });
const js = await transform(fs.readFileSync(path.join(root, 'src/assets/js/site.js'), 'utf8'), { loader: 'js', minify: true, target: 'es2018' });
const icons = fs.readFileSync(path.join(root, 'src/assets/icons.svg'));
const cssName = `site.${hash(css.code)}.css`, jsName = `site.${hash(js.code)}.js`, iconsName = `icons.${hash(icons)}.svg`;
fs.writeFileSync(path.join(outDir, 'assets', cssName), css.code);
fs.writeFileSync(path.join(outDir, 'assets', jsName), js.code);
fs.writeFileSync(path.join(outDir, 'assets', iconsName), icons);
for (const f of fs.readdirSync(path.join(root, 'src/assets/fonts'))) fs.copyFileSync(path.join(root, 'src/assets/fonts', f), path.join(outDir, 'assets/fonts', f));

ctx.images = await processPhotos(ctx.photos, outDir);
const heroPhoto = ctx.photos.find((p) => p.role === 'hero');
const brand = await brandAssets({ brand: ctx.site.brand, hero: ctx.images.get(heroPhoto.file), outDir });
ctx.assets = { css: `/assets/${cssName}`, js: `/assets/${jsName}`, icons: `/assets/${iconsName}`, ...brand };
ctx.priceDateRu = dateRu(ctx.priceDate);
ctx.gallery = ctx.photos.length > 1;

// страницы
const pages = [home(ctx), pricePage(ctx)];
for (const cat of ctx.categories) pages.push(categoryPage(ctx, cat));
for (const m of ctx.markPages) pages.push(markPage(ctx, m));
if (ctx.rental) pages.push(rentalPage(ctx));
pages.push(deliveryPage(ctx));
if (ctx.gallery) pages.push(galleryPage(ctx));
for (const c of ctx.cities) pages.push(cityPage(ctx, c));
pages.push(contactsPage(ctx), aboutPage(ctx), privacyPage(ctx), consentPage(ctx), thanksPage(ctx), notFoundPage(ctx));

// порядок sitemap: как в навигации
const seen = new Set();
for (const p of pages) {
  if (p.url !== '/' && p.crumbs?.length && !p.noindex) p.jsonld = [...(p.jsonld || []), breadcrumbLd(ctx, p)];
  if (seen.has(p.url)) throw new Error(`Повторяющийся URL ${p.url}`);
  seen.add(p.url);
  const file = p.url.endsWith('/') ? path.join(outDir, p.url, 'index.html') : path.join(outDir, p.url);
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, pageShell(ctx, p).toString());
}

fs.writeFileSync(path.join(outDir, 'sitemap.xml'), sitemapXml(ctx, pages));
fs.writeFileSync(path.join(outDir, 'robots.txt'), robotsTxt(ctx));
fs.writeFileSync(path.join(outDir, '.htaccess'), htaccess(ctx));
fs.writeFileSync(path.join(outDir, 'assets', '.htaccess'), assetsHtaccess);
fs.copyFileSync(path.join(root, 'server/send.php'), path.join(outDir, 'send.php'));
fs.copyFileSync(path.join(root, 'server/send.config.example.php'), path.join(outDir, 'send.config.example.php'));
fs.mkdirSync(path.join(root, '.cache'), { recursive: true });
fs.writeFileSync(path.join(root, '.cache', `pages-${path.basename(outDir)}.json`), JSON.stringify(pages.map((p) => ({ url: p.url, title: p.title, description: p.description, h1: p.h1, noindex: !!p.noindex, inSitemap: p.inSitemap !== false })), null, 1));

const kb = (n) => `${(n / 1024).toFixed(1)} КБ`;
console.log(`\nГотово: ${path.relative(root, outDir)}/  страниц: ${pages.length}  (CSS ${kb(css.code.length)}, JS ${kb(js.code.length)})`);
for (const p of pages) console.log(`  ${p.url}`);
if (fixture) console.log('\nСборка на ТЕСТОВЫХ данных: noindex, в прод не выкладывать.');
if (preview) console.log(`\nПРЕДПРОСМОТР: не для публикации. Подставлено временно: ${ctx.assumed.join(', ') || 'ничего'}.`);
