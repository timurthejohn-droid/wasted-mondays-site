// Wasted Mondays: магазин без Тильды.
// Node 22, без внешних зависимостей. Запуск: node server/index.js
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';
import * as catalog from './catalog.js';
import * as orders from './orders.js';
import * as pages from './pages.js';
import * as auth from './auth.js';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const PUBLIC = path.join(ROOT, 'public');
const PORT = Number(process.env.PORT || 8850);

const MIME = {
  '.html': 'text/html; charset=utf-8', '.css': 'text/css; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8', '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml', '.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg',
  '.webp': 'image/webp', '.woff': 'font/woff', '.woff2': 'font/woff2', '.txt': 'text/plain; charset=utf-8',
  '.ico': 'image/x-icon',
};

function send(res, status, body, type = 'text/html; charset=utf-8', extra = {}) {
  res.writeHead(status, {
    'Content-Type': type, 'X-Robots-Tag': 'noindex, nofollow, noarchive',
    'X-Content-Type-Options': 'nosniff', 'Referrer-Policy': 'strict-origin-when-cross-origin', 'X-Frame-Options': 'SAMEORIGIN',
    ...(type.startsWith('text/html') ? { 'Cache-Control': 'no-store' } : {}),
    ...extra,
  });
  res.end(body);
}
const json = (res, status, data, extra) => send(res, status, JSON.stringify(data), MIME['.json'], extra);
const redirect = (res, to, extra = {}) => send(res, 302, '', 'text/plain', { Location: to, ...extra });
// Разрешаем переходы только внутри сайта, чтобы ?next= нельзя было использовать для редиректа наружу.
const safeNext = (n) => (typeof n === 'string' && /^\/(?!\/)[\w\-/?=&%.]*$/.test(n) ? n : '/account');

function serveStatic(req, res, pathname) {
  const file = path.normalize(path.join(PUBLIC, decodeURIComponent(pathname)));
  if (!file.startsWith(PUBLIC)) return false;
  let stat;
  try { stat = fs.statSync(file); } catch { return false; }
  if (!stat.isFile()) return false;
  const etag = `"${stat.size}-${stat.mtimeMs}"`;
  if (req.headers['if-none-match'] === etag) { res.writeHead(304); res.end(); return true; }
  res.writeHead(200, {
    'Content-Type': MIME[path.extname(file).toLowerCase()] || 'application/octet-stream',
    'Content-Length': stat.size, ETag: etag, 'X-Content-Type-Options': 'nosniff',
    'Cache-Control': pathname.startsWith('/img/') || pathname.startsWith('/fonts/') ? 'public, max-age=604800' : 'no-cache',
  });
  fs.createReadStream(file).pipe(res);
  return true;
}

async function readJson(req, limit = 100_000) {
  // JSON-only защищает от подделки запросов с чужих сайтов: такой запрос браузер без CORS не отправит.
  if (!String(req.headers['content-type'] || '').startsWith('application/json')) throw new Error('bad type');
  let size = 0; const chunks = [];
  for await (const c of req) { size += c.length; if (size > limit) throw new Error('body too large'); chunks.push(c); }
  return JSON.parse(Buffer.concat(chunks).toString('utf8') || '{}');
}

// Не больше N запросов с одного адреса за окно: защищает от рассылки SMS за наш счёт.
const hits = new Map();
function limited(req, key, max, windowMs) {
  // X-Forwarded-For верим только за своим прокси (nginx на сервере), иначе его легко подделать.
  const fwd = process.env.TRUST_PROXY ? req.headers['x-forwarded-for'] : '';
  const ip = String(fwd || req.socket.remoteAddress || '').split(',')[0].trim();
  const k = `${key}:${ip}`, now = Date.now();
  const arr = (hits.get(k) || []).filter((t) => now - t < windowMs);
  arr.push(now); hits.set(k, arr);
  return arr.length > max;
}

