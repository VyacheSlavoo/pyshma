// Проверка одной статьи без сборки сайта: node tools/lint-article.mjs content/articles/08-podvizhnost-betona.md
// Подстановки {{...}} и директивы :: должны разрешаться, внутренние ссылки вести на существующие страницы.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { loadData } from '../src/lib/data.mjs';
import { renderMarkdown } from '../src/lib/articles.mjs';
import { dateRu } from '../src/lib/util.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const file = process.argv[2];
const src = fs.readFileSync(file, 'utf8');
const m = src.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n([\s\S]*)$/);
if (!m) { console.error('нет блока полей в начале файла'); process.exit(1); }
const meta = Object.fromEntries(m[1].split(/\r?\n/).map((l) => [l.slice(0, l.indexOf(':')).trim(), l.slice(l.indexOf(':') + 1).trim()]));
const ctx = loadData({ contentDir: path.join(root, 'content'), now: new Date('2026-10-22T12:00:00Z'), fixture: false, preview: false });
ctx.priceDateRu = dateRu(ctx.priceDate);
let out;
try { out = renderMarkdown(ctx, m[2], file); } catch (e) { console.error('ОШИБКА:', e.message); process.exit(1); }
const text = out.html.replace(/<[^>]+>/g, ' ').replace(/&[a-z#0-9]+;/g, ' ').replace(/\s+/g, ' ').trim();
const words = text.split(' ').filter(Boolean).length;
const pagesFile = path.join(root, '.cache', 'pages-dist.json');
const urls = new Set(fs.existsSync(pagesFile) ? JSON.parse(fs.readFileSync(pagesFile, 'utf8')).map((p) => p.url) : []);
for (const f of fs.readdirSync(path.join(root, 'content/articles'))) { const s = fs.readFileSync(path.join(root, 'content/articles', f), 'utf8').match(/^slug:\s*(\S+)/m); if (s) urls.add(`/stati/${s[1]}/`); }
const bad = [...out.html.matchAll(/href="(\/[^"#]*)(?:#[^"]*)?"/g)].map((x) => x[1]).filter((u) => !urls.has(u));
const problems = [];
if (bad.length) problems.push(`ссылки на несуществующие страницы: ${[...new Set(bad)].join(', ')}`);
const junk = text.match(/.{0,30}([{}]|\bNaN\b|\bundefined\b).{0,30}/); if (junk) problems.push('мусор в тексте: «' + junk[0] + '»');
for (const k of ['title', 'description', 'lead']) if (!meta[k]) problems.push(`нет поля ${k}`);
if (meta.title && meta.title.length > 62) problems.push(`title ${meta.title.length} симв., нужно не больше 62`);
if (meta.description && (meta.description.length < 110 || meta.description.length > 175)) problems.push(`description ${meta.description.length} симв., нужно 110–175`);
if (/лаборатор/i.test(text)) problems.push('слово «лаборатория» запрещено');
if (/каталог/i.test(text)) problems.push('слово «каталог» запрещено в видимом тексте');
if (/НДС/.test(text)) problems.push('НДС не упоминаем');
console.log(`слов: ${words}, заголовков h2: ${out.toc.length}`);
console.log(problems.length ? `ПРОБЛЕМЫ:\n- ${problems.join('\n- ')}` : 'Без замечаний');
process.exit(problems.length ? 2 : 0);
