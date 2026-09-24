// HTML-шаблоны. Страницы собираются на сервере, в браузер уходит готовая разметка.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import * as catalog from './catalog.js';
import { DELIVERY } from './orders.js';

const DATA = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../data');
const TG_CHANNEL = 'https://t.me/wastedmondayyss';
const TG_MANAGER = 'https://t.me/wastedmondays';

const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
export const money = (n) => `${Math.round(n).toLocaleString('ru-RU').replace(/ /g, ' ')} р.`;

const icon = {
  heart: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 20s-7.5-4.6-9.3-9.2C1.4 7.3 3.6 4 7 4c2 0 3.6 1.1 5 3 1.4-1.9 3-3 5-3 3.4 0 5.6 3.3 4.3 6.8C19.5 15.4 12 20 12 20z"/></svg>',
  cart: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M3 4h2.2l2.4 11.2a1.5 1.5 0 0 0 1.5 1.2h8.6a1.5 1.5 0 0 0 1.5-1.1L21 8H6.1"/><circle cx="9.5" cy="20" r="1.2"/><circle cx="17.5" cy="20" r="1.2"/></svg>',
  menu: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M3 7h18M3 12h18M3 17h18"/></svg>',
  close: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 5l14 14M19 5L5 19"/></svg>',
  tg: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M21.5 4.3 2.9 11.5c-.9.4-.9 1.6.1 1.9l4.6 1.4 1.8 5.6c.2.7 1.1.9 1.6.4l2.6-2.4 4.7 3.5c.6.4 1.4.1 1.6-.6l3.2-15.4c.2-.9-.7-1.6-1.6-1.6z" fill="currentColor" stroke="none"/></svg>',
};

function layout({ title, body, bodyClass = '' }) {
  return `<!doctype html>
<html lang="ru">
<head>
<meta name="robots" content="noindex,nofollow,noarchive">
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${esc(title)}</title>
<link rel="icon" href="/img/site/wm_logo.svg" type="image/svg+xml">
<link rel="preload" href="/fonts/IkaTrial-Bold.woff" as="font" type="font/woff" crossorigin>
<link rel="stylesheet" href="/css/site.css">
</head>
<body class="${bodyClass}">
<header class="hdr">
  <button class="hdr__btn hdr__menu" type="button" aria-label="Меню" data-menu-open>${icon.menu}</button>
  <a class="hdr__logo" href="/" aria-label="Wasted Mondays, главная"><img src="/img/site/wm_logo.svg" alt="Wasted Mondays"></a>
  <nav class="hdr__right">
    <a class="hdr__btn" href="/catalog?fav=1" aria-label="Избранное">${icon.heart}<b class="badge" data-fav-count hidden></b></a>
    <a class="hdr__btn" href="/cart" aria-label="Корзина">${icon.cart}<b class="badge" data-cart-count hidden></b></a>
  </nav>
</header>
<div class="menu" data-menu hidden>
  <button class="hdr__btn menu__close" type="button" aria-label="Закрыть" data-menu-close>${icon.close}</button>
  <nav class="menu__nav">
    <a href="/">главная</a>
    <a href="/catalog">Каталог</a>
    <a href="${TG_CHANNEL}" target="_blank" rel="noopener">Телеграм</a>
  </nav>
  <nav class="menu__sub">
    <a href="/delivery">доставка</a><a href="/return">возврат</a><a href="/contacts">контакты</a>
  </nav>
</div>
<main>
${body}
</main>
<footer class="ftr">
  <section class="subscribe">
    <h2>Подпишись на телеграм, чтобы следить<br>за новостями</h2>
    <a class="subscribe__tg" href="${TG_CHANNEL}" target="_blank" rel="noopener" aria-label="Телеграм-канал">${icon.tg}</a>
  </section>
  <nav class="ftr__links">
    <a href="/delivery">доставка</a>
    <a href="/return">возврат</a>
    <a href="/contacts">контакты</a>
    <a href="/offer">оферта</a>
    <a href="/policy">политика конфиденциальности</a>
  </nav>
  <img class="ftr__word" src="/img/site/WASTED_MONDAYS.svg" alt="Wasted Mondays">
</footer>
<div class="cookie" data-cookie hidden>
  <p>Для обеспечения оптимальной работы, анализа использования и улучшения пользовательского опыта на сайте используются технологии cookie. Продолжая пользоваться сайтом, Вы соглашаетесь с размещением cookie-файлов на Вашем устройстве на условиях, изложенных в <a href="/policy">Политике конфиденциальности</a>.</p>
  <button class="btn btn--sm" type="button" data-cookie-ok>Соглашаюсь</button>
</div>
<div class="toast" data-toast hidden></div>
<script src="/js/site.js" defer></script>
</body>
</html>`;
}

