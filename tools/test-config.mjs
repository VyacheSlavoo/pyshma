// Проверка конфигуратора в Chromium: node tools/test-config.mjs [dist-dir]
// Страницы берутся из собранного сайта, цены сверяются с content/prices.json и content/rental.json.
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright-core';
import { serve } from './serve.mjs';
import { loadData } from '../src/lib/data.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const dir = process.argv[2] ?? 'dist';
const ctx = loadData({ contentDir: path.join(root, 'content'), now: new Date() });
const cat = (slug) => ctx.categories.find((c) => c.slug === slug);
const minOf = (rows) => Math.min(...rows.map((r) => r.price));
const money = (n) => `${String(n).replace(/\B(?=(\d{3})+(?!\d))/g, ' ')} ₽`;

let failed = 0;
const ok = (cond, name, extra = '') => { console.log(`${cond ? '✓' : '✗'} ${name}${cond ? '' : `  (${extra})`}`); if (!cond) failed++; };

const { server, port } = await serve(dir);
const browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH || '/opt/pw-browsers/chromium', headless: true, args: ['--no-sandbox'] });
const base = `http://127.0.0.1:${port}`;
const errors = [];

async function open(url, { js = true, width = 1280 } = {}) {
  const c = await browser.newContext({ viewport: { width, height: 900 }, javaScriptEnabled: js });
  const p = await c.newPage();
  p.on('pageerror', (e) => errors.push(`${url}: ${e.message}`));
  await p.route('**/send.php**', async (route) => {
    const req = route.request();
    if (req.method() === 'GET') return route.fulfill({ json: { q: '3 + 4', t: '1.0000000000000000.x' } });
    p._posted = req.postData();
    return route.fulfill({ json: { ok: true, error: '' } });
  });
  await p.goto(`${base}${url}`, { waitUntil: 'networkidle' });
  return p;
}
const txt = (p, o) => p.locator(`[data-o="${o}"]`).first().innerText();
const pick = (p, attr, value) => p.locator(`[data-attr="${attr}"] input[value="${value}"]`).evaluate((el) => el.click());
const checked = (p, attr) => p.locator(`[data-attr="${attr}"] input:checked`).evaluate((el) => el.value).catch(() => null);

