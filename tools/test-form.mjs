// Проверка server/send.php: капча, защита от ботов и отправка письма. Нужен php в PATH.
// Поднимает встроенный сервер PHP и заглушку SMTP, настоящую почту не трогает: node tools/test-form.mjs
import fs from 'node:fs';
import os from 'node:os';
import net from 'node:net';
import path from 'node:path';
import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'form-test-'));
const site = path.join(tmp, 'site');
fs.mkdirSync(site);
fs.copyFileSync(path.join(root, 'server/send.php'), path.join(site, 'send.php'));

// ---- заглушка SMTP: принимает любое письмо и запоминает его ----
const mails = [];
const smtp = net.createServer((sock) => {
  let data = false, buf = '', cur = '';
  const w = (s) => sock.write(`${s}\r\n`);
  w('220 stub ESMTP');
  let step = '';
  sock.on('data', (d) => {
    buf += d.toString('utf8');
    for (;;) {
      if (data) {
        const i = buf.indexOf('\r\n.\r\n');
        if (i < 0) return;
        cur += buf.slice(0, i); buf = buf.slice(i + 5); data = false;
        mails.push(cur); cur = ''; w('250 queued'); continue;
      }
      const i = buf.indexOf('\r\n');
      if (i < 0) return;
      const line = buf.slice(0, i); buf = buf.slice(i + 2);
      if (step === 'user') { step = 'pass'; w('334 UGFzc3dvcmQ6'); continue; }
      if (step === 'pass') { step = ''; w('235 ok'); continue; }
      if (/^EHLO/i.test(line)) w('250 stub');
      else if (/^AUTH LOGIN/i.test(line)) { step = 'user'; w('334 VXNlcm5hbWU6'); }
      else if (/^MAIL FROM/i.test(line) || /^RCPT TO/i.test(line)) w('250 ok');
      else if (/^DATA/i.test(line)) { data = true; w('354 go'); }
      else if (/^QUIT/i.test(line)) { w('221 bye'); sock.end(); }
      else w('250 ok');
    }
  });
});
await new Promise((r) => smtp.listen(0, '127.0.0.1', r));
const smtpPort = smtp.address().port;

fs.writeFileSync(path.join(site, 'send.config.php'), `<?php return [
  'smtp_host' => '127.0.0.1', 'smtp_port' => ${smtpPort}, 'smtp_secure' => 'none', 'smtp_user' => 'u@test.example', 'smtp_pass' => 'p',
  'from' => 'u@test.example', 'from_name' => 'Тест', 'to' => 'a@test.example, b@test.example', 'site_host' => 'test.local', 'brand' => 'Тест',
  'log_dir' => ${JSON.stringify(path.join(tmp, 'leads'))}, 'captcha_secret' => 'test-secret', 'captcha_ttl' => 4,
];\n`);

const portProbe = net.createServer();
await new Promise((r) => portProbe.listen(0, '127.0.0.1', r));
const phpPort = portProbe.address().port;
await new Promise((r) => portProbe.close(r));
const php = spawn('php', ['-S', `127.0.0.1:${phpPort}`, '-t', site], { stdio: 'ignore' });
const base = `http://127.0.0.1:${phpPort}/send.php`;
for (let i = 0; i < 50; i++) { try { await fetch(base); break; } catch { await new Promise((r) => setTimeout(r, 100)); } }

let failed = 0;
const ok = (cond, name, extra = '') => { console.log(`${cond ? '✓' : '✗'} ${name}${cond ? '' : ` ${extra}`}`); if (!cond) failed++; };
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const solve = (q) => { const [a, op, b] = q.split(' '); return op === '+' ? +a + +b : op === '×' ? +a * +b : +a - +b; };
const challenge = async () => (await fetch(`${base}?captcha=1`)).json();
const post = async (fields, headers = {}) => {
  const body = new URLSearchParams({ phone: '+79001234567', volume: '5', item: 'Бетон М300', address: 'Тестовая, 1', consent: '1', ts: String(Date.now() - 5000), source: 'test', ...fields });
  const r = await fetch(base, { method: 'POST', body, headers: { Accept: 'application/json', ...headers }, redirect: 'manual' });
  let j = null; try { j = await r.json(); } catch { /* не json */ }
  return { status: r.status, j };
};