function card(p) {
  const soldOut = p.variants.every((v) => catalog.available(p.id, v.size) <= 0);
  return `<article class="card${soldOut ? ' is-soldout' : ''}" data-cat="${esc(p.category.join('|'))}" data-id="${esc(p.id)}">
  <a class="card__img" href="/product/${esc(p.id)}">
    <img src="${esc(p.images[0])}" alt="${esc(p.title)}" loading="lazy" width="1120" height="1400">
    ${p.images[1] ? `<img class="card__alt" src="${esc(p.images[1])}" alt="" loading="lazy" aria-hidden="true">` : ''}
    ${soldOut ? '<span class="card__mark">Sold out</span>' : ''}
  </a>
  <button class="fav" type="button" aria-label="В избранное" data-fav="${esc(p.id)}">${icon.heart}</button>
  <h3 class="card__title"><a href="/product/${esc(p.id)}">${esc(p.title)}</a></h3>
  <p class="card__price">${money(p.price)}</p>
  <a class="btn btn--sm" href="/product/${esc(p.id)}">${soldOut ? 'Смотреть' : 'Купить'}</a>
</article>`;
}

const HERO = ['__6543_copy.jpg', '__74111_copy.jpg', '__7741_copy.jpg', '__8017_copy.jpg'];

export function home() {
  const body = `
<section class="hero" data-slider aria-label="Лукбук">
  ${HERO.map((f, i) => `<img class="hero__slide${i === 0 ? ' is-active' : ''}" src="/img/site/${f}" alt="" ${i ? 'loading="lazy"' : 'fetchpriority="high"'}>`).join('\n  ')}
  <div class="hero__dots">${HERO.map((_, i) => `<button type="button" aria-label="Слайд ${i + 1}" data-dot="${i}"${i === 0 ? ' class="is-active"' : ''}></button>`).join('')}</div>
</section>
<section class="grid wrap">
  ${catalog.all().map(card).join('\n')}
</section>
<section class="promo wrap">
  <a class="promo__big" href="/catalog"><img src="/img/site/__7684.png" alt="Wasted Appliqué Hoodie" loading="lazy"></a>
  <a class="promo__tg" href="${TG_CHANNEL}" target="_blank" rel="noopener">
    <span>Телеграм</span>
    <img src="/img/site/__6575.png" alt="" loading="lazy">
  </a>
  <a class="promo__dark" href="/catalog"><span>Каталог</span><i>→</i></a>
</section>`;
  return layout({ title: 'WASTED MONDAYS', body, bodyClass: 'page-home' });
}

export function catalogPage() {
  const cats = catalog.categories();
  const body = `
<section class="wrap page-head">
  <h1>Каталог</h1>
  <div class="chips" role="tablist">
    <button type="button" class="chip is-active" data-filter="">Все</button>
    ${cats.map((c) => `<button type="button" class="chip" data-filter="${esc(c)}">${esc(c)}</button>`).join('')}
    <button type="button" class="chip" data-filter="__fav">Избранное</button>
  </div>
</section>
<section class="grid wrap" data-catalog>
  ${catalog.all().map(card).join('\n')}
</section>
<p class="wrap empty" data-empty hidden>Здесь пока пусто.</p>`;
  return layout({ title: 'Каталог', body });
}

