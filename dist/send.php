<?php
// Приём заявок с сайта. Письмо уходит через SMTP Бегета, при сбое SMTP пробуем mail().
// Каждая заявка дублируется в журнал на сервере, чтобы не потеряться при проблемах с почтой.
declare(strict_types=1);

mb_internal_encoding('UTF-8');
date_default_timezone_set('Europe/Moscow');

$wantsJson = stripos($_SERVER['HTTP_ACCEPT'] ?? '', 'application/json') !== false;

function respond(bool $ok, string $error, int $status, bool $json): void
{
    if ($json) {
        http_response_code($status);
        header('Content-Type: application/json; charset=utf-8');
        header('Cache-Control: no-store');
        echo json_encode(['ok' => $ok, 'error' => $error], JSON_UNESCAPED_UNICODE);
    } else {
        header('Cache-Control: no-store');
        if ($ok) {
            header('Location: /spasibo/', true, 303);
        } else {
            header('Content-Type: text/html; charset=utf-8', true, $status);
            $why = strpos($error, 'captcha') === 0
                ? 'Проверочный пример решается на странице с включённым JavaScript. Включите его и отправьте форму снова либо позвоните нам.'
                : 'Не удалось отправить заявку. Позвоните нам.';
            echo '<!doctype html><meta charset="utf-8"><meta name="robots" content="noindex"><title>Заявка не отправлена</title>'
               . '<p>' . $why . ' <a href="/">Вернуться на сайт</a></p>';
        }
    }
    exit;
}

// ---- конфиг ----
$cfg = null;
foreach ([__DIR__ . '/../send.config.php', __DIR__ . '/send.config.php'] as $path) {
    if (is_file($path)) { $cfg = require $path; break; }
}
if (!is_array($cfg) || empty($cfg['to'])) {
    error_log('send.php: нет send.config.php или не задан to');
    respond(false, 'config', 500, $wantsJson || isset($_GET['captcha']));
}
$cfg += ['smtp_host' => '', 'smtp_port' => 465, 'smtp_secure' => 'ssl', 'smtp_user' => '', 'smtp_pass' => '', 'from' => '', 'from_name' => 'Сайт',
         'site_host' => '', 'brand' => 'Сайт', 'log_dir' => null, 'debug' => false, 'smtp_verify_peer' => true,
         'captcha_secret' => '', 'captcha_ttl' => 3600];

// ---- арифметическая капча ----
// Токен: «срок.метка.подпись». Пример восстанавливается из метки и секрета, ответа в токене нет.
// Подпись не даёт подделать метку, метка живёт один раз (повторная отправка с тем же токеном отклоняется).
function cap_secret(array $cfg): string
{
    return $cfg['captcha_secret'] !== '' ? (string)$cfg['captcha_secret']
        : hash('sha256', 'cap|' . $cfg['smtp_pass'] . '|' . $cfg['site_host'] . '|' . $cfg['from']);
}

function cap_example(string $nonce, string $secret): array
{
    $b = hash_hmac('sha256', 'q|' . $nonce, $secret, true);
    $op = ord($b[0]) % 3;
    if ($op === 0) {            // сложение: 3..19 + 2..9
        $x = 3 + ord($b[1]) % 17; $y = 2 + ord($b[2]) % 8;
        return [$x . ' + ' . $y, $x + $y];
    }
    if ($op === 1) {            // вычитание: результат от 2 до 17
        $x = 8 + ord($b[1]) % 13; $y = 2 + ord($b[2]) % ($x - 3);
        return [$x . ' − ' . $y, $x - $y];
    }
    $x = 2 + ord($b[1]) % 8; $y = 2 + ord($b[2]) % 8;
    return [$x . ' × ' . $y, $x * $y];
}

function cap_issue(array $cfg): array
{
    $nonce = bin2hex(random_bytes(8));
    $exp = time() + (int)$cfg['captcha_ttl'];
    $secret = cap_secret($cfg);
    [$q] = cap_example($nonce, $secret);
    $sig = hash_hmac('sha256', 't|' . $exp . '|' . $nonce, $secret);
    return ['q' => $q, 't' => $exp . '.' . $nonce . '.' . $sig];
}

