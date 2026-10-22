// Импорт данных точки из карточки Яндекс Карт в content/*.json.
//   NODE_USE_ENV_PROXY=1 node tools/import-yandex.mjs            # живой запрос (карточка, прайс, отзывы)
//   NODE_USE_ENV_PROXY=1 node tools/import-yandex.mjs --photos   # + список и загрузка фото (нужен Chromium, CHROMIUM_PATH)
//   node tools/import-yandex.mjs --snapshot                      # без сети: из content/_source/yandex-card.json
// Пользовательские значения в site.json (не null) не перезаписываются. Журнал правок исходных данных: content/_source/NOTES.md
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const C = (...p) => path.join(root, 'content', ...p);
const args = process.argv.slice(2);
const SHORT = process.env.YANDEX_CARD_URL || 'https://yandex.ru/maps/-/CXe6qB3-';
const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Safari/537.36';
const log = [];
const note = (s) => log.push(s);

// ---------- получение ----------
function stateOf(html) {
  const i = html.indexOf('class="state-view"');
  if (i < 0) throw new Error('В странице нет state-view: возможно капча или изменилась вёрстка Яндекса');
  const j = html.indexOf('>', i), k = html.indexOf('</script>', j);
  return JSON.parse(html.slice(j + 1, k));
}
async function get(url) {
  const r = await fetch(url, { headers: { 'user-agent': UA, 'accept-language': 'ru-RU,ru;q=0.9' }, redirect: 'follow' });
  if (!r.ok) throw new Error(`${url}: HTTP ${r.status}`);
  return { html: await r.text(), url: r.url };
}

async function fetchLive() {
  const home = await get(SHORT);
  const base = home.url.split('?')[0].replace(/\/$/, '');
  const s0 = stateOf(home.html);
  const item0 = s0.stack[0].results.items[0];
  const out = { fetched_at: new Date().toISOString(), source: base, org: slimOrg(item0) };
  const prices = stateOf((await get(`${base}/prices/`)).html).stack[0].results.items[0];
  out.goods = prices.fullObjects?.categories ?? [];
  const reviews = stateOf((await get(`${base}/reviews/`)).html).stack[0].results.items[0];
  out.reviews = reviews.reviewResults?.reviews ?? [];
  out.reviewsSummary = item0.ratingData ?? null;
  return out;
}

function slimOrg(it) {
  const pick = ['id', 'title', 'address', 'fullAddress', 'coordinates', 'phones', 'categories', 'workingTimeText', 'urls', 'compositeAddress', 'ratingData', 'seoname'];
  const o = Object.fromEntries(pick.map((k) => [k, it[k]]));
  o.features = it.features;
  return o;
}

async function fetchPhotos(base) {
  const { chromium } = await import('playwright-core');
  const exe = process.env.CHROMIUM_PATH || '/opt/pw-browsers/chromium';
  const proxy = process.env.HTTPS_PROXY ? { server: process.env.HTTPS_PROXY } : undefined;
  const browser = await chromium.launch({ executablePath: exe, headless: true, proxy, args: ['--no-sandbox'] });
  try {
    const ctx = await browser.newContext({ locale: 'ru-RU', userAgent: UA, viewport: { width: 1400, height: 900 } });
    const page = await ctx.newPage();
    let body = null;
    page.on('response', async (r) => { if (r.url().includes('/maps/api/photos/getByBusinessId')) { try { body = await r.json(); } catch {} } });
    await page.goto(`${base}/gallery/`, { waitUntil: 'domcontentloaded', timeout: 60000 });
    for (let i = 0; i < 20 && !body; i++) await page.waitForTimeout(500);
    for (let i = 0; i < 20; i++) { await page.mouse.wheel(0, 1800); await page.waitForTimeout(400); }
    if (!body) throw new Error('Не получен ответ photos/getByBusinessId');
    const d = body.data ?? body;
    return Array.isArray(d) ? d : Object.keys(d).filter((k) => /^\d+$/.test(k)).map((k) => d[k]);
  } finally { await browser.close(); }
}

