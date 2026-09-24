// Личный кабинет: вход по одноразовому коду (почта или телефон) и через Яндекс ID.
// Паролей нет, значит, нечего утечь. Пользователи и сессии лежат в data/users.json.
//
// Яндекс ID: приложение регистрируется на https://oauth.yandex.ru, доступы
// "Доступ к адресу электронной почты", "Доступ к номеру телефона", "Доступ к имени".
//   YANDEX_CLIENT_ID, YANDEX_CLIENT_SECRET, SITE_URL (например https://wastedmondays.ru)
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { sendCode, testMode, channelAvailable } from './notify.js';
import * as validate from './validate.js';

const FILE = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../data/users.json');
const PROD = process.env.NODE_ENV === 'production';
const SESSION_DAYS = 60;
const CODE_TTL_MS = 10 * 60_000;
const CODE_RESEND_MS = 60_000;
const CODE_MAX_TRIES = 5;
export const COOKIE = 'wm_sid';

let db = load();
function load() {
  try { return JSON.parse(fs.readFileSync(FILE, 'utf8')); } catch { return { users: [], sessions: [] }; }
}
function save() {
  const tmp = FILE + '.tmp';
  fs.writeFileSync(tmp, JSON.stringify(db, null, 2));
  fs.renameSync(tmp, FILE);
}

// Коды держим только в памяти: после перезапуска просто запрашивается новый.
const codes = new Map(); // key -> { hash, expires, tries, sentAt }
const sha = (s) => crypto.createHash('sha256').update(s).digest('hex');

export function normalize(channel, raw) {
  const v = String(raw ?? '').trim();
  if (channel === 'email') return validate.email(v);
  if (channel === 'sms') return validate.phone(v);
  return null;
}

export async function requestCode(channel, raw) {
  if (!['email', 'sms'].includes(channel)) return { error: 'Неизвестный способ входа' };
  if (!channelAvailable(channel)) return { error: channel === 'sms' ? 'Вход по телефону пока не подключён' : 'Вход по почте пока не подключён' };
  const to = normalize(channel, raw);
  if (!to) return { error: channel === 'email' ? 'Проверьте адрес почты' : 'Проверьте номер телефона' };
  const key = `${channel}:${to}`;
  const prev = codes.get(key);
  if (prev && Date.now() - prev.sentAt < CODE_RESEND_MS) {
    return { error: `Новый код можно запросить через ${Math.ceil((CODE_RESEND_MS - (Date.now() - prev.sentAt)) / 1000)} с` };
  }
  const code = String(crypto.randomInt(0, 1_000_000)).padStart(6, '0');
  codes.set(key, { hash: sha(code), expires: Date.now() + CODE_TTL_MS, tries: 0, sentAt: Date.now() });
  try {
    const r = await sendCode(channel, to, code);
    return { ok: true, to, ...(r.test ? { testCode: code } : {}) };
  } catch (e) {
    codes.delete(key);
    console.error('Отправка кода:', e.message);
    return { error: 'Не удалось отправить код, попробуйте позже' };
  }
}

export function verifyCode(channel, raw, code) {
  const to = normalize(channel, raw);
  const key = `${channel}:${to}`;
  const rec = to && codes.get(key);
  if (!rec || rec.expires < Date.now()) return { error: 'Код устарел, запросите новый' };
  rec.tries++;
  if (rec.tries > CODE_MAX_TRIES) { codes.delete(key); return { error: 'Слишком много попыток, запросите новый код' }; }
  const a = Buffer.from(sha(String(code ?? '').trim())), b = Buffer.from(rec.hash);
  if (!crypto.timingSafeEqual(a, b)) return { error: `Неверный код, осталось попыток: ${CODE_MAX_TRIES - rec.tries}` };
  codes.delete(key);
  const field = channel === 'email' ? 'email' : 'phone';
  const user = findOrCreate({ [field]: to }, (u) => u[field] === to);
  return { user };
}

function findOrCreate(fields, match) {
  let u = db.users.find(match);
  if (!u) {
    u = { id: crypto.randomUUID(), name: '', email: '', phone: '', yandexId: null, favs: [], createdAt: new Date().toISOString() };
    db.users.push(u);
  }
  for (const [k, v] of Object.entries(fields)) if (v && !u[k]) u[k] = v;
  save();
  return u;
}

// Сессии: в cookie лежит случайный токен, на сервере хранится только его хэш.
export function createSession(user) {
  const token = crypto.randomBytes(32).toString('base64url');
  db.sessions = db.sessions.filter((s) => s.expires > Date.now());
  db.sessions.push({ hash: sha(token), userId: user.id, expires: Date.now() + SESSION_DAYS * 86_400_000 });
  save();
  return sessionCookie(token, SESSION_DAYS * 86_400);
}
export function sessionCookie(value, maxAge) {
  return `${COOKIE}=${value}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${maxAge}${PROD ? '; Secure' : ''}`;
}

