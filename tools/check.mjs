// Автоприёмка по разделу 9 ТЗ: пять проходов. node tools/check.mjs [--fixture|--preview] [--layout]
// Код выхода 1, если есть красные замечания. --layout добавляет проход 5 (Chromium: 320–1280 px) и «холодный взгляд».
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';
import { loadData } from '../src/lib/data.mjs';
import { CONCRETE_KINDS } from '../src/lib/categories.mjs';
import { OPENING_HOURS } from '../src/lib/seo.mjs';
import { dateRu } from '../src/lib/util.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const args = process.argv.slice(2);
const fixture = args.includes('--fixture'), preview = args.includes('--preview');
const dist = path.join(root, fixture ? 'dist-fixture' : preview ? 'dist-preview' : 'dist');
const ctx = loadData({ contentDir: path.join(root, fixture ? 'tests/fixture/content' : 'content'), now: new Date(), fixture, preview });
ctx.priceDateRu = dateRu(ctx.priceDate);
const { site } = ctx;
const pagesMeta = JSON.parse(fs.readFileSync(path.join(root, '.cache', `pages-${path.basename(dist)}.json`), 'utf8'));
const R = []; // { pass, level, page, msg }
const err = (pass, page, msg) => R.push({ pass, level: 'error', page, msg });
const warn = (pass, page, msg) => R.push({ pass, level: 'warn', page, msg });