// Возвращает '' при успехе или код ошибки: captcha_missing, captcha_expired, captcha_bad.
function cap_check(array $cfg, string $logDir, string $token, string $answer): string
{
    $parts = explode('.', $token);
    if (count($parts) !== 3 || trim($answer) === '') return 'captcha_missing';
    [$exp, $nonce, $sig] = $parts;
    if (!ctype_digit($exp) || !preg_match('/^[0-9a-f]{16}$/', $nonce)) return 'captcha_bad';
    $secret = cap_secret($cfg);
    if (!hash_equals(hash_hmac('sha256', 't|' . $exp . '|' . $nonce, $secret), $sig)) return 'captcha_bad';
    if ((int)$exp < time()) return 'captcha_expired';

    // метка расходуется при первой же попытке, чтобы перебором ответов её не угадать
    $file = $logDir . '/cap-used.json';
    $fp = @fopen($file, 'c+');
    if (!$fp) return 'captcha_bad';
    flock($fp, LOCK_EX);
    $raw = stream_get_contents($fp);
    $used = $raw !== '' && $raw !== false ? (json_decode($raw, true) ?: []) : [];
    $now = time();
    foreach ($used as $n => $e) if ((int)$e < $now) unset($used[$n]);
    $seen = isset($used[$nonce]);
    $used[$nonce] = (int)$exp;
    ftruncate($fp, 0); rewind($fp); fwrite($fp, json_encode($used));
    flock($fp, LOCK_UN); fclose($fp);
    if ($seen) return 'captcha_bad';

    $ans = trim(str_replace(['−', '–'], '-', $answer));
    if (!preg_match('/^-?\d{1,3}$/', $ans)) return 'captcha_bad';
    [, $want] = cap_example($nonce, $secret);
    return (int)$ans === $want ? '' : 'captcha_bad';
}

$logDir = $cfg['log_dir'] ?: (dirname(__DIR__) . '/leads');
if (!is_dir($logDir) && !@mkdir($logDir, 0750, true) && !is_dir($logDir)) {
    $logDir = __DIR__ . '/.leads';
    @mkdir($logDir, 0750, true);
    @file_put_contents($logDir . '/.htaccess', "Require all denied\nDeny from all\n");
}

$method = $_SERVER['REQUEST_METHOD'] ?? '';
if ($method === 'GET' && isset($_GET['captcha'])) {
    header('Content-Type: application/json; charset=utf-8');
    header('Cache-Control: no-store');
    echo json_encode(cap_issue($cfg), JSON_UNESCAPED_UNICODE);
    exit;
}
if ($method !== 'POST') {
    header('Allow: GET, POST');
    respond(false, 'method', 405, $wantsJson);
}


// ---- защита от ботов ----
$host = $cfg['site_host'];
foreach (['HTTP_ORIGIN', 'HTTP_REFERER'] as $h) {
    if (!empty($_SERVER[$h]) && $host !== '') {
        $got = parse_url($_SERVER[$h], PHP_URL_HOST);
        if ($got && strcasecmp(preg_replace('/^www\./i', '', $got), preg_replace('/^www\./i', '', $host)) !== 0) {
            respond(false, 'origin', 403, $wantsJson);
        }
    }
}
if (trim((string)($_POST['website'] ?? '')) !== '') {
    respond(true, '', 200, $wantsJson); // ловушка: делаем вид, что приняли
}
$ts = (int)($_POST['ts'] ?? 0);
if ($ts > 0 && (time() - intdiv($ts, 1000)) < 2) {
    respond(false, 'too_fast', 429, $wantsJson);
}
$capError = cap_check($cfg, $logDir, (string)($_POST['ct'] ?? ''), (string)($_POST['cap'] ?? ''));
if ($capError !== '') {
    respond(false, $capError, 422, $wantsJson);
}