export function parseCookies(req) {
  const out = {};
  for (const part of (req.headers.cookie || '').split(';')) {
    const i = part.indexOf('=');
    if (i > 0) out[part.slice(0, i).trim()] = decodeURIComponent(part.slice(i + 1).trim());
  }
  return out;
}

export function currentUser(req) {
  const token = parseCookies(req)[COOKIE];
  if (!token) return null;
  const s = db.sessions.find((x) => x.hash === sha(token) && x.expires > Date.now());
  return s ? db.users.find((u) => u.id === s.userId) || null : null;
}

export function logout(req) {
  const token = parseCookies(req)[COOKIE];
  if (token) { db.sessions = db.sessions.filter((s) => s.hash !== sha(token)); save(); }
  return sessionCookie('', 0);
}

// email и phone у пользователя всегда подтверждены кодом или Яндексом, по ним идёт вход.
// То, что человек вписал в профиль сам, лежит в contact и для входа не используется,
// иначе можно было бы заранее вписать чужую почту и получить доступ к чужим заказам.
export function updateProfile(user, input) {
  user.name = String(input?.name ?? '').trim().slice(0, 80);
  user.contact ??= {};
  if (input?.email !== undefined) {
    const e = normalize('email', input.email);
    if (input.email && !e) return { error: 'Проверьте адрес почты' };
    user.contact.email = e || '';
  }
  if (input?.phone !== undefined) {
    const p = normalize('sms', input.phone);
    if (input.phone && !p) return { error: 'Проверьте номер телефона' };
    user.contact.phone = p || '';
  }
  if (input?.address !== undefined) user.contact.address = String(input.address).trim().slice(0, 300);
  save();
  return { ok: true };
}

export const publicUser = (u) => u && ({
  name: u.name, email: u.email || u.contact?.email || '', phone: u.phone || u.contact?.phone || '',
  address: u.contact?.address || '', verifiedEmail: u.email, verifiedPhone: u.phone, yandex: Boolean(u.yandexId), favs: u.favs || [],
});

export function setFavs(user, favs) {
  user.favs = [...new Set((Array.isArray(favs) ? favs : []).map(String))].slice(0, 200);
  save();
  return user.favs;
}

// Яндекс ID
export const yandexReady = () => Boolean(process.env.YANDEX_CLIENT_ID && process.env.YANDEX_CLIENT_SECRET);
const redirectUri = () => `${process.env.SITE_URL || 'http://localhost:8850'}/auth/yandex/callback`;

export function yandexStart() {
  const state = crypto.randomBytes(16).toString('hex');
  const url = new URL('https://oauth.yandex.ru/authorize');
  url.search = new URLSearchParams({ response_type: 'code', client_id: process.env.YANDEX_CLIENT_ID, redirect_uri: redirectUri(), state });
  return { url: url.toString(), cookie: `wm_oauth=${state}; Path=/auth; HttpOnly; SameSite=Lax; Max-Age=600${PROD ? '; Secure' : ''}` };
}

export async function yandexCallback(req, params) {
  if (!params.get('state') || params.get('state') !== parseCookies(req).wm_oauth) return { error: 'Сессия входа устарела, попробуйте ещё раз' };
  if (params.get('error')) return { error: 'Вход через Яндекс отменён' };
  const tr = await fetch('https://oauth.yandex.ru/token', {
    method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({ grant_type: 'authorization_code', code: params.get('code') || '', client_id: process.env.YANDEX_CLIENT_ID, client_secret: process.env.YANDEX_CLIENT_SECRET }),
  });
  const tok = await tr.json();
  if (!tok.access_token) return { error: 'Яндекс не подтвердил вход' };
  const ir = await fetch('https://login.yandex.ru/info?format=json', { headers: { Authorization: `OAuth ${tok.access_token}` } });
  const info = await ir.json();
  if (!info.id) return { error: 'Не удалось получить данные из Яндекса' };
  const email = normalize('email', info.default_email);
  const phone = normalize('sms', info.default_phone?.number);
  const user = findOrCreate(
    { yandexId: String(info.id), email, phone, name: info.real_name || info.display_name || '' },
    (u) => u.yandexId === String(info.id) || (email && u.email === email) || (phone && u.phone === phone),
  );
  return { user };
}

export const authInfo = () => ({ emailTest: testMode('email'), smsTest: testMode('sms'), sms: channelAvailable('sms'), email: channelAvailable('email'), yandex: yandexReady() });
