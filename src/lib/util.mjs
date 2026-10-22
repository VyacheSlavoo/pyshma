// Общие помощники: безопасный html-шаблон, форматирование цен и дат.

export class Raw {
  constructor(s) { this.s = s; }
  toString() { return this.s; }
}
export const raw = (s) => new Raw(String(s ?? ''));

const ESC = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' };
export const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ESC[c]);

function render(v) {
  if (v === null || v === undefined || v === false || v === true) return '';
  if (v instanceof Raw) return v.s;
  if (Array.isArray(v)) return v.map(render).join('');
  return esc(v);
}

// h`<p>${text}</p>` — строки экранируются, Raw и вложенные h`` проходят как есть.
export function h(strings, ...vals) {
  let out = strings[0];
  for (let i = 0; i < vals.length; i++) out += render(vals[i]) + strings[i + 1];
  return new Raw(out);
}
export const join = (arr, sep = '') => raw(arr.map(render).join(sep));
export const str = (v) => render(v);

export const NBSP = ' ';

export function fmtNum(n) {
  const [i, f] = String(Math.round(n * 100) / 100).split('.');
  const g = i.replace(/\B(?=(\d{3})+(?!\d))/g, NBSP);
  return f ? `${g},${f}` : g;
}
export const rub = (n) => `${fmtNum(n)}${NBSP}₽`;
export const rubM3 = (n) => `${fmtNum(n)}${NBSP}₽/м³`;

const MONTHS_GEN = ['января', 'февраля', 'марта', 'апреля', 'мая', 'июня', 'июля', 'августа', 'сентября', 'октября', 'ноября', 'декабря'];
export const dateRu = (d) => `${d.getUTCDate()} ${MONTHS_GEN[d.getUTCMonth()]} ${d.getUTCFullYear()}`;
export const isoDate = (d) => d.toISOString().slice(0, 10);
export function monthStart(d) { return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), 1)); }
export function monthEnd(d) { return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth() + 1, 0)); }

// Кириллическая М/В в марке и классе, латинская F/W в морозостойкости и водонепроницаемости.
export function normMark(m) {
  return String(m).trim().toUpperCase().replace(/^M/, 'М').replace(/^(.)/, '$1').replace(/\s+/g, '');
}
export function normClass(c) {
  if (!c) return null;
  return String(c).trim().toUpperCase().replace(/^B/, 'В').replace('.', ',').replace(/\s+/g, '');
}
export const markSlug = (m) => 'm' + String(m).replace(/\D/g, '');

export function plural(n, one, few, many) {
  const a = Math.abs(n) % 100, b = a % 10;
  if (a > 10 && a < 20) return many;
  if (b > 1 && b < 5) return few;
  if (b === 1) return one;
  return many;
}

export function getPath(obj, path) {
  return path.split('.').reduce((o, k) => (o == null ? undefined : o[k]), obj);
}

// Неразрывный пробел после коротких предлогов и перед единицами измерения: «в Верхней Пышме», «−15 °C», «5 м³».
export function nb(s) {
  return String(s)
    .replace(/(^|[\s(«])(в|на|и|с|к|у|о|по|от|до|за|из|не|для)\s+(?=\S)/gi, (m, a, w) => `${a}${w}${NBSP}`)
    .replace(/\s+(°C|м³|м²|₽|см|мм|кг|т|ч)(?=[\s.,;:)!?]|$)/g, `${NBSP}$1`);
}

export function truncate(s, n) {
  s = String(s).replace(/\s+/g, ' ').trim();
  if (s.length <= n) return s;
  const cut = s.slice(0, n - 1);
  return cut.slice(0, cut.lastIndexOf(' ')).replace(/[,;:\-–—\s]+$/, '') + '…';
}