// ---------- разбор прайса ----------
const RE = {
  mark: /[МM]\s?(\d{2,3})(?!\d)/, cls: /[ВB]\s?(\d{1,2}(?:[.,]\d)?)(?!\d)/, frost: /F\s?(\d{2,3})/, water: /W\s?(\d{1,2})/, mob: /[ПP]\s?([1-5])(?!\d)/, pmd: /ПМД\s*-?\s*(\d+)/
};
const WATER_OK = new Set([2, 4, 6, 8, 10, 12, 14, 16, 18, 20]);
const cyr = (s) => s.replace(/,/g, ',');
const fmtCls = (c) => `В${String(c).replace('.', ',')}`;

function parseConcrete(title, { withPmd = false } = {}) {
  const r = { mark: null, cls: null, mobility: null, frost: null, water: null, pmd: null };
  const mm = title.match(RE.mark); if (mm) r.mark = `М${mm[1]}`;
  const cm = title.match(RE.cls); if (cm) r.cls = fmtCls(cm[1]);
  else { const alt = title.match(/[МM]\d{2,3}\s+(\d{2})\s+F/); if (alt) r.cls = fmtCls(alt[1]); }
  const fm = title.match(RE.frost); if (fm) r.frost = `F${fm[1]}`;
  const wm = title.match(RE.water); if (wm) r.water = WATER_OK.has(+wm[1]) ? `W${wm[1]}` : (note(`«${title}»: водонепроницаемость W${wm[1]} не существует, поле оставлено пустым`), null);
  const pm = title.match(RE.mob); if (pm) r.mobility = `П${pm[1]}`;
  if (withPmd) { const d = title.match(RE.pmd); if (d) r.pmd = -Number(d[1]); }
  return r;
}

const CAT_MAP = [
  [/^Бетон \(доставка бетона\)/, 'tovarnyy-beton'],
  [/^Бетон с ПМД/, 'beton-s-pmd'],
  [/^Фибробетон/, 'fibrobeton'],
  [/^Гидротехнический бетон/, 'gidrotehnicheskiy-beton'],
  [/^Бетон на мелком щебне/, 'beton-na-melkom-share'],
  [/^Керамзитобетон/, 'keramzitobeton'],
  [/^Сухой бетон/, 'suhoy-beton']
];

const MORTAR_USE = {
  'Кладочный раствор М50': 'Кладка неответственных стен и перегородок, заделка швов',
  'Кладочный раствор М75': 'Кладка кирпича и блоков в стенах и перегородках',
  'Кладочный раствор М100': 'Кладка стен и перегородок, стяжка пола',
  'Кладочный раствор М150': 'Кладка нагруженных стен, устройство подушек под фундамент',
  'Монтажный раствор М75': 'Монтаж и кладка там, где не нужна высокая прочность',
  'Монтажный раствор М100': 'Кладка кирпича и блоков, стяжка, выравнивание, штукатурка',
  'Монтажный раствор М150': 'Заливка полов, укладка плитки, кладка стен из кирпича и ячеистых блоков',
  'Монтажный раствор М200': 'Кладка стен и перегородок, стяжка, черновая штукатурка'
};
const TSPS_USE = {
  '1:1': 'Повышенные требования к прочности, морозо- и влагостойкости',
  '1:2': 'Стяжки, несущие и нагруженные элементы',
  '1:3': 'Стяжки и заливка, стены, нагруженные основания',
  '1:4': 'Кладка, штукатурка, заливка полов и лестниц',
  '1:5': 'Ремонтно-отделочные работы общего назначения',
  '1:6': 'Заделка выбоин, кладка, выравнивание поверхностей',
  '1:8': 'Основание под брусчатку и тротуарную плитку',
  '1:10': 'Основание под брусчатку и тротуарную плитку, черновые работы',
  '1:15': 'Штукатурные работы, засыпки',
  '1:20': 'Штукатурные работы, засыпки'
};