try {
  const c = await challenge();
  ok(/^\d+ [+−×] \d+$/.test(c.q) && /^\d+\.[0-9a-f]{16}\.[0-9a-f]{64}$/.test(c.t), 'пример и токен выдаются', JSON.stringify(c));
  ok(!c.t.includes(String(solve(c.q)) + '.'), 'ответ в токене не передаётся');

  let r = await post({ ct: c.t, cap: String(solve(c.q)) });
  ok(r.status === 200 && r.j?.ok === true, 'верный ответ: заявка принята', JSON.stringify(r));
  await sleep(300);
  ok(mails.length === 1, 'письмо ушло в SMTP', String(mails.length));
  const text = Buffer.from((mails[0] || '').split('\r\n\r\n')[1] || '', 'base64').toString('utf8');
  ok(/\+79001234567/.test(text) && /Объём: 5 м³/.test(text) && /Что заказать: Бетон М300/.test(text), 'в письме телефон, объём с единицей и позиция', text);

  r = await post({ ct: c.t, cap: String(solve(c.q)) });
  ok(r.status === 422 && r.j?.error === 'captcha_bad', 'тот же токен второй раз не принимается', JSON.stringify(r));

  const c2 = await challenge();
  r = await post({ ct: c2.t, cap: String(solve(c2.q) + 1) });
  ok(r.status === 422 && r.j?.error === 'captcha_bad', 'неверный ответ отклоняется', JSON.stringify(r));
  r = await post({ ct: c2.t, cap: String(solve(c2.q)) });
  ok(r.status === 422, 'токен после неверной попытки сгорел: перебор ответов невозможен', JSON.stringify(r));

  r = await post({});
  ok(r.status === 422 && r.j?.error === 'captcha_missing', 'без капчи: captcha_missing', JSON.stringify(r));

  const c3 = await challenge();
  const forged = c3.t.replace(/\.[0-9a-f]{16}\./, '.0000000000000000.');
  r = await post({ ct: forged, cap: String(solve(c3.q)) });
  ok(r.status === 422 && r.j?.error === 'captcha_bad', 'подделанный токен отклоняется', JSON.stringify(r));

  const c4 = await challenge();
  await sleep(6000);
  r = await post({ ct: c4.t, cap: String(solve(c4.q)) });
  ok(r.status === 422 && r.j?.error === 'captcha_expired', 'просроченный токен: captcha_expired', JSON.stringify(r));

  const c5 = await challenge();
  const before = mails.length;
  r = await post({ ct: c5.t, cap: String(solve(c5.q)), website: 'spam.example' });
  await sleep(200);
  ok(r.status === 200 && mails.length === before, 'honeypot: ответ 200, письма нет', JSON.stringify(r));

  const c6 = await challenge();
  r = await post({ ct: c6.t, cap: String(solve(c6.q)) }, { Origin: 'https://evil.example' });
  ok(r.status === 403, 'чужой Origin: 403', JSON.stringify(r));

  const c7 = await challenge();
  r = await post({ ct: c7.t, cap: String(solve(c7.q)), ts: String(Date.now()) });
  ok(r.status === 429 && r.j?.error === 'too_fast', 'форма отправлена быстрее 2 секунд: too_fast', JSON.stringify(r));

  const c8 = await challenge();
  r = await post({ ct: c8.t, cap: String(solve(c8.q)), volume: '2,5 т', item: 'Арматура 12 мм А3 А500С' });
  await sleep(300);
  const t8 = Buffer.from((mails.at(-1) || '').split('\r\n\r\n')[1] || '', 'base64').toString('utf8');
  ok(r.status === 200 && /Объём: 2,5 т/.test(t8) && !/2,5 т м³/.test(t8), 'объём с единицей «т» не получает «м³»', t8);

  const c9 = await challenge();
  const html = await fetch(base, { method: 'POST', body: new URLSearchParams({ phone: '+79001234567', consent: '1', ts: String(Date.now() - 5000) }), headers: { Accept: 'text/html' } });
  const htmlText = await html.text();
  ok(html.status === 422 && /JavaScript/.test(htmlText), 'без JS: понятное сообщение про JavaScript', `${html.status} ${htmlText.slice(0, 120)}`);
  void c9;

  // лимит: пять заявок за 10 минут с одного адреса (две уже прошли выше)
  let limited = null;
  for (let i = 0; i < 6 && !limited; i++) {
    const c = await challenge();
    const x = await post({ ct: c.t, cap: String(solve(c.q)) });
    if (x.status === 429) limited = x;
  }
  ok(limited?.j?.error === 'rate', 'лимит заявок с одного адреса: rate', JSON.stringify(limited));

  const g = await fetch(base, { method: 'GET' });
  ok(g.status === 405, 'GET без captcha: 405', String(g.status));
} finally {
  php.kill(); smtp.close();
  fs.rmSync(tmp, { recursive: true, force: true });
}
console.log(failed ? `\nПровалено проверок: ${failed}` : '\nФорма и капча: все проверки пройдены');
process.exit(failed ? 1 : 0);
