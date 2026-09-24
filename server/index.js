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
  res.writeHead(status, { 'Content-Type': type, 'X-Robots-Tag': 'noindex, nofollow, noarchive', ...extra });
  res.end(body);
}
const json = (res, status, data) => send(res, status, JSON.stringify(data), MIME['.json']);

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
    'Content-Length': stat.size, ETag: etag,
    'Cache-Control': pathname.startsWith('/img/') || pathname.startsWith('/fonts/') ? 'public, max-age=604800' : 'no-cache',
  });
  fs.createReadStream(file).pipe(res);
  return true;
}

async function readBody(req, limit = 100_000) {
  let size = 0; const chunks = [];
  for await (const c of req) { size += c.length; if (size > limit) throw new Error('body too large'); chunks.push(c); }
  return Buffer.concat(chunks).toString('utf8');
}

async function handle(req, res) {
  const url = new URL(req.url, 'http://localhost');
  const p = url.pathname.replace(/\/+$/, '') || '/';

  // API
  if (p === '/api/products' && req.method === 'GET') return json(res, 200, catalog.publicList());
  if (p === '/api/orders' && req.method === 'POST') {
    let data;
    try { data = JSON.parse(await readBody(req)); } catch { return json(res, 400, { error: 'Некорректный запрос' }); }
    const result = orders.create(data);
    return json(res, result.error ? 422 : 201, result);
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
    return item ? send(res, 200, pages.product(item)) : send(res, 404, pages.notFound());
  }

  const order = p.match(/^\/order\/([A-Z0-9-]+)$/);
  if (order) {
    const o = orders.get(order[1]);
    return o ? send(res, 200, pages.orderDone(o)) : send(res, 404, pages.notFound());
  }

  const routes = {
    '/': () => pages.home(),
    '/catalog': () => pages.catalogPage(),
    '/cart': () => pages.cart(),
    '/delivery': () => pages.info('delivery', 'Доставка'),
    '/return': () => pages.info('return', 'Возврат товара'),
    '/contacts': () => pages.info('contacts', 'Контакты'),
    '/offer': () => pages.info('offer', 'Публичная оферта'),
    '/policy': () => pages.info('policy', 'Политика конфиденциальности'),
  };
  if (routes[p] && req.method === 'GET') return send(res, 200, routes[p]());

  if (req.method === 'GET' && serveStatic(req, res, url.pathname)) return;
  send(res, 404, pages.notFound());
}

http.createServer((req, res) => {
  handle(req, res).catch((err) => {
    const id = crypto.randomBytes(4).toString('hex');
    console.error(`[${id}]`, err);
    if (!res.headersSent) send(res, 500, `Ошибка сервера (${id})`, 'text/plain; charset=utf-8');
  });
}).listen(PORT, () => console.log(`Wasted Mondays: http://localhost:${PORT}`));