export function product(p) {
  const variants = p.variants.map((v) => ({ ...v, left: catalog.available(p.id, v.size) }));
  const firstAvail = variants.find((v) => v.left > 0);
  const body = `
<section class="pdp wrap" data-product='${esc(JSON.stringify({ id: p.id, title: p.title, image: p.images[0] }))}'>
  <a class="pdp__back" href="/catalog">← Назад</a>
  <div class="pdp__gallery" data-gallery>
    <div class="pdp__main">
      ${p.images.map((src, i) => `<img src="${esc(src)}" alt="${esc(p.title)}, фото ${i + 1}" ${i ? 'loading="lazy"' : 'fetchpriority="high"'} width="1120" height="1680">`).join('\n      ')}
    </div>
    <div class="pdp__thumbs">
      ${p.images.map((src, i) => `<button type="button" data-thumb="${i}"${i === 0 ? ' class="is-active"' : ''} aria-label="Фото ${i + 1}"><img src="${esc(src)}" alt="" loading="lazy"></button>`).join('')}
    </div>
  </div>
  <div class="pdp__info">
    <h1>${esc(p.title)}</h1>
    <p class="pdp__price">${money(p.price)}</p>
    <fieldset class="sizes">
      <legend>Размер</legend>
      ${variants.map((v) => `<label class="size${v.left <= 0 ? ' is-out' : ''}">
        <input type="radio" name="size" value="${esc(v.size)}" data-price="${v.price}" ${v.left <= 0 ? 'disabled' : ''} ${v === firstAvail ? 'checked' : ''}>
        <span>${esc(v.size)}</span>
      </label>`).join('')}
    </fieldset>
    <div class="pdp__actions">
      <button class="btn btn--outline" type="button" data-add ${firstAvail ? '' : 'disabled'}>${firstAvail ? 'В корзину' : 'Нет в наличии'}</button>
      <button class="fav fav--round" type="button" aria-label="В избранное" data-fav="${esc(p.id)}">${icon.heart}</button>
    </div>
    <div class="pdp__descr">${p.description}</div>
  </div>
</section>`;
  return layout({ title: p.title, body, bodyClass: 'page-product' });
}

export function cart() {
  const body = `
<section class="wrap page-head"><h1>Корзина</h1></section>
<section class="wrap checkout" data-checkout>
  <div class="checkout__items" data-cart-items><p class="empty">Загрузка…</p></div>
  <form class="checkout__form" data-order-form novalidate>
    <h2>Оформление</h2>
    <label>Имя и фамилия<input name="name" autocomplete="name" required></label>
    <label>Email<input name="email" type="email" autocomplete="email" required></label>
    <label>Телефон<input name="phone" type="tel" autocomplete="tel" placeholder="+7" required></label>
    <fieldset class="delivery">
      <legend>Доставка</legend>
      ${Object.entries(DELIVERY).map(([k, d], i) => `<label class="radio"><input type="radio" name="delivery" value="${k}" data-needs-address="${d.needsAddress}" ${i === 0 ? 'checked' : ''}><span>${esc(d.title)}</span></label>`).join('')}
    </fieldset>
    <label data-address hidden>Адрес доставки<input name="address" autocomplete="street-address"></label>
    <label>Комментарий к заказу<textarea name="comment" rows="3"></textarea></label>
    <label class="check"><input type="checkbox" name="newsletter"><span>Я согласен(-на) получать информацию о новинках и акциях</span></label>
    <label class="check"><input type="checkbox" name="consent" required><span>Мною прочитаны и принимаются <a href="/offer" target="_blank">правила и условия</a> и <a href="/policy" target="_blank">политика конфиденциальности</a></span></label>
    <p class="checkout__note">Обработка заказа занимает до 4 дней*</p>
    <div class="checkout__total"><span>Итого</span><b data-cart-total>0 р.</b></div>
    <p class="form-error" data-form-error hidden></p>
    <button class="btn btn--wide" type="submit">Купить</button>
  </form>
</section>`;
  return layout({ title: 'Корзина', body, bodyClass: 'page-cart' });
}

export function orderDone(o) {
  const body = `
<section class="wrap done">
  <h1>Заказ ${esc(o.id)} принят</h1>
  <p>Сумма: <b>${money(o.total)}</b></p>
  <ul>${o.items.map((l) => `<li>${esc(l.title)}, ${esc(l.size)} × ${l.qty}: ${money(l.sum)}</li>`).join('')}</ul>
  <p>${esc(o.delivery.title)}${o.delivery.address ? `: ${esc(o.delivery.address)}` : ''}</p>
  <p class="done__test">Тестовый режим: оплата ещё не подключена, заказ сохранён без оплаты.</p>
  <p>Вопросы по заказу: <a href="${TG_MANAGER}">t.me/wastedmondays</a></p>
  <a class="btn" href="/catalog">В каталог</a>
</section>
<script>try{localStorage.removeItem('wm_cart')}catch(e){}</script>`;
  return layout({ title: `Заказ ${o.id}`, body });
}

export function info(name, title) {
  const html = fs.readFileSync(path.join(DATA, 'pages', `${name}.html`), 'utf8');
  const body = `<section class="wrap info info--${name}"><h1>${esc(title)}</h1>${html}</section>`;
  return layout({ title, body });
}

export function notFound() {
  return layout({ title: 'Страница не найдена', body: '<section class="wrap done"><h1>404</h1><p>Такой страницы нет.</p><a class="btn" href="/catalog">В каталог</a></section>' });
}