function buildPrices(goods) {
  const bySlug = new Map();
  const add = (slug, row) => { if (!bySlug.has(slug)) bySlug.set(slug, []); bySlug.get(slug).push(row); };
  const items = goods.flatMap((c) => (c.categoryItems || []).map((x) => ({ cat: c.categoryName ?? 'Без категории', title: String(x.title ?? '').trim(), price: Number(x.price), unit: x.volume, desc: x.description || '' })));
  const skipped = [];

  // 1. товарный бетон — эталон соответствия марка/класс для всего сайта
  const canon = new Map();
  for (const it of items.filter((i) => CAT_MAP[0][0].test(i.cat))) {
    const r = parseConcrete(it.title.replace(/B\s+(\d)/, 'B$1'));
    if (!r.mark || !r.cls) { skipped.push(`${it.title}: не разобрана марка или класс`); continue; }
    canon.set(r.mark, r.cls);
    add('tovarnyy-beton', { mark: r.mark, class: r.cls, price: it.price });
  }

  // 2. остальной бетон
  for (const it of items) {
    let slug = CAT_MAP.slice(1).find(([re]) => re.test(it.cat))?.[1];
    if (!slug && /^Без категории/.test(it.cat) && /ПМД/.test(it.title)) slug = 'beton-s-pmd';
    if (!slug) continue;
    const r = parseConcrete(it.title, { withPmd: slug === 'beton-s-pmd' });
    if (!r.mark) { skipped.push(`${it.title}: нет марки`); continue; }
    if (slug === 'beton-s-pmd' && r.pmd === null) { skipped.push(`${it.title}: нет температуры ПМД`); continue; }
    const c = canon.get(r.mark);
    if (c && r.cls && r.cls !== c) note(`«${it.title}»: класс ${r.cls} заменён на ${c}, как у ${r.mark} в основном прайсе (по ТЗ марка и класс согласованы по всему сайту)`);
    const row = { mark: r.mark, class: c ?? r.cls, mobility: r.mobility, frost: r.frost, water: r.water, price: it.price };
    if (slug === 'beton-s-pmd') row.pmd = r.pmd;
    if (!row.class) { skipped.push(`${it.title}: нет класса и нет эталона`); continue; }
    add(slug, row);
  }

  // 3. «Бетон по схеме Г»: в источнике все 9 строк названы одинаково, марку не определить
  const g = items.filter((i) => /схеме Г/.test(i.cat));
  if (g.length) skipped.push(`«Бетон по схеме Г» (${g.length} строк): у всех строк одно и то же название «М100 B7,5 F75 W2 П4» при разных ценах ${g.map((x) => x.price).join('/')} — не включено, нужно поправить карточку`);

  // 4. дубли ключа: оставляем первую, остальные в журнал
  for (const [slug, rows] of bySlug) {
    const seen = new Map(); const keep = [];
    for (const r of rows) {
      const key = [r.mark, r.class, r.mobility, r.frost, r.water, r.pmd].join('|');
      if (seen.has(key)) { note(`${slug}: ${r.mark}${r.pmd != null ? ` ПМД${r.pmd}` : ''} ${r.mobility ?? ''} — повтор позиции с ценой ${r.price} при ${seen.get(key)} уже принятой, повтор отброшен`); continue; }
      seen.set(key, r.price); keep.push(r);
    }
    bySlug.set(slug, keep);
  }
  // 5. «Сухой бетон В35 М400» дублирует В30 М400 при другом классе: после замены попал в дубли выше

  // 6. растворы и ЦПС
  for (const it of items) {
    if (/^Раствор|^Монтажный раствор/.test(it.cat) || /^Монтажный раствор/.test(it.title)) {
      add('rastvory', { name: it.title, spec: MORTAR_USE[it.title] ?? null, unit: 'м³', price: it.price });
    } else if (/^ЦПС/.test(it.cat)) {
      const m = it.title.match(/ЦПС\s+(\d+:\d+)\s+М(\d+)/);
      if (!m) { skipped.push(`${it.title}: не разобрано`); continue; }
      add('tsps', { name: `ЦПС ${m[1]} М${m[2]}`, spec: `${TSPS_USE[m[1]] ?? ''}`.trim() || null, unit: 'м³', price: it.price });
    }
  }
  // 7. арматура
  for (const it of items.filter((i) => /^Арматура/.test(i.cat))) {
    const m = it.title.match(/Арматура\s+(\d+)\s*мм\s+(.+)$/);
    if (!m) { skipped.push(`${it.title}: не разобрано`); continue; }
    const rest = m[2].replace(/А3Н\/Д/, 'А3 Н/Д').trim();
    const [cls, ...steel] = rest.split(/\s+/);
    add('armatura', { name: `Арматура ${m[1]} мм ${rest}`, diameter_mm: Number(m[1]), rebar_class: cls, steel: steel.join(' ') || null, group: it.cat.replace(/^Арматура\s*/, ''), unit: 'т', price: it.price });
  }

  const num = (s) => parseInt(String(s).replace(/\D/g, ''), 10);
  const order = ['tovarnyy-beton', 'beton-s-pmd', 'fibrobeton', 'gidrotehnicheskiy-beton', 'beton-na-melkom-share', 'keramzitobeton', 'suhoy-beton', 'rastvory', 'tsps', 'armatura'];
  const categories = order.filter((s) => bySlug.has(s)).map((slug) => {
    let rows = bySlug.get(slug);
    if (rows[0]?.mark) rows = rows.sort((a, b) => num(a.mark) - num(b.mark) || Math.abs(a.pmd ?? 0) - Math.abs(b.pmd ?? 0) || String(a.mobility).localeCompare(String(b.mobility)) || a.price - b.price);
    return { slug, rows };
  });
  return { categories, skipped, items };
}

