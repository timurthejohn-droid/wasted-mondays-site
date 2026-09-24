// Отправка кодов входа по почте и SMS.
//
// Пока сервисы не подключены, сайт работает в тестовом режиме: код пишется в лог сервера
// и показывается на странице входа. В боевом режиме (NODE_ENV=production) без настроенного
// сервиса отправка отключена, код нигде не показывается.
//
// Почта: SMTP любого сервиса (Яндекс 360, Unisender Go, Mail.ru для бизнеса).
//   SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS, MAIL_FROM
// SMS: SMS.ru, ключ из личного кабинета.
//   SMSRU_API_ID
import net from 'node:net';
import tls from 'node:tls';

const PROD = process.env.NODE_ENV === 'production';

export const emailReady = () => Boolean(process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASS);
export const smsReady = () => Boolean(process.env.SMSRU_API_ID);
export const testMode = (channel) => !PROD && !(channel === 'email' ? emailReady() : smsReady());
export const channelAvailable = (channel) => testMode(channel) || (channel === 'email' ? emailReady() : smsReady());

export async function sendCode(channel, to, code) {
  if (testMode(channel)) {
    console.log(`[вход, тестовый режим] ${channel} ${to}: код ${code}`);
    return { test: true };
  }
  const text = `Код для входа на wastedmondays.ru: ${code}. Никому его не сообщайте.`;
  if (channel === 'sms') return sendSms(to, text);
  return sendMail(to, 'Код для входа в Wasted Mondays', text);
}

async function sendSms(phone, text) {
  const url = new URL('https://sms.ru/sms/send');
  url.search = new URLSearchParams({ api_id: process.env.SMSRU_API_ID, to: phone.replace(/\D/g, ''), msg: text, json: '1' });
  const r = await fetch(url);
  const d = await r.json();
  if (d.status !== 'OK') throw new Error(`SMS не отправлено: ${d.status_text || d.status}`);
  return { test: false };
}

// Минимальный SMTP-клиент (implicit TLS на 465 порту), чтобы не тянуть зависимости.
function sendMail(to, subject, text) {
  const host = process.env.SMTP_HOST, port = Number(process.env.SMTP_PORT || 465);
  const user = process.env.SMTP_USER, pass = process.env.SMTP_PASS, from = process.env.MAIL_FROM || user;
  const b64 = (s) => Buffer.from(s, 'utf8').toString('base64');
  const msg = [
    `From: Wasted Mondays <${from}>`, `To: <${to}>`, `Subject: =?UTF-8?B?${b64(subject)}?=`,
    'MIME-Version: 1.0', 'Content-Type: text/plain; charset=utf-8', 'Content-Transfer-Encoding: base64', '', b64(text),
  ].join('\r\n');
  const steps = [
    null, `EHLO wastedmondays.ru`, 'AUTH LOGIN', b64(user), b64(pass),
    `MAIL FROM:<${from}>`, `RCPT TO:<${to}>`, 'DATA', `${msg}\r\n.`, 'QUIT',
  ];
  return new Promise((resolve, reject) => {
    const sock = port === 465 ? tls.connect(port, host, { servername: host }) : net.connect(port, host);
    let i = 0, buf = '';
    const timer = setTimeout(() => { sock.destroy(); reject(new Error('SMTP: таймаут')); }, 15000);
    sock.setEncoding('utf8');
    sock.on('data', (chunk) => {
      buf += chunk;
      if (!/\r?\n$/.test(buf) || /^\d{3}-/m.test(buf.split(/\r?\n/).filter(Boolean).pop())) return;
      const code = Number(buf.slice(0, 3)); buf = '';
      if (code >= 400) { clearTimeout(timer); sock.destroy(); return reject(new Error(`SMTP ${code}`)); }
      i++;
      if (i >= steps.length) { clearTimeout(timer); sock.end(); return resolve({ test: false }); }
      sock.write(steps[i] + '\r\n');
    });
    sock.on('error', (e) => { clearTimeout(timer); reject(e); });
  });
}