// ---------- разбор ----------
const decode = (s) => String(s ?? '').replace(/&nbsp;| /g, ' ').replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&amp;/g, '&');
const strip = (h) => decode(h.replace(/<(script|style|template|svg)[\s\S]*?<\/\1>/g, ' ').replace(/<[^>]+>/g, ' ')).replace(/\s+/g, ' ').trim();
const fileOf = (url) => (url.endsWith('/') ? path.join(dist, url, 'index.html') : path.join(dist, url));
const exists = (url) => { const f = fileOf(url.split('#')[0].split('?')[0]); return fs.existsSync(f); };
const pages = pagesMeta.map((p) => {
  const html = fs.readFileSync(fileOf(p.url), 'utf8');
  const main = (html.match(/<main[^>]*>([\s\S]*?)<\/main>/) || [])[1] ?? '';
  const head = (html.match(/<head>([\s\S]*?)<\/head>/) || [])[1] ?? '';
  return {
    ...p, html, main, head,
    title: decode((head.match(/<title>([\s\S]*?)<\/title>/) || [])[1]),
    desc: decode((head.match(/<meta name="description" content="([^"]*)"/) || [])[1]),
    canonical: (head.match(/<link rel="canonical" href="([^"]*)"/g) || []).map((m) => m.match(/href="([^"]*)"/)[1]),
    text: strip(html), mainText: strip(main),
    headings: [...main.matchAll(/<h([1-6])[^>]*>([\s\S]*?)<\/h\1>/g)].map((m) => ({ l: +m[1], t: strip(m[2]) })),
    ld: [...html.matchAll(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/g)].map((m) => { try { return JSON.parse(m[1].replace(/\\u003c/g, '<')); } catch { return null; } })
  };
});
const indexable = pages.filter((p) => !p.noindex);
const home = pages.find((p) => p.url === '/');
const byUrl = (u) => pages.find((p) => p.url === u);
const allText = pages.map((p) => p.text).join('\n');

// ====================================================================
// ПРОХОД 1. Гео и каннибализация
// ====================================================================
{
  const P = 1;
  const inLoc = site.plant.locality_in;
  if (!home.title.includes(inLoc)) err(P, '/', `Title главной не содержит «${inLoc}»`);
  if (!home.headings[0]?.t.includes(inLoc)) err(P, '/', `H1 главной не содержит «${inLoc}»`);
  const h1 = home.headings[0]?.t ?? '';
  if (!/от производителя/i.test(h1)) err(P, '/', 'В H1 главной нет «от производителя»');
  if (!new RegExp(`доставка от ${String(site.min_volume_m3).replace('.', ',')}\\s*м³`, 'i').test(h1)) err(P, '/', `В H1 главной нет «доставка от ${site.min_volume_m3} м³»`);
  if (!/24\/7/.test(h1)) err(P, '/', 'В H1 главной нет «24/7»');
  for (const c of ctx.cities) {
    for (const [where, text] of [['Title', home.title], ['H1', h1]]) if (text.includes(c.name) || text.includes(c.in)) err(P, '/', `${where} главной размыт гео-ключом «${c.name}»: главная бьёт только в завод`);
    const p = byUrl(c.url);
    if (!p) { err(P, c.url, 'нет страницы города'); continue; }
    if (!p.title.startsWith(`Купить бетон ${c.in} с доставкой`)) err(P, c.url, `Title не по шаблону ТЗ: «${p.title}»`);
    if (p.headings[0]?.t !== `Бетон ${c.in} с доставкой`) err(P, c.url, `H1 не по шаблону ТЗ: «${p.headings[0]?.t}»`);
    if (!p.mainText.includes(`производится на нашем заводе ${inLoc}`)) err(P, c.url, 'нет честной строки «производство в {завод}, доставляем в {город}»');
    if (!/24\/7/.test(p.mainText)) err(P, c.url, 'на странице города нет 24/7');
    if (!p.ld.some((j) => j?.['@type'] === 'FAQPage')) err(P, c.url, 'нет FAQ про доставку в город');
    if (c.delivery_cost == null) warn(P, c.url, 'нет стоимости доставки в город (delivery_cost): ТЗ требует цену доставки именно до этого города');
    if (c.travel_time == null) warn(P, c.url, 'нет времени подачи/в пути (travel_time): ТЗ требует время подачи миксера');
  }
  // каннибализация: пары страниц с почти одинаковым основным текстом
  const shingles = (t) => { const w = t.toLowerCase().replace(/[^а-яa-z0-9 ]/g, ' ').split(/\s+/).filter(Boolean); const s = new Set(); for (let i = 0; i + 4 < w.length; i++) s.add(w.slice(i, i + 5).join(' ')); return s; };
  const geo = [home, ...ctx.cities.map((c) => byUrl(c.url)), byUrl('/dostavka/')].filter(Boolean);
  for (let i = 0; i < geo.length; i++) for (let j = i + 1; j < geo.length; j++) {
    const a = shingles(geo[i].mainText), b = shingles(geo[j].mainText);
    const inter = [...a].filter((x) => b.has(x)).length; const sim = inter / Math.min(a.size, b.size);
    if (sim > 0.75) err(P, `${geo[i].url} ~ ${geo[j].url}`, `тексты геостраниц совпадают на ${Math.round(sim * 100)}%: риск каннибализации`);
    else if (sim > 0.5) warn(P, `${geo[i].url} ~ ${geo[j].url}`, `тексты геостраниц похожи на ${Math.round(sim * 100)}%`);
  }
  const addrPages = ['/contacts/'].map(byUrl);
  for (const p of addrPages) if (!p.mainText.includes(site.plant.address)) err(P, p.url, 'на странице контактов нет адреса завода как в Яндекс Бизнесе');
  if (!fs.readFileSync(path.join(dist, '.htaccess'), 'utf8').includes('www\\.')) err(P, '.htaccess', 'нет редиректа www → основной хост');
  if (site.main_site && !home.html.includes(`href="${site.main_site.url}"`)) err(P, '/', 'нет ссылки на основной сайт (обязательная перелинковка для поддомена)');
}

// ====================================================================
// ПРОХОД 2. Техника индексации
// ====================================================================
{
  const P = 2;
  const seen = { title: new Map(), desc: new Map(), h1: new Map() };
  const known = new Set(pages.map((p) => p.url));
  for (const p of pages) {
    const idx = !p.noindex;
    if (!p.title) err(P, p.url, 'нет Title'); else {
      if (p.title.length > 80) err(P, p.url, `Title ${p.title.length} симв. (>80), обрежется в выдаче`); else if (p.title.length > 70) warn(P, p.url, `Title ${p.title.length} симв.`);
    }
    if (!p.desc) err(P, p.url, 'нет Description'); else if (idx) {
      if (p.desc.length < 60) warn(P, p.url, `Description короткий (${p.desc.length})`);
      if (p.desc.length > 220) warn(P, p.url, `Description длинный (${p.desc.length})`);
      if (/(?<![\d-])20\d\d(?![\d-])/.test(p.desc)) err(P, p.url, `в Description вшит год: «${p.desc.match(/.{0,20}20\d\d.{0,10}/)[0]}»`);
    }
    const h1s = p.headings.filter((x) => x.l === 1);
    const h1count = (p.html.match(/<h1[\s>]/g) || []).length;
    if (h1count !== 1) err(P, p.url, `H1 на странице: ${h1count}, нужен ровно один`);
    if (/Загрузка/i.test(h1s[0]?.t ?? '')) err(P, p.url, 'H1 «Загрузка…»');
    if (p.url !== '/404.html' && p.canonical.length !== 1) err(P, p.url, `canonical: ${p.canonical.length} шт.`);
    else if (p.url !== '/404.html' && p.canonical[0] !== ctx.origin + p.url) err(P, p.url, `canonical ${p.canonical[0]} ≠ self ${ctx.origin + p.url}`);
    if (idx && !p.url.endsWith('/') && p.url !== '/404.html') err(P, p.url, 'канонический URL без слэша');
    if (p.mainText.length < 250 && idx) err(P, p.url, `в серверном HTML мало текста (${p.mainText.length} симв.): SPA-риск`);
    if (/id="root"|id="app"/.test(p.html)) err(P, p.url, 'найден контейнер SPA');
    if (idx) for (const [k, v] of [['title', p.title], ['desc', p.desc], ['h1', h1s[0]?.t]]) {
      if (seen[k].has(v)) err(P, p.url, `дубль ${k} с ${seen[k].get(v)}`); else seen[k].set(v, p.url);
    }
    // robots / noindex
    const robots = (p.head.match(/<meta name="robots" content="([^"]*)"/) || [])[1] ?? '';
    if (!fixture && !preview) {
      if (idx && /noindex/.test(robots)) err(P, p.url, 'индексируемая страница закрыта noindex');
      if (!idx && !/noindex/.test(robots)) err(P, p.url, 'служебная страница без noindex');
    }
    // ссылки
    for (const m of p.html.matchAll(/<a [^>]*href="([^"]*)"/g)) {
      const href = decode(m[1]);
      if (/^(tel:|mailto:|https?:\/\/|#)/.test(href)) continue;
      if (!href.startsWith('/')) { err(P, p.url, `относительная ссылка «${href}»`); continue; }
      if (/index\.(html?|php)/.test(href)) err(P, p.url, `ссылка на index: ${href}`);
      if (/[?&](category|cat|section|sub|g|group|slug|service)=/.test(href)) err(P, p.url, `ссылка на параметрический каталог: ${href}`);
      if (/\?/.test(href)) warn(P, p.url, `ссылка с параметрами: ${href}`);
      if (!exists(href)) err(P, p.url, `битая внутренняя ссылка ${href}`);
      else if (!href.split('#')[0].endsWith('/') && !/\.[a-z0-9]+$/i.test(href.split('#')[0])) err(P, p.url, `внутренняя ссылка без слэша: ${href}`);
    }
    // ресурсы
    for (const m of p.html.matchAll(/(?:src|href)="(\/assets\/[^"#]+)/g)) if (!fs.existsSync(path.join(dist, m[1]))) err(P, p.url, `нет файла ресурса ${m[1]}`);
    for (const m of p.html.matchAll(/srcset="([^"]+)"/g)) for (const part of m[1].split(',')) { const u = part.trim().split(' ')[0]; if (u && !fs.existsSync(path.join(dist, u))) err(P, p.url, `нет файла srcset ${u}`); }
    // у фото в карточках пустой alt допустим: рядом заголовок-ссылка с тем же смыслом
    for (const m of p.html.matchAll(/(<figure class="(?:pcard|acard)__ph">)?<img\b[^>]*>/g)) { if (!/ alt="/.test(m[0]) || (!m[1] && !/ alt="[^"]+"/.test(m[0]))) err(P, p.url, 'img без alt'); if (!/ width="\d+" height="\d+"/.test(m[0])) err(P, p.url, 'img без width/height (скачок вёрстки)'); }
    // OG
    const ogUrl = (p.head.match(/property="og:url" content="([^"]*)"/) || [])[1];
    if (ogUrl !== ctx.origin + p.url) err(P, p.url, `og:url ${ogUrl} ≠ canonical`);
    for (const j of p.ld) if (j === null) err(P, p.url, 'JSON-LD не парсится');
  }
  // sitemap = канон
  const sm = fs.readFileSync(path.join(dist, 'sitemap.xml'), 'utf8');
  const locs = [...sm.matchAll(/<loc>([^<]*)<\/loc>/g)].map((m) => m[1]);
  const want = indexable.filter((p) => p.inSitemap).map((p) => ctx.origin + p.url);
  for (const u of want) if (!locs.includes(u)) err(P, 'sitemap.xml', `нет канонического URL ${u}`);
  for (const u of locs) { if (!want.includes(u)) err(P, 'sitemap.xml', `лишний URL ${u}`); if (/\?|index\.html|\/\/www\./.test(u)) err(P, 'sitemap.xml', `некорректный URL ${u}`); }
  const robots = fs.readFileSync(path.join(dist, 'robots.txt'), 'utf8');
  if (!fixture && !preview) {
    if (!robots.includes(`Sitemap: ${ctx.origin}/sitemap.xml`)) err(P, 'robots.txt', 'нет строки Sitemap');
    for (const d of ['/price/', '/catalog/', '/dostavka/']) if (new RegExp(`Disallow:\\s*${d}`).test(robots)) err(P, 'robots.txt', `закрыт ${d}`);
  }
  const ht = fs.readFileSync(path.join(dist, '.htaccess'), 'utf8');
  for (const [re, what] of [[/X-Forwarded-Proto/, 'http → https'], [/www\\\./, 'www → основной хост'], [/index\\\.\(\?:html\?\|php\)/, '/index.html → /']]) if (!re.test(ht)) err(P, '.htaccess', `нет правила: ${what}`);
  if (!fs.existsSync(path.join(dist, 'send.php'))) err(P, 'send.php', 'нет обработчика формы');
  // schema
  const lbId = `${ctx.origin}/#localbusiness`, orgId = `${ctx.origin}/#organization`;
  for (const p of pages) {
    const graph = p.ld.filter(Boolean).flatMap((j) => (j['@graph'] ? j['@graph'] : [j]));
    const lb = graph.find((n) => ['LocalBusiness', 'HomeAndConstructionBusiness'].includes(n['@type'])), org = graph.find((n) => n['@type'] === 'Organization');
    if (p.noindex) continue;
    if (!lb || !org) { err(P, p.url, 'нет Organization/LocalBusiness'); continue; }
    if (lb['@id'] !== lbId || org['@id'] !== orgId) err(P, p.url, '@id Organization/LocalBusiness нестабилен');
    if (lb.url !== `${ctx.origin}/` || org.url !== `${ctx.origin}/`) err(P, p.url, 'url Organization/LocalBusiness не равен главной');
    if (lb.address?.streetAddress !== site.plant.street || lb.address?.addressLocality !== site.plant.locality) err(P, p.url, 'адрес в schema не равен адресу завода');
    if (lb.openingHours !== OPENING_HOURS) err(P, p.url, `openingHours «${lb.openingHours}» ≠ ${OPENING_HOURS}`);
    const spec = lb.openingHoursSpecification?.[0];
    if (!spec || spec.opens !== '00:00' || spec.closes !== '23:59' || spec.dayOfWeek?.length !== 7) err(P, p.url, 'openingHoursSpecification не 24/7');
    const bl = p.ld.find((j) => j?.['@type'] === 'BreadcrumbList');
    if (p.url !== '/') {
      if (!bl) err(P, p.url, 'нет BreadcrumbList');
      else {
        const vis = [...p.html.matchAll(/<nav class="crumbs"[\s\S]*?<\/nav>/g)][0]?.[0] ?? '';
        const names = [...vis.matchAll(/<li>(?:<a [^>]*>|<span[^>]*>)([\s\S]*?)<\/(?:a|span)>/g)].map((m) => strip(m[1]));
        const ldn = bl.itemListElement.map((i) => i.name);
        if (JSON.stringify(names) !== JSON.stringify(ldn)) err(P, p.url, `крошки HTML ≠ BreadcrumbList: ${names.join(' > ')} | ${ldn.join(' > ')}`);
      }
    }
    for (const j of p.ld) {
      if (j?.['@type'] === 'Product') {
        const o = j.offers;
        const offers = Array.isArray(o) ? o : o?.['@type'] === 'AggregateOffer' ? o.offers : o ? [o] : [];
        const vis = new Set([...p.main.matchAll(/<td class="pr"[^>]*>(?:<a [^>]*>)?<span class="num">([^<]*)<\/span>/g)].map((m) => Number(decode(m[1]).replace(/[^\d]/g, ''))));
        for (const o of offers) if (!vis.has(Number(o.price))) err(P, p.url, `Offer.price ${o.price} нет среди видимых цен`);
        for (const v of vis) if (!offers.some((o) => Number(o.price) === v)) err(P, p.url, `видимая цена ${v} нет в Offer`);
        if (/Product/.test(JSON.stringify(j)) && p.url.split('/').filter(Boolean).length < 3) err(P, p.url, 'Product на категории');
      }
    }
  }
}

// ====================================================================
// ПРОХОД 3. Факты
// ====================================================================
{
  const P = 3;
  const plain = (p) => p.text;
  const badHours = [/\b\d{1,2}[:.]\d{2}\s*[–—-]\s*\d{1,2}[:.]\d{2}\b/, /до\s+\d{1,2}[:.]\d{2}/i, /в\s+рабочие\s+часы|рабочее\s+время|рабочих\s+дней|по\s+будням|в\s+будни/i, /пн\s*[–—-]\s*(пт|вс)/i, /(?:^|\D)(?:08|09|18|20|22):00/];
  for (const p of pages) {
    for (const re of badHours) { const m = plain(p).match(re); if (m) err(P, p.url, `режим не 24/7: «${m[0]}»`); }
    if (/НДС/i.test(plain(p))) err(P, p.url, 'упоминание НДС (по решению заказчика не пишем)');
    if (/[{}]|\bundefined\b|\bNaN\b|\[object|Lorem|TODO|\{CITY\}/.test(plain(p))) err(P, p.url, `мусор в тексте: «${plain(p).match(/.{0,25}([{}]|undefined|NaN|\[object|Lorem|TODO).{0,25}/)?.[0]}»`);
    if (/каталог/i.test(plain(p))) err(P, p.url, `слово «каталог» в видимом тексте: «${plain(p).match(/.{0,25}каталог.{0,15}/i)[0]}»`);
    if (/\bИНН\b|\bОГРН/.test(plain(p))) err(P, p.url, 'ИНН/ОГРН в тексте');
    if (!site.lab?.has_control && /лаборатор/i.test(plain(p))) err(P, p.url, 'упоминание лаборатории без подтверждения');
    if (/кубик\w* текущей партии|испытыва\w+ (на )?проектн\w+ прочност\w+ перед отгрузк/i.test(plain(p))) err(P, p.url, 'запрещённая формулировка про испытание кубиков перед отгрузкой');
    for (const m of p.html.matchAll(/href="tel:([^"]*)"/g)) if (m[1] !== site.phone.e164) err(P, p.url, `tel:${m[1]} ≠ ${site.phone.e164}`);
    for (const m of plain(p).matchAll(/\+7\s?\(\d{3}\)\s?[\d-]+/g)) if (m[0] !== site.phone.display) err(P, p.url, `телефон «${m[0]}» ≠ ${site.phone.display}`);
    if (!p.noindex && !/24\/7/.test(p.desc) && ['/', '/contacts/', '/dostavka/'].includes(p.url)) err(P, p.url, 'в Description нет 24/7');
  }
  // 24/7 в ключевых местах
  if (!/<header class="hdr"[\s\S]*?Работаем 24\/7[\s\S]*?<\/header>/.test(home.html)) err(P, '/', 'нет «Работаем 24/7» в шапке');
  for (const [url, where] of [['/', 'hero'], ['/contacts/', 'контакты']]) if (!/24\/7/.test(byUrl(url).mainText)) err(P, url, `нет 24/7 (${where})`);
  if (!/24\/7/.test(home.html.slice(home.html.indexOf('<footer')))) err(P, '/', 'нет 24/7 в футере');
  if (!home.ld.some((j) => JSON.stringify(j).includes('"openingHours":"Mo-Su 00:00-23:59"'))) err(P, '/', 'нет openingHours 24/7 в schema');
  // минимальный объём
  const mv = String(site.min_volume_m3).replace('.', ',');
  for (const p of pages) for (const m of p.mainText.matchAll(/(?:минимальный заказ(?: [^.]{0,12})?\s*[—-]|заказ от|доставка от|миксером)\s*(?:от\s*)?(\d+(?:,\d+)?)\s*м³/gi)) if (m[1] !== mv) err(P, p.url, `минимальный объём «${m[0]}» ≠ ${mv}`);
  // цена «от»
  const main = ctx.mainConcrete;
  const heroPrice = Number((home.main.match(/class="hero__price"><b>([^<]*)<\/b>/) || [])[1]?.replace(/[^\d]/g, ''));
  if (heroPrice !== ctx.fromPrice) err(P, '/', `цена «от» в hero ${heroPrice} ≠ минимум товарного бетона ${ctx.fromPrice}`);
  const catPage = byUrl(`/catalog/${main.slug}/`);
  const fact = Number(decode((catPage.main.match(/class="pagehead__price">от ([^<]*)₽<small>за м³/) || [])[1]).replace(/[^\d]/g, ''));
  if (fact !== ctx.fromPrice) err(P, catPage.url, `цена «от» ${fact} ≠ ${ctx.fromPrice}`);
  // все видимые цены есть в данных
  const known = new Set([...ctx.categories.flatMap((c) => c.rows.map((r) => r.price)), ...(ctx.rental ? [...ctx.rental.units, ...ctx.rental.extras].map((u) => u.price) : []), ...ctx.cities.map((c) => c.delivery_cost).filter((v) => v != null)]);
  for (const p of pages) for (const m of p.main.matchAll(/<td class="pr"[^>]*>(?:<a [^>]*>)?<span class="num">([^<]*)<\/span>/g)) { const v = Number(decode(m[1]).replace(/[^\d]/g, '')); if (!known.has(v)) err(P, p.url, `цена ${v} не из прайса`); }
  // конфигуратор: каждая цена в нём есть в таблице той же страницы, а форма содержит капчу
  for (const p of pages.filter((x) => x.main.includes('data-cfg-data'))) {
    const data = (() => { try { return JSON.parse(decode(p.main.match(/<script type="application\/json" data-cfg-data>([\s\S]*?)<\/script>/)[1]).replace(/\\u003c/g, '<')); } catch { return null; } })();
    if (!data) { err(P, p.url, 'данные конфигуратора не парсятся'); continue; }
    const tablePrices = new Set([...p.main.matchAll(/<td class="pr"[^>]*>(?:<a [^>]*>)?<span class="num">([^<]*)<\/span>/g)].map((m) => Number(decode(m[1]).replace(/[^\d]/g, ''))));
    for (const r of data.rows) if (!tablePrices.has(r.p)) err(P, p.url, `в конфигураторе цена ${r.p} (${r.l}) отсутствует в таблице страницы`);
    for (const r of data.rows) if (!known.has(r.p)) err(P, p.url, `в конфигураторе цена ${r.p} не из прайса`);
    const keys = new Set(data.rows.map((r) => r.k));
    if (keys.size !== data.rows.length) err(P, p.url, 'в конфигураторе повторяются ключи позиций');
    if (!keys.has(data.def)) err(P, p.url, 'позиция по умолчанию не найдена среди строк');
    const cheapest = Math.min(...data.rows.map((r) => r.p));
    if (data.rows.find((r) => r.k === data.def).p !== cheapest) err(P, p.url, 'по умолчанию выбрана не самая дешёвая позиция');
    for (const tr of p.main.matchAll(/<tr data-k="([^"]+)"/g)) if (!keys.has(decode(tr[1]))) err(P, p.url, `строка таблицы с ключом ${tr[1]} не найдена в конфигураторе`);
  }
  for (const p of pages.filter((x) => /data-lead/.test(x.html))) {
    for (const f of p.html.matchAll(/<form [^>]*data-lead[\s\S]*?<\/form>/g)) if (!/name="cap"/.test(f[0]) || !/name="ct"/.test(f[0])) err(P, p.url, 'в форме заявки нет арифметической капчи');
  }
  // статьи: разметка Article, цены из прайса, ссылка на карточку Яндекса
  for (const p of pages.filter((x) => /^\/stati\/.+/.test(x.url))) {
    const a = p.ld.find((j) => j?.['@type'] === 'Article');
    if (!a) err(P, p.url, 'нет разметки Article');
    else {
      if (!a.headline || !a.datePublished || !a.author || !a.publisher || !a.image) err(P, p.url, 'в Article не хватает полей');
      if (new Date(a.datePublished) > new Date()) err(P, p.url, 'дата публикации статьи в будущем');
      if (a.dateModified < a.datePublished) err(P, p.url, 'dateModified раньше datePublished');
    }
    for (const m of p.main.matchAll(/<td>([\d\u00a0 ]+)\u00a0₽/g)) { const v = Number(m[1].replace(/\D/g, '')); if (!known.has(v)) err(P, p.url, `цена ${v} в таблице статьи не из прайса`); }
    if (!p.main.includes(`href="${site.plant.yandex_url}"`)) err(P, p.url, 'в статье нет ссылки на карточку Яндекса');
    if (!/Цены в статье на/.test(p.mainText)) err(P, p.url, 'в статье не указана дата цен');
  }
  for (const u of ['/', '/contacts/', '/about/']) if (!byUrl(u).main.includes(`href="${site.plant.yandex_url}"`)) err(P, u, 'нет ссылки на карточку Яндекса');
  // цвета: прежний жёлтый акцент не должен остаться
  const css = fs.readdirSync(path.join(dist, 'assets')).filter((f) => f.endsWith('.css')).map((f) => fs.readFileSync(path.join(dist, 'assets', f), 'utf8')).join('');
  if (/#ffc20e|#fb0|#f5a623|#edb000|signal/i.test(css)) err(P, 'CSS', 'в стилях остался жёлтый акцент');
  // марка ↔ класс
  const cls = new Map(ctx.classByMark);
  for (const p of pages) for (const tr of p.main.matchAll(/<tr>([\s\S]*?)<\/tr>/g)) {
    const mk = (tr[1].match(/data-l="Марка">([\s\S]*?)<\/td>/) || [])[1], cl = (tr[1].match(/data-l="Класс">([\s\S]*?)<\/td>/) || [])[1];
    if (mk && cl) { const m = strip(mk), c = strip(cl); if (cls.get(m) && cls.get(m) !== c) err(P, p.url, `марка ${m} с классом ${c}, в прайсе ${cls.get(m)}`); }
  }
  for (const p of pages) for (const m of p.mainText.matchAll(/(М\d{3})\s*\((В[\d,]+)\)/g)) if (cls.get(m[1]) && cls.get(m[1]) !== m[2]) err(P, p.url, `«${m[0]}»: в прайсе ${cls.get(m[1])}`);
  // применение марок не повторяется
  const markPages = pages.filter((p) => /\/m\d{3}\/$/.test(p.url));
  const uses = markPages.map((p) => [p.url, (p.main.match(/Для чего подходит[\s\S]*?<ul class="checks">([\s\S]*?)<\/ul>/) || [])[1] ?? '']);
  for (let i = 0; i < uses.length; i++) for (let j = i + 1; j < uses.length; j++) if (uses[i][1] && uses[i][1] === uses[j][1]) err(P, uses[i][0], `«для чего подходит» совпадает с ${uses[j][0]}`);
  // аренда без бетонных терминов
  const rent = byUrl('/catalog/arenda-abn/');
  if (rent) for (const re of [/минимальный (заказ|объ[её]м)/i, /паспорт качества|ТТН|товарно-транспортн/i, /стоимость материала|доставка за м³/i, /\bмарк[аи]\b|класс бетона/i]) { const m = rent.mainText.match(re); if (m) err(P, rent.url, `в аренде бетонная формулировка: «${m[0]}»`); }
  // даты цен и обороты
  for (const p of pages.filter((x) => /class="pt"/.test(x.main))) if (!p.mainText.includes(`Актуально на ${ctx.priceDateRu}`)) err(P, p.url, 'у таблиц нет «Актуально на {дата}»');
  // отзывы
  for (const r of site.reviews?.items ?? []) if (!home.html.includes(r.author.replace(/[.\s]+$/, '').split(/\s+/)[0])) warn(P, '/', `отзыв ${r.author} не выведен`);
  const y = new Date().getUTCFullYear();
  if (!home.text.includes(`© ${y}`)) warn(P, '/', 'год в футере не текущий');
  if (!site.founded_year && /с \d{4} года/.test(allText)) err(P, '/', 'год основания не подтверждён, но указан');
}

// ====================================================================
// ПРОХОД 4. Композиция
// ====================================================================
{
  const P = 4;
  for (const p of pages) {
    const ls = p.headings.map((h) => h.l);
    for (let i = 1; i < ls.length; i++) if (ls[i] - ls[i - 1] > 1) { err(P, p.url, `прыжок заголовков h${ls[i - 1]} → h${ls[i]}: «${p.headings[i].t}»`); break; }
    if (!/<header class="hdr"/.test(p.html) || !/<footer class="ftr"/.test(p.html)) err(P, p.url, 'нет шапки или подвала');
    for (const m of p.html.matchAll(/<a [^>]*href="(#[^"]*)"[^>]*>([\s\S]*?)<\/a>/g)) if (/связаться|позвонить|написать|заказать|рассч[иё]т/i.test(strip(m[2]))) err(P, p.url, `кнопка «${strip(m[2])}» ведёт на якорь ${m[1]}`);
    if (!p.noindex && !/data-lead/.test(p.html) && !/\/(privacy|soglasie)\//.test(p.url)) warn(P, p.url, 'нет формы заявки');
    if (!/class="mbar/.test(p.html)) err(P, p.url, 'нет нижней панели CTA для телефона');
  }
  const order = ['class="hero"', 'id="price"', 'id="produkciya"', 'Из чего состоит заказ', 'id="faq"', 'id="zayavka"'];
  let last = -1; for (const k of order) { const i = home.html.indexOf(k); if (i < 0) err(P, '/', `на главной нет блока ${k}`); else { if (i < last) err(P, '/', `блок ${k} стоит не по порядку`); last = i; } }
  if ((home.html.match(/id="price"/g) || []).length !== 1) err(P, '/', 'блок цен на главной не один');
  const want = ctx.categories.length + (ctx.rental ? 1 : 0);
  const tabsWant = ctx.categories.filter((c) => c.kind !== 'rebar').length;
  if ((home.html.match(/class="pw__tab"/g) || []).length !== tabsWant) err(P, '/', `во вкладках прайса на главной не все разделы: нужно ${tabsWant}`);
  if ((home.html.match(/role="tabpanel"/g) || []).length !== tabsWant) err(P, '/', 'у вкладок прайса не по панели на раздел');
  if (!byUrl('/price/') || (byUrl('/price/').html.match(/<article class="pcard">/g) || []).length !== want) err(P, '/price/', 'в разделе цен карточки продукции не по числу категорий');
  for (const m of byUrl('/price/').html.matchAll(/<article class="pcard">[\s\S]*?<\/article>/g)) {
    if (!/<a href="\/catalog\/[a-z0-9\/-]+\/">/.test(m[0])) err(P, '/price/', 'карточка продукции без ссылки на страницу');
    if (!/<figure class="pcard__ph"><img/.test(m[0])) err(P, '/price/', 'у карточки продукции нет картинки');
  }
  if (/<a [^>]*href="\/price\/"[^>]*>[^<]*Прайс[^<]*<\/a>/i.test(home.main) && /Цены на бетон/.test(home.main)) { /* ссылка на полный прайс допустима */ }
  const tables = new Map(); for (const p of pages.filter((x) => x.url === '/')) for (const t of p.main.matchAll(/<table class="pt">([\s\S]*?)<\/table>/g)) { if (tables.has(t[1])) err(P, p.url, 'на странице два одинаковых прайса'); tables.set(t[1], 1); }
}

// ====================================================================
// ПРОХОД 5. Мобильная вёрстка и «холодный взгляд»
// ====================================================================
let layoutOk = null;
if (args.includes('--layout')) {
  const r = spawnSync(process.execPath, [path.join(root, 'tools/shots.mjs'), fixture ? 'dist-fixture' : preview ? 'dist-preview' : 'dist', '--widths=320,375,430,1280'], { encoding: 'utf8' });
  layoutOk = r.status === 0;
  const lines = r.stdout.split('\n').filter((l) => /^\d+px/.test(l));
  for (const l of lines) err(5, l.split(':')[0], l.split(': ').slice(1).join(': '));
  if (r.status !== 0 && !lines.length) err(5, 'shots', (r.stderr || r.stdout).slice(0, 300));
  // холодный взгляд: что видно в первом экране главной
  const { chromium } = await import('playwright-core');
  const { serve } = await import('./serve.mjs');
  const { server, port } = await serve(path.relative(root, dist));
  const browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH || '/opt/pw-browsers/chromium', headless: true, args: ['--no-sandbox'] });
  for (const [w, h] of [[375, 740], [1280, 800]]) {
    const pg = await (await browser.newContext({ viewport: { width: w, height: h }, isMobile: w < 700 })).newPage();
    await pg.goto(`http://127.0.0.1:${port}/`, { waitUntil: 'networkidle' });
    const seen = await pg.evaluate(() => {
      const inView = (el) => { if (!el) return false; const b = el.getBoundingClientRect(); return b.width > 0 && b.top >= 0 && b.top < innerHeight; };
      const txt = (re) => [...document.querySelectorAll('.hero *, .hdr *, .mbar *')].some((e) => e.children.length === 0 && re.test(e.textContent) && inView(e));
      return { h1: inView(document.querySelector('h1')), tel: [...document.querySelectorAll('a[href^="tel:"]')].some(inView), c247: txt(/24\/7/), price: inView(document.querySelector('.hero__price')), who: txt(/Верхн/), form: inView(document.querySelector('.hero [data-order], .mbar')) };
    });
    const miss = Object.entries({ 'заголовок': seen.h1, 'телефон': seen.tel, '24/7': seen.c247, 'цена «от»': seen.price, 'откуда (завод)': seen.who }).filter(([, v]) => !v).map(([k]) => k);
    if (miss.length) err(5, `холодный взгляд ${w}px`, `в первом экране не видно: ${miss.join(', ')}`);
  }
  await browser.close(); server.close();
}

// ---------- отчёт ----------
const NAMES = { 1: 'Гео и каннибализация', 2: 'Техника индексации', 3: 'Факты', 4: 'Композиция', 5: 'Мобильная вёрстка и первый экран' };
let bad = 0;
for (const P of [1, 2, 3, 4, 5]) {
  const rows = R.filter((r) => r.pass === P);
  const e = rows.filter((r) => r.level === 'error'), w = rows.filter((r) => r.level === 'warn');
  if (P === 5 && layoutOk === null) { console.log(`\nПроход 5. ${NAMES[P]}: пропущен (запустите с --layout)`); continue; }
  console.log(`\nПроход ${P}. ${NAMES[P]}: ${e.length ? '✗' : '✓'}  красных ${e.length}, жёлтых ${w.length}`);
  for (const r of [...new Map(e.map((x) => [`${x.page}|${x.msg}`, x])).values()]) console.log(`  ✗ ${r.page}: ${r.msg}`);
  for (const r of w) console.log(`  ! ${r.page}: ${r.msg}`);
  bad += e.length;
}
console.log(`\nСтраниц: ${pages.length}, индексируемых: ${indexable.length}. ${bad ? `Красных замечаний: ${bad}. Сдавать нельзя.` : 'Красных замечаний нет.'}`);
process.exit(bad ? 1 : 0);
