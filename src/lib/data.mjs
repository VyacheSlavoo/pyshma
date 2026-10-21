// Загрузка, нормализация и проверка данных точки. Ничего не додумывает: чего нет, о том сообщает.
import fs from 'node:fs';
import path from 'node:path';
import { normMark, normClass, markSlug, getPath, isoDate, monthStart, monthEnd } from './util.mjs';
import { classFor, MARK_ORDER } from './marks.mjs';
import { CATEGORY_DEFS, CONCRETE_KINDS } from './categories.mjs';

const readJson = (dir, name) => JSON.parse(fs.readFileSync(path.join(dir, name), 'utf8'));

const REQUIRED = [
  ['domain', 'основной домен с https://'],
  ['brand', 'название на сайте'],
  ['founded_year', 'с какого года работает производство'],
  ['plant.locality', 'населённый пункт завода'],
  ['plant.locality_in', 'он же с предлогом («в Ульяновке»)'],
  ['plant.locality_from', 'он же с «из» («из Ульяновки»)'],
  ['plant.region', 'регион'],
  ['plant.district_dat', 'район в дательном падеже («Тосненскому району»)'],
  ['plant.address', 'адрес завода как в Яндекс Бизнесе'],
  ['plant.street', 'улица и дом (schema.org)'],
  ['plant.geo.lat', 'широта завода'],
  ['plant.geo.lon', 'долгота завода'],
  ['plant.yandex_url', 'ссылка на карточку в Яндекс Картах'],
  ['phone.display', 'телефон для показа'],
  ['phone.e164', 'телефон для tel: (+7...)'],
  ['min_volume_m3', 'минимальный объём заказа'],
  ['vat', 'НДС: included | excluded | none'],
  ['delivery.price_includes_delivery', 'входит ли доставка в цену бетона: true или false']
];