$ip = $_SERVER['HTTP_X_REAL_IP'] ?? $_SERVER['HTTP_X_FORWARDED_FOR'] ?? $_SERVER['REMOTE_ADDR'] ?? '0.0.0.0';
$ip = trim(explode(',', (string)$ip)[0]);
$rateFile = $logDir . '/rate-' . md5($ip) . '.json';
$now = time();
$hits = is_file($rateFile) ? (json_decode((string)file_get_contents($rateFile), true) ?: []) : [];
$hits = array_values(array_filter($hits, fn($t) => $now - (int)$t < 86400));
$last10 = count(array_filter($hits, fn($t) => $now - (int)$t < 600));
if ($last10 >= 5 || count($hits) >= 20) {
    respond(false, 'rate', 429, $wantsJson);
}

// ---- поля ----
$clean = function (string $key, int $max): string {
    $v = (string)($_POST[$key] ?? '');
    $v = preg_replace('/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/u', '', $v) ?? '';
    return mb_substr(trim($v), 0, $max);
};
$phone   = $clean('phone', 20);
$volume  = $clean('volume', 24);
$item    = $clean('item', 120);
$address = $clean('address', 200);
$source  = $clean('source', 60);
$consent = ($_POST['consent'] ?? '') === '1';

$digits = preg_replace('/\D/', '', $phone) ?? '';
if (strlen($digits) < 10 || strlen($digits) > 12 || !$consent) {
    respond(false, 'validation', 422, $wantsJson);
}

$hits[] = $now;
@file_put_contents($rateFile, json_encode($hits), LOCK_EX);

// ---- письмо ----
$brand = $cfg['brand'];
$subject = "Заявка с сайта {$brand}: {$phone}";
$lines = [
    "Новая заявка с сайта {$brand}",
    '',
    "Телефон: {$phone}",
    'Объём: ' . ($volume !== '' ? (preg_match('/^[\d.,\s]+$/u', $volume) ? "{$volume} м³" : $volume) : 'не указан'),
    'Что заказать: ' . ($item !== '' ? $item : 'не указано'),
    'Адрес доставки: ' . ($address !== '' ? $address : 'не указан'),
    '',
    "Форма: {$source}",
    'Время: ' . date('d.m.Y H:i:s') . ' (МСК)',
    "IP: {$ip}",
    'Согласие на обработку данных: получено',
];
$body = implode("\r\n", $lines);

function enc_header(string $s): string
{
    $s = preg_replace('/[\r\n]+/', ' ', $s) ?? '';
    return '=?UTF-8?B?' . base64_encode($s) . '?=';
}

function build_message(array $cfg, string $to, string $subject, string $body): string
{
    $fromAddr = preg_replace('/[\r\n<>]+/', '', $cfg['from']);
    $h = [
        'Date: ' . date('r'),
        'From: ' . enc_header($cfg['from_name']) . " <{$fromAddr}>",
        'To: ' . preg_replace('/[\r\n]+/', '', $to),
        'Subject: ' . enc_header($subject),
        'Message-ID: <' . bin2hex(random_bytes(12)) . '@' . ($cfg['site_host'] ?: 'localhost') . '>',
        'MIME-Version: 1.0',
        'Content-Type: text/plain; charset=UTF-8',
        'Content-Transfer-Encoding: base64',
        'X-Mailer: site-lead-form',
    ];
    return implode("\r\n", $h) . "\r\n\r\n" . chunk_split(base64_encode($body), 76, "\r\n");
}

function smtp_read($fp, array &$trace): array
{
    $code = 0; $text = '';
    while (($line = fgets($fp, 1024)) !== false) {
        $text .= $line;
        $code = (int)substr($line, 0, 3);
        if (isset($line[3]) && $line[3] === ' ') break;
        if (!isset($line[3])) break;
    }
    $trace[] = 'S: ' . trim($text);
    return [$code, $text];
}

function smtp_cmd($fp, string $cmd, array $expect, array &$trace, bool $mask = false): string
{
    fwrite($fp, $cmd . "\r\n");
    $trace[] = 'C: ' . ($mask ? '***' : $cmd);
    [$code, $text] = smtp_read($fp, $trace);
    if (!in_array($code, $expect, true)) {
        throw new RuntimeException("SMTP {$code}: " . trim($text));
    }
    return $text;
}