// ---------- 1. страница марки М300: все виды бетона ----------
{
  const p = await open('/catalog/tovarnyy-beton/m300/');
  const base300 = cat('tovarnyy-beton').rows.find((r) => r.mark === 'М300');
  ok((await txt(p, 'price')) === money(base300.price), 'М300: стартовая цена = прайс', await txt(p, 'price'));
  ok((await txt(p, 'des')).includes('Товарный бетон М300 (В22,5)'), 'М300: обозначение', await txt(p, 'des'));

  const pmd = cat('beton-s-pmd').rows.filter((r) => r.mark === 'М300');
  await pick(p, 'cat', 'beton-s-pmd');
  ok((await txt(p, 'price')) === money(minOf(pmd)), 'вид «с ПМД»: выбрана самая дешёвая позиция', await txt(p, 'price'));
  ok((await txt(p, 'chg')).includes('нет прежнего сочетания'), 'пояснение, что параметры подобраны заново', await txt(p, 'chg'));

  const t15 = pmd.filter((r) => r.pmd === -15);
  await pick(p, 'pmd', '-15');
  ok((await txt(p, 'price')) === money(minOf(t15)), 'ПМД до −15: цена из прайса', await txt(p, 'price'));
  const t15p4 = t15.find((r) => r.mobility === 'П4');
  await pick(p, 'mob', 'П4');
  ok((await txt(p, 'price')) === money(t15p4.price), 'П4 при ПМД −15', await txt(p, 'price'));
  ok((await txt(p, 'des')) === `Бетон с ПМД М300 (В22,5), ПМД до −15 °C, П4, F150, W6` || (await txt(p, 'des')).includes('П4, F150, W6'), 'обозначение собрано из выбранных значений', await txt(p, 'des'));

  await p.locator('[data-o="qty"]').fill('10');
  ok((await txt(p, 'total')) === money(t15p4.price * 10), 'итог = цена × 10 м³', await txt(p, 'total'));
  await p.locator('[data-step="1"]').click();
  ok((await p.locator('[data-o="qty"]').inputValue()) === '10,5' && (await txt(p, 'total')) === money(Math.round(t15p4.price * 10.5)), 'кнопка «+» добавляет 0,5 м³', await p.locator('[data-o="qty"]').inputValue());
  await p.locator('[data-o="qty"]').fill('0,3');
  await p.locator('[data-o="qty"]').dispatchEvent('change');
  ok((await p.locator('[data-o="qty"]').inputValue()) === '1' && /Минимальный заказ/.test(await txt(p, 'chg')), 'объём меньше минимального поднимается до 1 м³ с пояснением', await txt(p, 'chg'));
  await p.locator('[data-o="qty"]').fill('10,5');
  await p.locator('[data-o="qty"]').dispatchEvent('change');

  const hash = await p.evaluate(() => location.hash);
  ok(/^#pmd-m300-t15-p4-f150-w6$/.test(hash), 'выбор попал в адрес страницы', hash);
  const selRow = await p.locator('tr.is-sel').first().getAttribute('data-k').catch(() => null);
  ok(selRow === hash.slice(1), 'выбранная позиция подсвечена в таблице', String(selRow));

  await p.locator('[data-open-lead]').first().click();
  const dlg = p.locator('dialog.modal');
  ok(await dlg.evaluate((d) => d.open), 'кнопка «Оставить заявку» открывает форму');
  ok((await dlg.locator('input[name=item]').inputValue()).includes('П4, F150, W6'), 'в форму подставлена позиция', await dlg.locator('input[name=item]').inputValue());
  ok((await dlg.locator('input[name=volume]').inputValue()).replace(/ /g, ' ') === '10,5 м³', 'в форму подставлен объём', await dlg.locator('input[name=volume]').inputValue());
  await p.waitForFunction(() => document.querySelector('dialog.modal [data-cap-q]').textContent === '3 + 4');
  await dlg.locator('input[name=phone]').fill('+79001234567');
  await dlg.locator('input[name=cap]').fill('7');
  await dlg.locator('input[name=consent]').check();
  await p.waitForTimeout(2200);
  await dlg.locator('button[type=submit]').click();
  await p.waitForFunction(() => /Заявка отправлена/.test(document.querySelector('dialog.modal .form__msg').textContent));
  const body = p._posted || '';
  const field = (n) => (body.match(new RegExp(`name="${n}"\\r\\n\\r\\n([^\\r]*)`)) || [])[1];
  ok(field('cap') === '7' && /^1\.0+\.x$/.test(field('ct') ?? '') && /Бетон с ПМД М300/.test(field('item') ?? ''), 'форма отправляет ответ капчи, токен и позицию', `cap=${field('cap')} ct=${field('ct')} item=${field('item')}`);
  await p.context().close();

  // возврат по ссылке: выбор восстанавливается
  const q = await open(`/catalog/tovarnyy-beton/m300/${hash}`);
  ok((await txt(q, 'price')) === money(t15p4.price), 'ссылка с якорем восстанавливает выбор', await txt(q, 'price'));
  ok((await checked(q, 'pmd')) === '-15' && (await checked(q, 'mob')) === 'П4', 'в форме отмечены значения из ссылки');
  await q.context().close();
}

// ---------- 1б. вид бетона не меняется молча ----------
{
  const p = await open('/catalog/tovarnyy-beton/m300/');
  const before = await txt(p, 'des');
  await pick(p, 'mob', 'П4');
  ok((await txt(p, 'des')) === before && (await checked(p, 'cat')) === 'tovarnyy-beton', 'П4 есть у нескольких видов: выбор не меняется', await txt(p, 'des'));
  ok(/есть у видов/.test(await txt(p, 'chg')) && /сначала выберите вид/.test(await txt(p, 'chg')), 'сообщение объясняет, что выбрать вид нужно вручную', await txt(p, 'chg'));
  await pick(p, 'pmd', '-15');
  ok((await checked(p, 'cat')) === 'beton-s-pmd' && /только у вида/.test(await txt(p, 'chg')), 'ПМД есть только у одного вида: он выбирается с пояснением', await txt(p, 'chg'));
  await p.context().close();
}

// ---------- 2. клавиатура ----------
{
  const p = await open('/catalog/beton-s-pmd/');
  await p.locator('[data-attr="mark"] input:checked').focus();
  const before = await txt(p, 'price');
  await p.keyboard.press('ArrowRight');
  ok((await txt(p, 'price')) !== before, 'стрелка вправо переключает марку и цену', before);
  await p.context().close();
}

// ---------- 3. все страницы с конфигуратором: любой клик приводит к реальной позиции ----------
const urls = ['/catalog/tovarnyy-beton/', '/catalog/beton-s-pmd/', '/catalog/fibrobeton/', '/catalog/gidrotehnicheskiy-beton/', '/catalog/beton-na-melkom-share/', '/catalog/keramzitobeton/', '/catalog/suhoy-beton/', '/catalog/rastvory/', '/catalog/tsps/', '/catalog/armatura/', '/catalog/arenda-abn/', ...ctx.markPages.map((m) => `/catalog/tovarnyy-beton/${m.replace('М', 'm')}/`)];
for (const url of urls) {
  const p = await open(url);
  const data = JSON.parse(await p.locator('[data-cfg-data]').evaluate((e) => e.textContent));
  const ids = data.attrs.map((a) => a.id);
  let clicks = 0, bad = null;
  for (const a of data.attrs) {
    for (const o of data.opts[a.id]) {
      await pick(p, a.id, o.v);
      clicks++;
      const state = {};
      for (const id of ids) state[id] = await checked(p, id);
      const row = data.rows.find((r) => ids.every((id) => r.a[id] === state[id]));
      const shown = await txt(p, 'price');
      if (!row) { bad = `нет позиции для ${JSON.stringify(state)}`; break; }
      if (shown !== money(row.p)) { bad = `цена ${shown} ≠ ${money(row.p)} для ${row.l}`; break; }
      if (!(await txt(p, 'des')).startsWith(row.l)) { bad = `обозначение «${await txt(p, 'des')}» ≠ «${row.l}»`; break; }
    }
    if (bad) break;
  }
  ok(!bad, `${url}: ${clicks} переключений, каждое даёт реальную позицию и верную цену`, bad ?? '');
  await p.context().close();
}

// ---------- 4. арматура и аренда: единицы и итог ----------
{
  const p = await open('/catalog/armatura/');
  const rows = cat('armatura').rows;
  const r12 = rows.find((r) => r.diameter === 12 && r.group === 'А3 А500С');
  await pick(p, 'group', 'А3 А500С'); await pick(p, 'dia', '12');
  await p.locator('[data-o="qty"]').fill('2,5');
  ok((await txt(p, 'total')) === money(Math.round(r12.price * 2.5)) && (await txt(p, 'per')) === 'за т', 'арматура: цена за тонну × 2,5 т', await txt(p, 'total'));
  await p.context().close();
  const q = await open('/catalog/arenda-abn/');
  const u = ctx.rental.units.find((x) => x.name.includes('26–32'));
  await pick(q, 'name', u.name);
  ok((await txt(q, 'per')) === 'за час' && (await txt(q, 'total')) === money(u.price * 4), 'аренда: цена за час × 4 ч по умолчанию', await txt(q, 'total'));
  await q.context().close();
}

// ---------- 5. без JavaScript остаётся таблица с ценами ----------
{
  const p = await open('/catalog/tovarnyy-beton/m300/', { js: false });
  ok(!(await p.locator('.cfg-wrap').isVisible()), 'без JS конфигуратор скрыт');
  ok((await p.locator('table.pt tbody tr').count()) > 0 && (await p.locator('table.pt').first().isVisible()), 'без JS видна таблица цен');
  await p.context().close();
}

// ---------- 6. мобильная ширина: мини-панель с ценой не закрывает управление ----------
{
  const p = await open('/catalog/tovarnyy-beton/m300/', { width: 375 });
  await p.locator('.cfg').scrollIntoViewIfNeeded();
  ok(await p.locator('.cfg__mini').isVisible(), '375 px: мини-панель с обозначением и ценой видна');
  const sw = await p.evaluate(() => [document.documentElement.scrollWidth, innerWidth]);
  ok(sw[0] <= sw[1], '375 px: нет горизонтального скролла', sw.join('>'));
  await p.context().close();
}

ok(errors.length === 0, 'в консоли нет ошибок JS', errors.slice(0, 3).join('; '));
await browser.close(); server.close();
console.log(failed ? `\nПровалено проверок: ${failed}` : '\nКонфигуратор: все проверки пройдены');
process.exit(failed ? 1 : 0);