function buildRental(items) {
  const units = [], extras = [];
  for (const it of items) {
    let m;
    if ((m = it.title.match(/^Аренда автобетононасоса \(АБН\)\s*(\d+)\s*-\s*(\d+)\s*м/))) {
      units.push({ name: `Автобетононасос ${m[1]}–${m[2]} м`, reach_m: Number(m[2]), reach_text: `${m[1]}–${m[2]} м`, price: it.price, unit: 'час' });
    } else if (/^Аренда миксера \(PUMI\)/.test(it.title)) {
      extras.push({ name: 'Миксер с бетононасосом (PUMI)', price: it.price, unit: 'час', note: 'Стрела насоса 28–32 м, миксер перевозит до 10 м³ бетона' });
    } else if (/^Аренда доп\. бетоноводов/.test(it.title)) {
      extras.push({ name: 'Дополнительные бетоноводы (шланги)', price: it.price, unit: 'м', note: 'Магистраль до 150 м: подача в дальние и труднодоступные точки' });
    } else if (/^Труба 4-6м/.test(it.title)) {
      extras.push({ name: 'Труба 4–6 м', price: it.price, unit: 'шт.', note: 'Подача бетона на небольшое расстояние без сильного подъёма: до 7 м по длине, до 1,4 м по высоте' });
    } else if ((m = it.title.match(/^Услуга транспортерной ленты (\d+) метров/))) {
      extras.push({ name: `Транспортерная лента ${m[1]} м`, price: it.price, unit: 'час', min_hours: 2, note: 'Минимальная смена 2 часа' });
    }
  }
  units.sort((a, b) => a.reach_m - b.reach_m);
  extras.sort((a, b) => a.name.localeCompare(b.name, 'ru'));
  return { available: units.length > 0, units, extras };
}

// ---------- сборка content ----------
const writeJson = (file, data) => fs.writeFileSync(file, `${JSON.stringify(data, null, 2)}\n`);
const readJson = (file) => JSON.parse(fs.readFileSync(file, 'utf8'));

