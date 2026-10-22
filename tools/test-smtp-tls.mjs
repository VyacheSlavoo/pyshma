// Проверка отправки так, как её делает Бегет: SMTP поверх TLS (порт 465), STARTTLS, вход по логину и паролю.
// Поднимает поддельный SMTP-сервер с самоподписанным сертификатом и гоняет через него server/send.php. Нужны php и openssl.
// node tools/test-smtp-tls.mjs
import fs from 'node:fs';
import os from 'node:os';
import net from 'node:net';
import tls from 'node:tls';
import path from 'node:path';
import { spawn, execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'smtp-tls-'));
execFileSync('openssl', ['req', '-x509', '-newkey', 'rsa:2048', '-nodes', '-keyout', path.join(tmp, 'k.pem'), '-out', path.join(tmp, 'c.pem'), '-days', '2', '-subj', '/CN=smtp.test.local'], { stdio: 'ignore' });
const key = fs.readFileSync(path.join(tmp, 'k.pem')), cert = fs.readFileSync(path.join(tmp, 'c.pem'));
const USER = 'zayavki@test.example', PASS = 'right-password';

const mails = [];
const logins = [];
// Протокол SMTP на одном сокете. starttls: сервер предлагает STARTTLS и после него переключает сокет на TLS.
function session(sock, { starttls }) {
  let secure = !starttls, data = false, buf = '', cur = '', step = '', user = '';
  const w = (s) => sock.write(`${s}\r\n`);
  w('220 smtp.test.local ESMTP');
  const onData = (d) => {
    buf += d.toString('utf8');
    for (;;) {
      if (data) {
        const i = buf.indexOf('\r\n.\r\n');
        if (i < 0) return;
        cur += buf.slice(0, i); buf = buf.slice(i + 5); data = false;
        mails.push(cur); cur = ''; w('250 2.0.0 queued'); continue;
      }
      const i = buf.indexOf('\r\n');
      if (i < 0) return;
      const line = buf.slice(0, i); buf = buf.slice(i + 2);
      if (step === 'user') { user = Buffer.from(line, 'base64').toString(); step = 'pass'; w('334 UGFzc3dvcmQ6'); continue; }
      if (step === 'pass') {
        step = '';
        const pass = Buffer.from(line, 'base64').toString();
        logins.push([user, pass]);
        if (user === USER && pass === PASS) w('235 2.7.0 Authentication successful'); else w('535 5.7.8 Authentication failed');
        continue;
      }
      if (/^EHLO/i.test(line)) { sock.write(`250-smtp.test.local\r\n${starttls && !secure ? '250-STARTTLS\r\n' : ''}250 AUTH LOGIN PLAIN\r\n`); }
      else if (/^STARTTLS/i.test(line) && starttls && !secure) {
        w('220 2.0.0 Ready to start TLS');
        sock.removeListener('data', onData);
        const t = new tls.TLSSocket(sock, { isServer: true, key, cert });
        secure = true; buf = '';
        t.on('data', (dd) => { sock = t; onData(dd); });
        t.on('error', () => {});
        // дальше пишем в TLS-сокет
        sock = t;
        return;
      }
      else if (/^AUTH LOGIN/i.test(line)) { if (!secure) { w('530 5.7.0 Must issue a STARTTLS command first'); continue; } step = 'user'; w('334 VXNlcm5hbWU6'); }
      else if (/^MAIL FROM/i.test(line) || /^RCPT TO/i.test(line)) w('250 2.1.0 ok');
      else if (/^DATA/i.test(line)) { data = true; w('354 go ahead'); }
      else if (/^QUIT/i.test(line)) { w('221 bye'); sock.end(); }
      else w('250 ok');
    }
  };
  sock.on('data', onData);
  sock.on('error', () => {});
}
const sslServer = tls.createServer({ key, cert }, (s) => session(s, { starttls: false }));
const startServer = net.createServer((s) => session(s, { starttls: true }));
await new Promise((r) => sslServer.listen(0, '127.0.0.1', r));
await new Promise((r) => startServer.listen(0, '127.0.0.1', r));
const sslPort = sslServer.address().port, startPort = startServer.address().port;

