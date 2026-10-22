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
import { articlesIndex, articlePage } from './pages/articles.mjs';
import { loadArticles } from './lib/articles.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const args = process.argv.slice(2);
const fixture = args.includes('--fixture');
const preview = args.includes('--preview');
const demo = args.includes('--demo'); // сборка для просмотра с диска: относительные ссылки, форма работает вхолостую
const dateArg = args.find((a) => a.startsWith('--date='));
const now = dateArg ? new Date(`${dateArg.slice(7)}T00:00:00Z`) : new Date();
const contentDir = process.env.CONTENT_DIR ? path.resolve(process.env.CONTENT_DIR) : path.join(root, fixture ? 'tests/fixture/content' : 'content');
const outDir = path.join(root, fixture ? 'dist-fixture' : preview ? 'dist-preview' : demo ? 'dist-demo' : 'dist');
// Демо-сборка открывается с диска или с любого адреса: корневые ссылки (/price/, /assets/...) становятся относительными.
function relativize(html, url) {
  const depth = url.split('/').filter((x) => x && !x.endsWith('.html')).length;
  const up = depth === 0 ? './' : '../'.repeat(depth);
  const fix = (p) => {
    const [pathPart, hashPart] = [p.split('#')[0], p.includes('#') ? `#${p.split('#').slice(1).join('#')}` : ''];
    const rel = pathPart.replace(/^\//, '');
    if (rel === '' || rel.endsWith('/')) return `${up}${rel}index.html${hashPart}`;
    return `${up}${rel}${hashPart}`;
  };
  const sprite = fs.readFileSync(path.join(root, 'src/assets/icons.svg'), 'utf8').replace(/<\?xml[^>]*>/, '').replace('<svg ', '<svg aria-hidden="true" ');
  return html
    .replace(/<link rel="preload"[^>]*>\n?/g, '')
    .replace(/(<use href=")\/[^"#]*(#)/g, '$1$2')
    .replace(/data-icons="[^"]*"/g, 'data-icons=""')
    .replace('<body>', `<body>\n${sprite}`)
    .replace(/\b(href|src|action)="(\/(?!\/)[^"]*)"/g, (m, a, p) => `${a}="${fix(p)}"`)
    .replace(/srcset="([^"]+)"/g, (m, v) => `srcset="${v.split(', ').map((x) => x.replace(/^\/(?!\/)(\S+)/, (mm, pp) => `${up}${pp}`)).join(', ')}"`)
;
}
const hash = (buf) => crypto.createHash('sha1').update(buf).digest('hex').slice(0, 8);

if (fixture && !fs.existsSync(path.join(contentDir, 'photos', 'hero.jpg'))) {
  spawnSync(process.execPath, [path.join(root, 'tests/fixture/make-photos.mjs')], { stdio: 'inherit' });
}

const ctx = loadData({ contentDir, now, fixture, preview });
ctx.demo = demo;
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
const cssSrc = fs.readFileSync(path.join(root, 'src/assets/css/site.css'), 'utf8');
const fontUri = (f) => `url(data:font/woff2;base64,${fs.readFileSync(path.join(root, 'src/assets/fonts', f)).toString('base64')})`;
const css = await transform(demo ? cssSrc.replace(/url\(\/assets\/fonts\/([^)]+)\)/g, (m, f) => fontUri(f)) : cssSrc, { loader: 'css', minify: true });
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
ctx.articles = loadArticles(ctx, path.join(contentDir, 'articles'));

// страницы
const pages = [home(ctx), pricePage(ctx)];
for (const cat of ctx.categories) pages.push(categoryPage(ctx, cat));
for (const m of ctx.markPages) pages.push(markPage(ctx, m));
if (ctx.rental) pages.push(rentalPage(ctx));
pages.push(deliveryPage(ctx));
if (ctx.gallery) pages.push(galleryPage(ctx));
for (const c of ctx.cities) pages.push(cityPage(ctx, c));
if (ctx.articles.length) { pages.push(articlesIndex(ctx)); for (const a of ctx.articles) pages.push(articlePage(ctx, a)); }
pages.push(contactsPage(ctx), aboutPage(ctx), privacyPage(ctx), consentPage(ctx), thanksPage(ctx), notFoundPage(ctx));

// порядок sitemap: как в навигации
const seen = new Set();
for (const p of pages) {
  if (p.url !== '/' && p.crumbs?.length && !p.noindex) p.jsonld = [...(p.jsonld || []), breadcrumbLd(ctx, p)];
  if (seen.has(p.url)) throw new Error(`Повторяющийся URL ${p.url}`);
  seen.add(p.url);
  const file = p.url.endsWith('/') ? path.join(outDir, p.url, 'index.html') : path.join(outDir, p.url);
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, demo ? relativize(pageShell(ctx, p).toString(), p.url) : pageShell(ctx, p).toString());
}

// lastmod страниц без своей даты: меняется, когда меняется содержимое <main>. Хэши хранятся в content/lastmod.json
// и коммитятся вместе с сайтом, поэтому повторная сборка без правок дату не сдвигает.
if (!fixture && !preview && !demo) {
  const store = path.join(contentDir, 'lastmod.json');
  const prev = fs.existsSync(store) ? JSON.parse(fs.readFileSync(store, 'utf8')) : {};
  const next = {};
  const today = ctx.now.toISOString().slice(0, 10);
  const priceDay = ctx.priceDate.toISOString().slice(0, 10);
  for (const p of pages) {
    if (p.lastmod || p.noindex || p.inSitemap === false) continue;
    const hash = crypto.createHash('sha1').update(String(p.main)).digest('hex').slice(0, 16);
    const day = prev[p.url]?.h === hash ? prev[p.url].d : today;
    next[p.url] = { h: hash, d: day };
    p.lastmod = day > priceDay ? day : priceDay;
  }
  fs.writeFileSync(store, JSON.stringify(next, null, 1) + '\n');
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
if (demo) console.log('\nДЕМО-СБОРКА: открывайте dist-demo/index.html, заявки никуда не уходят, в прод не выкладывать.');
if (preview) console.log(`\nПРЕДПРОСМОТР: не для публикации. Подставлено временно: ${ctx.assumed.join(', ') || 'ничего'}.`);