function smtp_send(array $cfg, array $recipients, string $subject, string $body, array &$trace): void
{
    $secure = $cfg['smtp_secure'];
    $remote = ($secure === 'ssl' ? 'ssl://' : 'tcp://') . $cfg['smtp_host'] . ':' . (int)$cfg['smtp_port'];
    $ctx = stream_context_create(['ssl' => [
        'verify_peer' => (bool)$cfg['smtp_verify_peer'], 'verify_peer_name' => (bool)$cfg['smtp_verify_peer'],
        'peer_name' => $cfg['smtp_host'],
    ]]);
    $fp = @stream_socket_client($remote, $errno, $errstr, 15, STREAM_CLIENT_CONNECT, $ctx);
    if (!$fp) throw new RuntimeException("SMTP connect: {$errstr} ({$errno})");
    stream_set_timeout($fp, 20);
    try {
        smtp_read($fp, $trace);
        $name = $cfg['site_host'] ?: 'localhost';
        smtp_cmd($fp, "EHLO {$name}", [250], $trace);
        if ($secure === 'tls') {
            smtp_cmd($fp, 'STARTTLS', [220], $trace);
            if (!stream_socket_enable_crypto($fp, true, STREAM_CRYPTO_METHOD_TLS_CLIENT)) throw new RuntimeException('STARTTLS failed');
            smtp_cmd($fp, "EHLO {$name}", [250], $trace);
        }
        if ($cfg['smtp_user'] !== '') {
            smtp_cmd($fp, 'AUTH LOGIN', [334], $trace);
            smtp_cmd($fp, base64_encode($cfg['smtp_user']), [334], $trace, true);
            smtp_cmd($fp, base64_encode($cfg['smtp_pass']), [235], $trace, true);
        }
        $from = preg_replace('/[\r\n<>]+/', '', $cfg['from']);
        smtp_cmd($fp, "MAIL FROM:<{$from}>", [250], $trace);
        foreach ($recipients as $r) smtp_cmd($fp, "RCPT TO:<{$r}>", [250, 251], $trace);
        smtp_cmd($fp, 'DATA', [354], $trace);
        $msg = build_message($cfg, implode(', ', $recipients), $subject, $body);
        $msg = preg_replace('/^\./m', '..', $msg);
        fwrite($fp, $msg . "\r\n.\r\n");
        [$code, $text] = smtp_read($fp, $trace);
        if ($code !== 250) throw new RuntimeException("SMTP {$code}: " . trim($text));
        smtp_cmd($fp, 'QUIT', [221, 250], $trace);
    } finally {
        fclose($fp);
    }
}

$recipients = array_values(array_filter(array_map('trim', explode(',', (string)$cfg['to'])), fn($a) => filter_var($a, FILTER_VALIDATE_EMAIL)));
$status = 'failed';
$trace = [];
if ($recipients) {
    if ($cfg['smtp_host'] !== '') {
        try {
            smtp_send($cfg, $recipients, $subject, $body, $trace);
            $status = 'smtp';
        } catch (Throwable $e) {
            error_log('send.php smtp: ' . $e->getMessage());
            $trace[] = 'ERR: ' . $e->getMessage();
        }
    }
    if ($status === 'failed') {
        $from = preg_replace('/[\r\n<>]+/', '', $cfg['from']);
        $hdr = "From: " . enc_header($cfg['from_name']) . " <{$from}>\r\nMIME-Version: 1.0\r\nContent-Type: text/plain; charset=UTF-8\r\nContent-Transfer-Encoding: base64";
        if (@mail(implode(', ', $recipients), enc_header($subject), chunk_split(base64_encode($body)), $hdr, $from !== '' ? "-f{$from}" : '')) {
            $status = 'mail';
        }
    }
}

// ---- журнал ----
$entry = ['t' => date('c'), 'ip' => $ip, 'phone' => $phone, 'volume' => $volume, 'item' => $item, 'address' => $address, 'source' => $source, 'mail' => $status];
if ($cfg['debug']) $entry['trace'] = $trace;
@file_put_contents($logDir . '/leads-' . date('Y-m') . '.log', json_encode($entry, JSON_UNESCAPED_UNICODE) . "\n", FILE_APPEND | LOCK_EX);

if ($status === 'failed') {
    respond(false, 'mail', 502, $wantsJson);
}
respond(true, '', 200, $wantsJson);