const site = path.join(tmp, 'site');
fs.mkdirSync(site);
fs.copyFileSync(path.join(root, 'server/send.php'), path.join(site, 'send.php'));
const writeConfig = (extra) => fs.writeFileSync(path.join(site, 'send.config.php'), `<?php return array_merge([
  'smtp_host' => 'localhost', 'smtp_port' => ${sslPort}, 'smtp_secure' => 'ssl', 'smtp_user' => '${USER}', 'smtp_pass' => '${PASS}',
  'from' => '${USER}', 'from_name' => 'Бетон Микс', 'to' => 'info@client.example', 'site_host' => 'verhnyaya-pyshma.test', 'brand' => 'Бетон Микс',
  'log_dir' => ${JSON.stringify(path.join(tmp, 'leads'))}, 'captcha_secret' => 's', 'captcha_ttl' => 600, 'smtp_verify_peer' => false, 'debug' => true,
], ${extra});\n`);
writeConfig('[]');

const probe = net.createServer();
await new Promise((r) => probe.listen(0, '127.0.0.1', r));
const phpPort = probe.address().port;
await new Promise((r) => probe.close(r));
const php = spawn('php', ['-S', `127.0.0.1:${phpPort}`, '-t', site], { stdio: 'ignore' });
const base = `http://127.0.0.1:${phpPort}/send.php`;
for (let i = 0; i < 50; i++) { try { await fetch(base); break; } catch { await new Promise((r) => setTimeout(r, 100)); } }

let failed = 0;
let txt2 = '';
const ok = (c, n, e = '') => { console.log(`${c ? '✓' : '✗'} ${n}${c ? '' : `  (${e})`}`); if (!c) failed++; };
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const solve = (q) => { const [a, op, b] = q.split(' '); return op === '+' ? +a + +b : op === '×' ? +a * +b : +a - +b; };
let ipN = 1;
const send = async () => {
  const c = await (await fetch(`${base}?captcha=1`)).json();
  const body = new URLSearchParams({ phone: '+7 (900) 123-45-67', volume: '12', item: 'Бетон М300 (В22,5), П4', address: 'Верхняя Пышма, ул. Тестовая, 1', consent: '1', ts: String(Date.now() - 5000), source: 'home-bottom', ct: c.t, cap: String(solve(c.q)) });
  const r = await fetch(base, { method: 'POST', body, headers: { Accept: 'application/json', 'X-Real-IP': `10.0.0.${ipN++}`, Origin: 'https://verhnyaya-pyshma.test' } });
  return { status: r.status, j: await r.json() };
};
const decode = (m) => {
  const [head, ...rest] = m.split('\r\n\r\n');
  const body = Buffer.from(rest.join('\r\n\r\n'), 'base64').toString('utf8');
  const hv = (n) => { const x = head.match(new RegExp(`^${n}: (.*)$`, 'mi')); return x ? x[1] : ''; };
  const subj = hv('Subject').replace(/=\?UTF-8\?B\?([^?]*)\?=/g, (_, b) => Buffer.from(b, 'base64').toString('utf8'));
  return { from: hv('From'), to: hv('To'), subj, body, ct: hv('Content-Type'), date: hv('Date'), mid: hv('Message-ID') };
};