function mergeSite(card) {
  const f = C('site.json');
  const site = readJson(f);
  const o = card.org;
  const feat = Object.fromEntries((o.features || []).map((x) => [x.id, x]));
  const put = (obj, key, val) => { if ((obj[key] === null || obj[key] === undefined || obj[key] === '') && val !== undefined) obj[key] = val; };
  put(site.plant, 'address', o.fullAddress);
  put(site.plant, 'street', [o.compositeAddress?.street, o.compositeAddress?.house].filter(Boolean).join(', '));
  put(site.plant.geo, 'lat', o.coordinates?.[1]);
  put(site.plant.geo, 'lon', o.coordinates?.[0]);
  put(site.plant, 'yandex_org_id', o.id);
  put(site.plant, 'locality', o.compositeAddress?.locality);
  put(site.plant, 'yandex_url', SHORT);
  const ph = (o.phones || [])[0];
  if (ph) { put(site.phone, 'display', ph.number); put(site.phone, 'e164', ph.value); }
  site.card = {
    categories: (o.categories || []).map((c) => c.name),
    hours_on_card: o.workingTimeText ?? null,
    pickup: !!feat.pickup?.value,
    delivery: !!feat.delivery?.value,
    payment: (feat.payment_method?.value || []).map((v) => v.name),
    pay_by_card: !!feat.payment_by_credit_card?.value,
    rating: card.reviewsSummary ? { value: Math.round(card.reviewsSummary.ratingValue * 10) / 10, count: card.reviewsSummary.ratingCount } : null,
    fetched_at: card.fetched_at
  };
  writeJson(f, site);
  return site;
}

function pickReviews(card) {
  // Две отзыва с ответом владельца и конкретикой плюс самый свежий из остальных. Не берём упоминания лаборатории и условий
  // оплаты, которых нет в брифе: сайт не должен противоречить собственным фактам.
  const avoid = /лаборатор|скрыт|доплат|простой|профессиональный подход к клиентам/i;
  const byDate = (a, b) => b.updatedTime.localeCompare(a.updatedTime);
  const list = (card.reviews || []).filter((r) => (r.text || '').length >= 140 && !avoid.test(r.text) && r.rating >= 4);
  const replied = list.filter((r) => r.businessComment && (r.text || '').length >= 200).sort(byDate).slice(0, 2);
  const rest = list.filter((r) => !replied.includes(r)).sort(byDate);
  return [...replied, ...rest].slice(0, 3).sort(byDate)
    .map((r) => ({ author: r.author?.name, text: r.text.trim(), date: r.updatedTime.slice(0, 10), source_url: SHORT }));
}

async function main() {
  fs.mkdirSync(C('_source'), { recursive: true });
  const snap = C('_source', 'yandex-card.json');
  let card;
  if (args.includes('--snapshot')) card = readJson(snap);
  else { card = await fetchLive(); writeJson(snap, card); console.log('Снимок карточки: content/_source/yandex-card.json'); }

  const { categories, skipped, items } = buildPrices(card.goods);
  writeJson(C('prices.json'), { categories });
  const rental = buildRental(items);
  writeJson(C('rental.json'), rental);
  const site = mergeSite(card);
  if (!site.reviews.items?.length || args.includes('--refresh-reviews')) { site.reviews.items = pickReviews(card); writeJson(C('site.json'), site); }

  if (args.includes('--photos')) {
    const photos = await fetchPhotos(card.source);
    writeJson(C('_source', 'photos-meta.json'), photos.map((p, i) => ({ n: i + 1, width: p.width, height: p.height, tags: (p.tags || []).map((t) => t.name), author: p.copyright?.name, url: p.url })));
    console.log(`Фото на карточке: ${photos.length}. Список: content/_source/photos-meta.json. Отбор и описание делаются вручную в content/photos.json: смотрите снимки глазами.`);
  }

  const nrows = categories.reduce((n, c) => n + c.rows.length, 0);
  const notes = `# Журнал импорта карточки Яндекс Карт

Снимок: ${card.fetched_at}. Источник: ${card.source}

Принято строк прайса: ${nrows} в ${categories.length} категориях; аренда: ${rental.units.length} АБН и ${rental.extras.length} доп. позиций.

## Не включено из-за ошибок в самой карточке (исправьте в Яндекс Бизнесе)

${skipped.map((s) => `- ${s}`).join('\n') || '—'}

## Исправлено при импорте

${log.map((s) => `- ${s}`).join('\n') || '—'}

## Режим работы

На карточке: «${card.org.workingTimeText}». На сайте везде 24/7, по ТЗ в карточке организации должно быть то же. Исправьте график в Яндекс Бизнесе.
`;
  fs.writeFileSync(C('_source', 'NOTES.md'), notes);
  console.log(notes);
}
main().catch((e) => { console.error(e); process.exit(1); });
