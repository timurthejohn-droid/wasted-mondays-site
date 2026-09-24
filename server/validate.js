// Проверка почты и телефона. Те же правила работают в браузере: список стран уходит на страницу
// в <script id="wm-countries">, поэтому сайт и сервер не расходятся.
import dns from 'node:dns/promises';

// Код страны, длина номера без кода, первая цифра (если важна). Порядок = порядок в списке выбора.
export const COUNTRIES = [
  ['ru', 'Россия', '7', [10], '3489'],
  ['kz', 'Казахстан', '7', [10], '67'],
  ['by', 'Беларусь', '375', [9]],
  ['am', 'Армения', '374', [8]],
  ['ge', 'Грузия', '995', [9]],
  ['uz', 'Узбекистан', '998', [9]],
  ['kg', 'Киргизия', '996', [9]],
  ['az', 'Азербайджан', '994', [9]],
  ['tj', 'Таджикистан', '992', [9]],
  ['md', 'Молдова', '373', [8]],
  ['ua', 'Украина', '380', [9]],
  ['tr', 'Турция', '90', [10]],
  ['ae', 'ОАЭ', '971', [9]],
  ['il', 'Израиль', '972', [9]],
  ['rs', 'Сербия', '381', [8, 9]],
  ['cy', 'Кипр', '357', [8]],
  ['th', 'Таиланд', '66', [9]],
  ['id', 'Индонезия', '62', [9, 10, 11, 12]],
  ['cn', 'Китай', '86', [11]],
  ['de', 'Германия', '49', [10, 11]],
  ['gb', 'Великобритания', '44', [10]],
  ['fr', 'Франция', '33', [9]],
  ['es', 'Испания', '34', [9]],
  ['it', 'Италия', '39', [9, 10]],
  ['pl', 'Польша', '48', [9]],
  ['lv', 'Латвия', '371', [8]],
  ['lt', 'Литва', '370', [8]],
  ['ee', 'Эстония', '372', [7, 8]],
  ['fi', 'Финляндия', '358', [9, 10]],
  ['us', 'США и Канада', '1', [10]],
];

// Телефон в формате +79991234567 или null. Понимает "8 999...", "+7 (999) ...", пробелы и скобки.
export function phone(raw) {
  const s = String(raw ?? '').trim();
  let d = s.replace(/\D/g, '');
  if (!s.startsWith('+')) {
    if (d.length === 11 && d[0] === '8') d = '7' + d.slice(1);
    else if (d.length === 10 && d[0] === '9') d = '7' + d;
  }
  if (d.length < 8 || d.length > 15) return null;
  // Известная страна: проверяем длину и первую цифру. +7 общий у России и Казахстана.
  const rules = COUNTRIES.filter(([, , code]) => d.startsWith(code));
  if (rules.length) {
    const ok = rules.some(([, , code, lens, first]) => {
      const n = d.slice(code.length);
      return lens.includes(n.length) && (!first || first.includes(n[0]));
    });
    return ok ? `+${d}` : null;
  }
  return `+${d}`;
}

// Почта: строгий формат, латинский домен с зоной из букв.
export function email(raw) {
  const e = String(raw ?? '').trim().toLowerCase();
  if (e.length > 120) return null;
  const m = e.match(/^([a-z0-9._%+-]{1,64})@((?:[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z]{2,24})$/);
  if (!m || m[1].startsWith('.') || m[1].endsWith('.') || m[1].includes('..')) return null;
  return e;
}

// Опечатка в популярном домене: gmail.cm, yandx.ru. У многих таких доменов есть почтовый сервер
// (их выкупают), поэтому проверка MX их не ловит. Возвращает исправленный адрес или ''.
const MAIL_DOMAINS = ['gmail.com', 'mail.ru', 'yandex.ru', 'ya.ru', 'icloud.com', 'bk.ru', 'inbox.ru', 'list.ru', 'rambler.ru', 'internet.ru', 'outlook.com', 'hotmail.com', 'yahoo.com', 'me.com', 'yandex.com', 'proton.me'];
const lev = (a, b) => { const m = [...Array(b.length + 1).keys()]; for (let i = 1; i <= a.length; i++) { let p = m[0]; m[0] = i; for (let j = 1; j <= b.length; j++) { const t = m[j]; m[j] = Math.min(m[j] + 1, m[j - 1] + 1, p + (a[i - 1] === b[j - 1] ? 0 : 1)); p = t; } } return m[b.length]; };
// Настоящие почтовые домены, похожие на популярные: их не считаем опечаткой.
const MAIL_KNOWN = ['gmx.com', 'gmx.de', 'gmx.net', 'live.com', 'msn.com', 'mac.com', 'aol.com', 'mail.ua', 'ukr.net', 'i.ua', 'tut.by', 'yandex.kz', 'yandex.by', 'yandex.ua', 'mail.kz', 'inbox.lv', 'yahoo.co.uk', 'hotmail.co.uk', 'outlook.de', 'web.de'];
export function emailTypo(addr) {
  const [local, domain] = String(addr).toLowerCase().split('@');
  if (!domain || MAIL_DOMAINS.includes(domain) || MAIL_KNOWN.includes(domain)) return '';
  if (domain === 'gmail.ru') return `${local}@gmail.com`;
  let best = '', d = 3;
  for (const x of MAIL_DOMAINS) { const k = lev(domain, x); if (k < d) { d = k; best = x; } }
  return best && (d <= 2 || domain.replace(/\./g, '') === best.replace(/\./g, '')) ? `${local}@${best}` : '';
}

// Домен почты должен принимать письма (есть MX-запись). Если DNS не ответил вовремя, не блокируем покупателя.
const mxCache = new Map();
export async function emailDomainOk(addr) {
  const domain = String(addr).split('@')[1];
  if (!domain) return false;
  if (mxCache.has(domain)) return mxCache.get(domain);
  let ok = true;
  try {
    const mx = await Promise.race([dns.resolveMx(domain), new Promise((_, rej) => setTimeout(() => rej(new Error('timeout')), 2500))]);
    ok = mx.length > 0;
  } catch (e) {
    ok = !['ENOTFOUND', 'ENODATA', 'ESERVFAIL'].includes(e.code);
  }
  if (mxCache.size > 5000) mxCache.clear();
  mxCache.set(domain, ok);
  return ok;
}