try {
  // 1. SMTP поверх TLS, как smtp.beget.com:465
  let r = await send();
  await sleep(300);
  ok(r.status === 200 && r.j.ok === true, 'порт 465 (TLS): заявка принята', JSON.stringify(r));
  ok(logins.length === 1 && logins[0][0] === USER && logins[0][1] === PASS, 'сервер получил верные логин и пароль ящика', JSON.stringify(logins));
  ok(mails.length === 1, 'письмо дошло до SMTP-сервера', String(mails.length));
  const m = decode(mails[0] || '');
  ok(m.from.includes(`<${USER}>`), 'отправитель совпадает с ящиком (требование Бегета)', m.from);
  ok(m.to === 'info@client.example', 'получатель из конфига', m.to);
  ok(/Заявка с сайта Бетон Микс: \+7 \(900\) 123-45-67/.test(m.subj), 'тема письма читается (UTF-8)', m.subj);
  ok(/Телефон: \+7 \(900\) 123-45-67/.test(m.body) && /Объём: 12 м³/.test(m.body) && /Адрес доставки: Верхняя Пышма/.test(m.body) && /Форма: home-bottom/.test(m.body), 'в теле телефон, объём, адрес и форма', m.body);
  ok(/charset=UTF-8/i.test(m.ct) && m.date && /@verhnyaya-pyshma\.test>/.test(m.mid), 'заголовки Date, Content-Type и Message-ID есть', `${m.ct} | ${m.date} | ${m.mid}`);
  const log = fs.readFileSync(path.join(tmp, 'leads', fs.readdirSync(path.join(tmp, 'leads')).find((f) => f.startsWith('leads-'))), 'utf8');
  ok(/"mail":"smtp"/.test(log) && !/right-password/.test(log), 'в журнале статус smtp и нет пароля', log);

  // 2. STARTTLS (порт 2525)
  writeConfig(`['smtp_port' => ${startPort}, 'smtp_secure' => 'tls']`);
  const before = mails.length;
  r = await send();
  await sleep(500);
  ok(r.status === 200 && mails.length === before + 1, 'STARTTLS: заявка принята и письмо доставлено', JSON.stringify(r) + ' ' + mails.length);

  // 3. неверный пароль: SMTP отказывает, заявка не теряется, пользователь видит ошибку
  writeConfig(`['smtp_pass' => 'wrong']`);
  const before3 = mails.length;
  r = await send();
  await sleep(300);
  const logs = fs.readdirSync(path.join(tmp, 'leads')).filter((f) => f.startsWith('leads-')).map((f) => fs.readFileSync(path.join(tmp, 'leads', f), 'utf8')).join('');
  ok(r.status === 502 && r.j.ok === false && mails.length === before3, 'неверный пароль: письмо не ушло, ответ 502', JSON.stringify(r));
  ok(/"mail":"failed"/.test(logs) && /535/.test(logs), 'заявка сохранена в журнал со статусом failed и кодом 535', logs.split('\n').slice(-2).join(' | '));

  // 4. проверка сертификата включена (по умолчанию на Бегете): чужой сертификат отклоняется
  writeConfig(`['smtp_verify_peer' => true]`);
  const before4 = mails.length;
  r = await send();
  ok(r.status === 502 && mails.length === before4, 'самоподписанный сертификат при verify_peer=true отклоняется', JSON.stringify(r));

  // 4б. срок хранения: старый журнал удаляется, свежий остаётся
  writeConfig(`['retention_days' => 30, 'purge_every' => 1]`);
  const oldLog = path.join(tmp, 'leads', 'leads-2020-01.log');
  fs.writeFileSync(oldLog, '{}\n'); fs.utimesSync(oldLog, new Date('2020-02-01'), new Date('2020-02-01'));
  r = await send();
  await sleep(300);
  ok(!fs.existsSync(oldLog) && fs.readdirSync(path.join(tmp, 'leads')).some((f) => /^leads-\d{4}-\d{2}\.log$/.test(f) && f !== 'leads-2020-01.log'), 'журнал старше срока хранения удалён, текущий сохранён', fs.readdirSync(path.join(tmp, 'leads')).join(','));

  // 5. самопроверка на сервере: закрыта без ключа, с ключом шлёт тестовое письмо и не показывает пароль
  writeConfig(`['selftest_key' => 'k-123']`);
  let t = await fetch(`${base}?selftest=wrong`);
  ok(t.status === 404, 'самопроверка без верного ключа отвечает 404', String(t.status));
  const before5 = mails.length;
  t = await fetch(`${base}?selftest=k-123`);
  const txt = await t.text();
  await sleep(300);
  ok(t.status === 200 && /РЕЗУЛЬТАТ: письмо принято/.test(txt) && mails.length === before5 + 1, 'самопроверка с ключом отправляет письмо', txt.slice(0, 300));
  ok(!txt.includes(PASS) && /пароль: задан/.test(txt) && /Журнал заявок: .*пишется/.test(txt), 'самопроверка не показывает пароль, но сообщает, что он задан, и пишется ли журнал', txt.slice(0, 400));
  writeConfig(`['selftest_key' => 'k-123', 'smtp_pass' => 'wrong']`);
  txt2 = await (await fetch(`${base}?selftest=k-123`)).text();
  ok(/ОШИБКА SMTP: SMTP 535/.test(txt2), 'самопроверка показывает ошибку входа 535', txt2.slice(0, 300));
} finally {
  php.kill(); sslServer.close(); startServer.close();
}
console.log(failed ? `\nПровалено: ${failed}` : '\nОтправка через TLS и STARTTLS: все проверки пройдены');
process.exit(failed ? 1 : 0);
