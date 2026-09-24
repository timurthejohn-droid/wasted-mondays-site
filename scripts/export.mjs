// Статичная демо-версия сайта для GitHub Pages: node scripts/export.mjs /wasted-mondays-site
// Кладёт готовые страницы в docs/. Заказы и вход в ней отключены, всё остальное работает.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import * as pages from '../server/pages.js';
import * as catalog from '../server/catalog.js';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const OUT = path.join(ROOT, 'docs');
const BASE = (process.argv[2] || '').replace(/\/$/, '');

// Абсолютные ссылки "/catalog" превращаются в "/wasted-mondays-site/catalog".
const rebase = (html) => html
  .replace('<html lang="ru">', `<html lang="ru" data-base="${BASE}" data-static="1">`)
  .replace(/\b(href|src|action|srcset)="\/(?!\/)/g, `$1="${BASE}/`)
  .replace(/url\((['"]?)\/(?!\/)/g, `url($1${BASE}/`);

function write(route, html) {
  const file = route === '/404' ? path.join(OUT, '404.html') : path.join(OUT, route, 'index.html');
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, rebase(html));
}

fs.rmSync(OUT, { recursive: true, force: true });
fs.cpSync(path.join(ROOT, 'public'), OUT, { recursive: true });

// Шрифты подключаются через url('/fonts/...'), их тоже переписываем.
const fontsCss = path.join(OUT, 'fonts', 'onest.css');
fs.writeFileSync(fontsCss, rebase(fs.readFileSync(fontsCss, 'utf8')));

write('/', pages.home(null));
write('/catalog', pages.catalogPage(null));
write('/cart', pages.cart(null));
write('/search', pages.searchPage('', [], null));
write('/account', pages.login({ email: true, sms: true, yandex: false, emailTest: false, smsTest: false }, {}));
for (const [route, title] of [['delivery', 'Доставка'], ['return', 'Возврат товара'], ['contacts', 'Контакты'], ['offer', 'Публичная оферта'], ['policy', 'Политика конфиденциальности']]) {
  write(`/${route}`, pages.info(route, title, null));
}
for (const p of catalog.all()) write(`/product/${p.id}`, pages.product(p, null));
write('/404', pages.notFound(null));

// Каталог для корзины и поиска: те же данные, что отдаёт сервер, с картинками под базовый путь.
const list = catalog.publicList().map((p) => ({ ...p, images: p.images.map((i) => BASE + i) }));
fs.mkdirSync(path.join(OUT, 'api'), { recursive: true });
fs.writeFileSync(path.join(OUT, 'api', 'products.json'), JSON.stringify(list));

// Jekyll на GitHub Pages не нужен, а robots.txt кладём и сюда, и в корень репозитория.
fs.writeFileSync(path.join(OUT, '.nojekyll'), '');

const html = [];
const walk = (d) => { for (const f of fs.readdirSync(d)) { const p = path.join(d, f); if (fs.statSync(p).isDirectory()) walk(p); else if (f.endsWith('.html')) html.push(p); } };
walk(OUT);
const missing = html.filter((f) => !fs.readFileSync(f, 'utf8').includes('name="robots"'));
console.log(`docs/: ${html.length} страниц, без noindex: ${missing.length}`);
if (missing.length) { console.error(missing); process.exit(1); }