export function loadData({ contentDir, now, fixture = false }) {
  const site = readJson(contentDir, 'site.json');
  const pricesRaw = readJson(contentDir, 'prices.json');
  const citiesRaw = readJson(contentDir, 'cities.json');
  const rentalRaw = readJson(contentDir, 'rental.json');
  const photosRaw = readJson(contentDir, 'photos.json');
  const texts = readJson(contentDir, 'texts.json');

  const errors = [];
  const warnings = [];

  for (const [p, label] of REQUIRED) {
    const v = getPath(site, p);
    if (v === null || v === undefined || v === '') errors.push(`site.json: не заполнено ${p} (${label})`);
  }
  if (site.domain && (!/^https:\/\/[^/]+$/.test(site.domain) || /\/\/www\./.test(site.domain))) {
    errors.push('site.json: domain должен быть вида https://example.ru (без слэша в конце и без www)');
  }
  if (site.vat && !['included', 'excluded', 'none'].includes(site.vat)) errors.push('site.json: vat должен быть included, excluded или none');
  if (site.phone?.e164 && !/^\+7\d{10}$/.test(site.phone.e164)) errors.push('site.json: phone.e164 должен быть вида +7XXXXXXXXXX');
  for (const m of site.messengers || []) {
    if (!['telegram', 'whatsapp', 'max', 'viber'].includes(m.type) || !/^https:\/\//.test(m.url || '')) errors.push(`site.json: messengers: нужен type и рабочий https-url (${JSON.stringify(m)})`);
  }

  // Прайс
  const categories = [];
  for (const c of pricesRaw.categories || []) {
    const def = CATEGORY_DEFS[c.slug];
    if (!def || def.kind === 'rental') { errors.push(`prices.json: неизвестная категория «${c.slug}»`); continue; }
    const rows = [];
    const seen = new Set();
    (c.rows || []).forEach((r, i) => {
      const where = `prices.json: ${c.slug}[${i}]`;
      if (!(r.price > 0)) { errors.push(`${where}: цена должна быть положительным числом`); return; }
      if (CONCRETE_KINDS.has(def.kind)) {
        if (!r.mark) { errors.push(`${where}: нет марки`); return; }
        const mark = normMark(r.mark);
        const cls = normClass(r.class) || classFor(mark);
        if (!r.class) warnings.push(`${where}: класс не указан, подставлен ${cls} из справочника — проверьте по прайсу завода`);
        const row = {
          mark, cls, markSlug: markSlug(mark),
          mobility: r.mobility ? String(r.mobility).toUpperCase().replace(/^P/, 'П') : null,
          frost: r.frost ? String(r.frost).toUpperCase().replace(/\s/g, '') : null,
          water: r.water ? String(r.water).toUpperCase().replace(/\s/g, '') : null,
          filler: r.filler || def.filler || null,
          pmd: def.kind === 'pmd' ? (r.pmd ?? null) : null,
          price: Math.round(r.price), note: r.note || null
        };
        if (def.kind === 'pmd' && row.pmd === null) errors.push(`${where}: для ПМД нужна температура pmd`);
        const key = [row.mark, row.cls, row.mobility, row.frost, row.water, row.filler, row.pmd].join('|');
        if (seen.has(key)) warnings.push(`${where}: дубль позиции ${row.mark} ${row.mobility ?? ''}`);
        seen.add(key);
        rows.push(row);
      } else {
        if (!r.name) { errors.push(`${where}: нет названия`); return; }
        rows.push({ name: r.name, spec: r.spec || null, unit: r.unit || 'м³', price: Math.round(r.price), note: r.note || null });
      }
    });
    if (!rows.length) { warnings.push(`prices.json: категория ${c.slug} пуста, страница не будет создана`); continue; }
    if (CONCRETE_KINDS.has(def.kind)) {
      rows.sort((a, b) => MARK_ORDER.indexOf(a.mark) - MARK_ORDER.indexOf(b.mark) || (a.pmd ?? 0) - (b.pmd ?? 0) || a.price - b.price);
      // класс одной марки в пределах сайта должен быть один
    }
    categories.push({ slug: c.slug, ...def, rows });
  }
  categories.sort((a, b) => a.order - b.order);

  // Согласованность марка ↔ класс по всему сайту
  const classByMark = new Map();
  for (const c of categories) for (const r of c.rows) {
    if (!r.cls) continue;
    if (classByMark.has(r.mark) && classByMark.get(r.mark) !== r.cls) errors.push(`prices.json: марка ${r.mark} встречается с разными классами (${classByMark.get(r.mark)} и ${r.cls})`);
    else classByMark.set(r.mark, r.cls);
  }

  // Аренда АБН
  let rental = null;
  if (rentalRaw.available) {
    const units = (rentalRaw.units || []).filter(Boolean);
    if (!units.length) errors.push('rental.json: available=true, но список units пуст');
    for (const [i, u] of units.entries()) {
      for (const f of ['name', 'reach_m', 'capacity_m3h', 'pipe_diameter_mm']) if (u[f] == null) errors.push(`rental.json: units[${i}].${f} не заполнено`);
      if (u.price_shift == null && u.price_hour == null) errors.push(`rental.json: units[${i}] — нужна цена price_shift или price_hour`);
    }
    if (units.length) {
      rental = { slug: 'arenda-abn', ...CATEGORY_DEFS['arenda-abn'], units };
    }
  }

  // Города
  const cities = [];
  for (const [i, c] of (citiesRaw.cities || []).entries()) {
    for (const f of ['slug', 'tier', 'name', 'in']) if (!c[f]) errors.push(`cities.json: cities[${i}].${f} не заполнено`);
    if (c.tier && !['city', 'settlement'].includes(c.tier)) errors.push(`cities.json: cities[${i}].tier: city или settlement`);
    cities.push({ notes: [], faq: [], ...c, url: c.tier === 'settlement' ? `/dostavka/${c.slug}/` : `/${c.slug}/` });
  }
  if (cities.filter((c) => c.tier === 'city').length > 2) warnings.push('cities.json: больше двух приоритетных городов — ТЗ рекомендует 1–2');
  if (new Set(cities.map((c) => c.slug)).size !== cities.length) errors.push('cities.json: повторяющиеся slug');

  // Фото
  const photos = (photosRaw.photos || []).map((p) => ({ ...p, abs: path.join(contentDir, 'photos', p.file) }));
  for (const p of photos) {
    if (!fs.existsSync(p.abs)) errors.push(`photos.json: файл не найден ${p.file}`);
    if (!p.alt) errors.push(`photos.json: у ${p.file} нет alt`);
  }
  if (!photos.some((p) => p.role === 'hero')) errors.push('photos.json: нужно реальное фото завода с role "hero"');

  // Цена «от»: минимум товарного бетона (то, что обещает заголовок)
  const concreteCats = categories.filter((c) => CONCRETE_KINDS.has(c.kind));
  if (!concreteCats.length) errors.push('prices.json: нет ни одной бетонной категории');
  const mainConcrete = categories.find((c) => c.slug === 'tovarnyy-beton') || concreteCats.find((c) => c.kind === 'concrete') || concreteCats[0];
  const fromPrice = mainConcrete ? Math.min(...mainConcrete.rows.map((r) => r.price)) : null;

  // Марки со своими страницами
  const markPages = (site.mark_pages || []).map(normMark);
  for (const m of markPages) {
    if (!mainConcrete || !mainConcrete.rows.some((r) => r.mark === m)) errors.push(`site.json: mark_pages содержит ${m}, но в категории ${mainConcrete?.slug} такой марки нет`);
  }

  const priceDate = monthStart(now);
  const ctx = {
    site, texts, categories, rental, cities, photos, fixture, errors, warnings,
    origin: site.domain,
    host: site.domain ? new URL(site.domain).host : null,
    now, priceDate, priceValidUntil: monthEnd(now), priceDateIso: isoDate(priceDate),
    mainConcrete, fromPrice, markPages,
    classByMark
  };
  return ctx;
}

export const T = (ctx, key, fallback) => (ctx.texts[key] !== undefined ? ctx.texts[key] : fallback);