async function handle(req, res) {
  const url = new URL(req.url, 'http://localhost');
  const p = url.pathname.replace(/\/+$/, '') || '/';
  const user = auth.currentUser(req);
  const GET = req.method === 'GET', POST = req.method === 'POST';

  // API
  if (p === '/api/products' && GET) return json(res, 200, catalog.publicList());
  if (p === '/api/search' && GET) {
    const q = url.searchParams.get('q') || '';
    return json(res, 200, catalog.search(q).slice(0, 6).map((x) => ({ id: x.id, title: x.title, price: x.price, image: x.images[0], category: x.category })));
  }
  if (p === '/api/orders' && POST) {
    if (limited(req, 'order', 20, 3_600_000)) return json(res, 429, { error: 'Слишком много попыток, попробуйте позже' });
    let data;
    try { data = await readJson(req); } catch { return json(res, 400, { error: 'Некорректный запрос' }); }
    const result = orders.create(data, user);
    return json(res, result.error ? 422 : 201, result);
  }
  if (p === '/api/auth/code' && POST) {
    if (limited(req, 'code', 8, 3_600_000)) return json(res, 429, { error: 'Слишком много запросов кода, попробуйте через час' });
    let d; try { d = await readJson(req); } catch { return json(res, 400, { error: 'Некорректный запрос' }); }
    if (d.consent !== true) return json(res, 422, { error: 'Нужно согласие на обработку персональных данных' });
    const r = await auth.requestCode(d.channel, d.to);
    return json(res, r.error ? 422 : 200, r);
  }
  if (p === '/api/auth/verify' && POST) {
    if (limited(req, 'verify', 30, 3_600_000)) return json(res, 429, { error: 'Слишком много попыток, попробуйте позже' });
    let d; try { d = await readJson(req); } catch { return json(res, 400, { error: 'Некорректный запрос' }); }
    const r = auth.verifyCode(d.channel, d.to, d.code);
    if (r.error) return json(res, 422, r);
    if (Array.isArray(d.favs)) auth.setFavs(r.user, [...(r.user.favs || []), ...d.favs]);
    return json(res, 200, { ok: true, next: safeNext(d.next) }, { 'Set-Cookie': auth.createSession(r.user) });
  }
  if (p === '/api/auth/logout' && POST) return json(res, 200, { ok: true }, { 'Set-Cookie': auth.logout(req) });
  if (p === '/api/account' && GET) return json(res, 200, { user: auth.publicUser(user) });
  if (p === '/api/account/profile' && POST) {
    if (!user) return json(res, 401, { error: 'Нужно войти' });
    let d; try { d = await readJson(req); } catch { return json(res, 400, { error: 'Некорректный запрос' }); }
    const r = auth.updateProfile(user, d);
    return json(res, r.error ? 422 : 200, r);
  }
  if (p === '/api/account/favs' && POST) {
    if (!user) return json(res, 401, { error: 'Нужно войти' });
    let d; try { d = await readJson(req); } catch { return json(res, 400, { error: 'Некорректный запрос' }); }
    return json(res, 200, { favs: auth.setFavs(user, d.favs) });
  }

  // Вход через Яндекс ID
  if (p === '/auth/yandex' && GET) {
    if (!auth.yandexReady()) return redirect(res, '/account');
    const { url: to, cookie } = auth.yandexStart();
    const next = safeNext(url.searchParams.get('next'));
    return redirect(res, to, { 'Set-Cookie': [cookie, `wm_next=${encodeURIComponent(next)}; Path=/auth; HttpOnly; SameSite=Lax; Max-Age=600`] });
  }
  if (p === '/auth/yandex/callback' && GET) {
    const r = await auth.yandexCallback(req, url.searchParams).catch(() => ({ error: 'Не удалось войти через Яндекс' }));
    if (r.error) return send(res, 200, pages.login(auth.authInfo(), { error: r.error }));
    return redirect(res, safeNext(auth.parseCookies(req).wm_next), { 'Set-Cookie': auth.createSession(r.user) });
  }

  // Старые ссылки Тильды на товары: /catalog/tproduct/896537896682-wasted-appliqu-hoodie
  const legacy = p.match(/^\/catalog\/tproduct\/(\d+)/);
  if (legacy) {
    const prod = catalog.byTildaUid(legacy[1]);
    if (prod) return send(res, 301, '', 'text/plain', { Location: `/product/${prod.id}` });
  }

  const prod = p.match(/^\/product\/([a-z0-9-]+)$/);
  if (prod) {
    const item = catalog.byId(prod[1]);
    return item ? send(res, 200, pages.product(item, user)) : send(res, 404, pages.notFound(user));
  }

  const order = p.match(/^\/order\/([A-Z0-9-]+)$/);
  if (order) {
    const o = orders.get(order[1]);
    return o ? send(res, 200, pages.orderDone(o, user)) : send(res, 404, pages.notFound(user));
  }

  if (p === '/account' && GET) {
    if (!user) return send(res, 200, pages.login(auth.authInfo(), { next: safeNext(url.searchParams.get('next')) }));
    const tab = ['orders', 'profile', 'favs'].includes(url.searchParams.get('tab')) ? url.searchParams.get('tab') : 'orders';
    return send(res, 200, pages.account(user, orders.forUser(user), tab));
  }

  const routes = {
    '/': () => pages.home(user),
    '/catalog': () => pages.catalogPage(user),
    '/cart': () => pages.cart(user),
    '/search': () => { const q = (url.searchParams.get('q') || '').slice(0, 100); return pages.searchPage(q, q ? catalog.search(q) : [], user); },
    '/delivery': () => pages.info('delivery', 'Доставка', user),
    '/return': () => pages.info('return', 'Возврат товара', user),
    '/contacts': () => pages.info('contacts', 'Контакты', user),
    '/offer': () => pages.info('offer', 'Публичная оферта', user),
    '/policy': () => pages.info('policy', 'Политика конфиденциальности', user),
  };
  if (routes[p] && GET) return send(res, 200, routes[p]());

  if (GET && serveStatic(req, res, url.pathname)) return;
  send(res, 404, pages.notFound(user));
}

http.createServer((req, res) => {
  handle(req, res).catch((err) => {
    const id = crypto.randomBytes(4).toString('hex');
    console.error(`[${id}]`, err);
    if (!res.headersSent) send(res, 500, `Ошибка сервера (${id})`, 'text/plain; charset=utf-8');
  });
}).listen(PORT, () => console.log(`Wasted Mondays: http://localhost:${PORT}`));
