// HTML-шаблоны. Страницы собираются на сервере, в браузер уходит готовая разметка.
// Интерфейс по мотивам Farfetch: строгая сетка, гротеск, фильтры слева, панель покупки справа.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import * as catalog from './catalog.js';
import { DELIVERY } from './orders.js';

const DATA = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../data');
const BRAND = 'Wasted Mondays';
const TG_CHANNEL = 'https://t.me/wastedmondayyss';
const TG_MANAGER = 'https://t.me/wastedmondays';
const PHONE = '+7 993 957 2663';
const PICKUP = 'Литейный пр., 41, 3 этаж, офис 303';

const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
export const money = (n) => `${Math.round(n).toLocaleString('ru-RU').replace(/ /g, ' ')} ₽`;
const plural = (n, one, few, many) => {
  const m10 = n % 10, m100 = n % 100;
  return m10 === 1 && m100 !== 11 ? one : m10 >= 2 && m10 <= 4 && (m100 < 12 || m100 > 14) ? few : many;
};

const icon = {
  heart: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 20s-7.5-4.6-9.3-9.2C1.4 7.3 3.6 4 7 4c2 0 3.6 1.1 5 3 1.4-1.9 3-3 5-3 3.4 0 5.6 3.3 4.3 6.8C19.5 15.4 12 20 12 20z"/></svg>',
  bag: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 8h14l-1 12H6L5 8z"/><path d="M9 8V6.5a3 3 0 0 1 6 0V8"/></svg>',
  menu: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M3 7h18M3 12h18M3 17h18"/></svg>',
  close: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 5l14 14M19 5L5 19"/></svg>',
  chevron: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 9l6 6 6-6"/></svg>',
  filter: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 6h16M7 12h10M10 18h4"/></svg>',
  tg: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M21.5 4.3 2.9 11.5c-.9.4-.9 1.6.1 1.9l4.6 1.4 1.8 5.6c.2.7 1.1.9 1.6.4l2.6-2.4 4.7 3.5c.6.4 1.4.1 1.6-.6l3.2-15.4c.2-.9-.7-1.6-1.6-1.6z" fill="currentColor" stroke="none"/></svg>',
};

// Марка стоит отдельной строкой, поэтому "Wasted" в начале названия не повторяем.
const model = (t) => String(t).replace(/^Wasted\s+/i, '');
const catUrl = (c) => `/catalog?cat=${encodeURIComponent(c)}`;

function layout({ title, body, bodyClass = '' }) {
  const cats = catalog.categories();
  return `<!doctype html>
<html lang="ru">
<head>
<meta name="robots" content="noindex,nofollow,noarchive">
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${esc(title)}</title>
<link rel="icon" href="/img/site/wm_logo.svg" type="image/svg+xml">
<link rel="preload" href="/fonts/onest-cyrillic.woff2" as="font" type="font/woff2" crossorigin>
<link rel="stylesheet" href="/fonts/onest.css">
<link rel="stylesheet" href="/css/site.css">
</head>
<body class="${bodyClass}">
<a class="skip" href="#main">К содержимому</a>
<div class="announce"><a href="/delivery">Самовывоз в Санкт-Петербурге | Доставка по всей России</a></div>
<header class="hdr">
  <div class="hdr__row">
    <button class="icon-btn hdr__burger" type="button" aria-label="Меню" data-drawer-open="menu">${icon.menu}</button>
    <nav class="hdr__nav" aria-label="Разделы">
      <a href="/catalog">Каталог</a>
      ${cats.map((c) => `<a href="${catUrl(c)}">${esc(c)}</a>`).join('')}
    </nav>
    <a class="hdr__logo" href="/" aria-label="${BRAND}, главная"><img src="/img/site/WASTED_MONDAYS.svg" alt="${BRAND}"></a>
    <div class="hdr__icons">
      <a class="icon-btn" href="/catalog?fav=1" aria-label="Избранное">${icon.heart}<b class="badge" data-fav-count hidden></b></a>
      <a class="icon-btn" href="/cart" aria-label="Корзина" data-bag-link>${icon.bag}<b class="badge" data-cart-count hidden></b></a>
    </div>
  </div>
</header>

<div class="drawer drawer--left" data-drawer="menu" hidden>
  <div class="drawer__panel" role="dialog" aria-modal="true" aria-label="Меню">
    <div class="drawer__head"><span>Меню</span><button class="icon-btn" type="button" aria-label="Закрыть" data-drawer-close>${icon.close}</button></div>
    <nav class="drawer__nav">
      <a href="/catalog">Каталог</a>
      ${cats.map((c) => `<a href="${catUrl(c)}">${esc(c)}</a>`).join('')}
      <a href="/catalog?fav=1">Избранное</a>
    </nav>
    <nav class="drawer__sub">
      <a href="/delivery">Доставка</a><a href="/return">Возврат</a><a href="/contacts">Контакты</a>
      <a href="${TG_CHANNEL}" target="_blank" rel="noopener">Телеграм-канал</a>
    </nav>
  </div>
</div>

<div class="drawer drawer--right" data-drawer="bag" hidden>
  <div class="drawer__panel" role="dialog" aria-modal="true" aria-label="Корзина">
    <div class="drawer__head"><span data-bag-title>Корзина</span><button class="icon-btn" type="button" aria-label="Закрыть" data-drawer-close>${icon.close}</button></div>
    <div class="drawer__body" data-bag-body></div>
    <div class="drawer__foot" data-bag-foot hidden>
      <div class="sumrow"><span>Подытог</span><b data-bag-total></b></div>
      <a class="btn btn--block" href="/cart">Перейти в корзину</a>
      <button class="btn btn--block btn--ghost" type="button" data-drawer-close>Продолжить покупки</button>
    </div>
  </div>
</div>

<main id="main">
${body}
</main>

<footer class="ftr">
  <div class="ftr__inner">
    <section class="ftr__col">
      <h2>Покупателям</h2>
      <a href="/delivery">Доставка</a>
      <a href="/return">Возврат</a>
      <a href="/contacts">Контакты</a>
    </section>
    <section class="ftr__col">
      <h2>Информация</h2>
      <a href="/offer">Публичная оферта</a>
      <a href="/policy">Политика конфиденциальности</a>
    </section>
    <section class="ftr__col">
      <h2>Связаться с нами</h2>
      <a href="tel:+79939572663">${PHONE}</a>
      <a href="${TG_MANAGER}" target="_blank" rel="noopener">Менеджер в Телеграме</a>
      <span>Самовывоз: ${PICKUP}</span>
    </section>
    <section class="ftr__col ftr__news">
      <h2>Не пропустите дроп</h2>
      <p>Подпишись на телеграм, чтобы следить за новостями.</p>
      <a class="btn btn--sm" href="${TG_CHANNEL}" target="_blank" rel="noopener">${icon.tg}<span>Подписаться</span></a>
    </section>
  </div>
  <div class="ftr__legal">
    <span>© 2026 ${BRAND}</span>
    <span>ИП Кельнер Юлия Вадимовна, ОГРНИП 325784700404335</span>
  </div>
</footer>

<div class="cookie" data-cookie hidden role="region" aria-label="Cookie">
  <p class="cookie__title">Мы используем cookie</p>
  <p>Для обеспечения оптимальной работы, анализа использования и улучшения пользовательского опыта на сайте используются технологии cookie. Продолжая пользоваться сайтом, Вы соглашаетесь с размещением cookie-файлов на Вашем устройстве на условиях, изложенных в <a href="/policy">Политике конфиденциальности</a>.</p>
  <button class="btn btn--light btn--sm" type="button" data-cookie-ok>Соглашаюсь</button>
</div>
<div class="toast" data-toast role="status" hidden></div>
<script src="/js/site.js" defer></script>
</body>
</html>`;
}

function crumbs(list) {
  return `<nav class="crumbs" aria-label="Навигация">${list.map(([t, h], i) =>
    i === list.length - 1 ? `<span aria-current="page">${esc(t)}</span>` : `<a href="${h}">${esc(t)}</a>`).join('<i>/</i>')}</nav>`;
}

function card(p, order = 0) {
  const sizes = p.variants.filter((v) => catalog.available(p.id, v.size) > 0).map((v) => v.size);
  const soldOut = sizes.length === 0;
  return `<article class="card${soldOut ? ' is-soldout' : ''}" data-id="${esc(p.id)}" data-cat="${esc(p.category.join('|'))}"
    data-sizes="${esc(sizes.join('|'))}" data-price="${p.price}" data-order="${order}">
  <a class="card__link" href="/product/${esc(p.id)}">
    <span class="card__img">
      <img src="${esc(p.images[0])}" alt="${esc(p.title)}" loading="lazy" width="1120" height="1493">
      ${p.images[1] ? `<img class="card__alt" src="${esc(p.images[1])}" alt="" loading="lazy" aria-hidden="true">` : ''}
      ${soldOut ? '<span class="card__tag">Нет в наличии</span>' : ''}
    </span>
    <span class="card__brand">${BRAND}</span>
    <span class="card__title">${esc(model(p.title))}</span>
    <span class="card__price">${money(p.price)}</span>
    <span class="card__sizes">${soldOut ? 'Нет в наличии' :`Размеры: ${sizes.map(esc).join(', ')}`}</span>
  </a>
  <button class="fav" type="button" aria-label="В избранное: ${esc(p.title)}" data-fav="${esc(p.id)}">${icon.heart}</button>
</article>`;
}

export function home() {
  const all = catalog.all();
  const cats = catalog.categories();
  const coverFor = (c) => all.find((p) => p.category.includes(c))?.images[0];
  const body = `
<section class="hero">
  <img src="/img/site/__7741_copy.jpg" alt="${BRAND}, лукбук" fetchpriority="high">
  <div class="hero__text">
    <p class="eyebrow">${BRAND}</p>
    <h1>Коллекция в наличии</h1>
    <a class="btn btn--light" href="/catalog">Смотреть всё</a>
  </div>
</section>

<section class="section">
  <h2 class="section__title">Выберите категорию</h2>
  <div class="tiles tiles--${Math.min(cats.length, 4)}">
    ${cats.map((c) => `<a class="tile" href="${catUrl(c)}">
      <img src="${esc(coverFor(c))}" alt="" loading="lazy">
      <span>${esc(c)}</span>
    </a>`).join('')}
  </div>
</section>

<section class="section">
  <div class="section__head">
    <h2 class="section__title">Все товары</h2>
    <a class="link" href="/catalog">Смотреть всё</a>
  </div>
  <div class="grid grid--4">
    ${all.map(card).join('\n')}
  </div>
</section>

<section class="section editorial">
  <a class="editorial__img" href="/catalog"><img src="/img/site/__7684.png" alt="" loading="lazy"></a>
  <div class="editorial__text">
    <p class="eyebrow">Телеграм</p>
    <h2>Подпишись на телеграм, чтобы следить за новостями</h2>
    <p>Анонсы дропов и новые модели появляются там первыми.</p>
    <a class="btn" href="${TG_CHANNEL}" target="_blank" rel="noopener">Подписаться</a>
  </div>
</section>

<section class="section lookbook">
  <img src="/img/site/__6543_copy.jpg" alt="" loading="lazy">
  <img src="/img/site/__74111_copy.jpg" alt="" loading="lazy">
</section>`;
  return layout({ title: BRAND, body, bodyClass: 'page-home' });
}

export function catalogPage() {
  const all = catalog.all();
  const cats = catalog.categories();
  const sizes = [...new Set(all.flatMap((p) => p.variants.map((v) => v.size)))];
  const body = `
<section class="plp">
  ${crumbs([['Главная', '/'], ['Каталог', '/catalog']])}
  <div class="plp__head">
    <h1 data-plp-title>Каталог</h1>
    <p class="plp__count" data-plp-count>${all.length} ${plural(all.length, 'товар', 'товара', 'товаров')}</p>
  </div>
  <div class="plp__bar">
    <button class="btn btn--ghost btn--sm plp__filters-btn" type="button" data-drawer-open="filters">${icon.filter}<span>Фильтры</span></button>
    <label class="sort"><span>Сортировка</span>
      <select data-sort>
        <option value="order">Рекомендуем</option>
        <option value="price-asc">Цена: по возрастанию</option>
        <option value="price-desc">Цена: по убыванию</option>
      </select>
    </label>
  </div>
  <div class="plp__body">
    <div class="drawer drawer--left drawer--filters" data-drawer="filters">
      <aside class="drawer__panel filters" aria-label="Фильтры">
        <div class="drawer__head"><span>Фильтры</span><button class="icon-btn" type="button" aria-label="Закрыть" data-drawer-close>${icon.close}</button></div>
        <details class="acc" open>
          <summary>Категория ${icon.chevron}</summary>
          <div class="acc__body">
            ${cats.map((c) => `<label class="checkbox"><input type="checkbox" name="cat" value="${esc(c)}"><span>${esc(c)}</span></label>`).join('')}
          </div>
        </details>
        <details class="acc" open>
          <summary>Размер ${icon.chevron}</summary>
          <div class="acc__body size-chips">
            ${sizes.map((s) => `<label class="chip"><input type="checkbox" name="size" value="${esc(s)}"><span>${esc(s)}</span></label>`).join('')}
          </div>
        </details>
        <details class="acc" open>
          <summary>Показать ${icon.chevron}</summary>
          <div class="acc__body">
            <label class="checkbox"><input type="checkbox" name="instock"><span>Только в наличии</span></label>
            <label class="checkbox"><input type="checkbox" name="fav"><span>Избранное</span></label>
          </div>
        </details>
        <div class="filters__foot">
          <button class="btn btn--ghost btn--block" type="button" data-filters-reset>Сбросить</button>
          <button class="btn btn--block filters__apply" type="button" data-drawer-close>Показать</button>
        </div>
      </aside>
    </div>
    <div class="plp__grid">
      <div class="grid grid--3" data-catalog>
        ${all.map((p, i) => card(p, i)).join('\n')}
      </div>
      <p class="empty" data-empty hidden>По выбранным фильтрам ничего нет. <button class="link" type="button" data-filters-reset>Сбросить фильтры</button></p>
    </div>
  </div>
</section>`;
  return layout({ title: 'Каталог', body, bodyClass: 'page-plp' });
}

export function product(p) {
  const variants = p.variants.map((v) => ({ ...v, left: catalog.available(p.id, v.size) }));
  const anyAvail = variants.some((v) => v.left > 0);
  const cat = p.category[0];
  const others = catalog.all().filter((x) => x.id !== p.id).slice(0, 4);
  const body = `
<section class="pdp" data-product='${esc(JSON.stringify({ id: p.id, title: p.title }))}'>
  ${crumbs([['Главная', '/'], ['Каталог', '/catalog'], ...(cat ? [[cat, catUrl(cat)]] : []), [p.title, '']])}
  <div class="pdp__layout">
    <div class="pdp__gallery">
      <div class="pdp__images" data-gallery>
        ${p.images.map((src, i) => `<img src="${esc(src)}" alt="${esc(p.title)}, фото ${i + 1}" ${i > 1 ? 'loading="lazy"' : 'fetchpriority="high"'} width="1120" height="1680">`).join('\n        ')}
      </div>
      <div class="pdp__counter" aria-hidden="true"><span data-gallery-index>1</span> / ${p.images.length}</div>
    </div>
    <div class="pdp__panel">
      <p class="pdp__brand">${BRAND}</p>
      <h1 class="pdp__title">${esc(model(p.title))}</h1>
      <p class="pdp__price">${money(p.price)}</p>
      <label class="select">
        <span class="visually-hidden">Размер</span>
        <select data-size ${anyAvail ? '' : 'disabled'}>
          <option value="">${anyAvail ? 'Выберите размер' : 'Нет в наличии'}</option>
          ${variants.map((v) => `<option value="${esc(v.size)}" ${v.left <= 0 ? 'disabled' : ''}>${esc(v.size)}${v.left <= 0 ? ' · нет в наличии' : v.left <= 2 ? ' · осталось мало' : ''}</option>`).join('')}
        </select>
        ${icon.chevron}
      </label>
      <p class="pdp__hint" data-size-hint hidden>Выберите размер</p>
      <button class="btn btn--block btn--lg" type="button" data-add ${anyAvail ? '' : 'disabled'}>${anyAvail ? 'Добавить в корзину' : 'Нет в наличии'}</button>
      <button class="btn btn--block btn--ghost btn--lg fav-btn" type="button" data-fav="${esc(p.id)}">${icon.heart}<span>В избранное</span></button>

      <div class="pdp__acc">
        <details class="acc" open>
          <summary>Описание ${icon.chevron}</summary>
          <div class="acc__body rich">${p.description}</div>
        </details>
        <details class="acc">
          <summary>Доставка ${icon.chevron}</summary>
          <div class="acc__body rich">
            <p><b>Самовывоз в Санкт-Петербурге:</b> ${PICKUP}.</p>
            <p><b>По России:</b> курьером до двери или до пункта выдачи, способ выбирается при оформлении.</p>
            <p>Обработка заказа занимает до 4 дней. <a href="/delivery">Подробнее о доставке</a></p>
          </div>
        </details>
        <details class="acc">
          <summary>Возврат ${icon.chevron}</summary>
          <div class="acc__body rich"><p>Условия и порядок возврата описаны на странице <a href="/return">Возврат товара</a>. Вопросы можно задать <a href="${TG_MANAGER}" target="_blank" rel="noopener">менеджеру в Телеграме</a>.</p></div>
        </details>
      </div>
    </div>
  </div>
</section>
${others.length ? `<section class="section">
  <h2 class="section__title section__title--left">Вам может понравиться</h2>
  <div class="grid grid--4">${others.map(card).join('\n')}</div>
</section>` : ''}`;
  return layout({ title: `${p.title} | ${BRAND}`, body, bodyClass: 'page-pdp' });
}

export function cart() {
  const body = `
<section class="bag" data-checkout>
  ${crumbs([['Главная', '/'], ['Корзина', '/cart']])}
  <h1 class="bag__title">Корзина</h1>
  <div class="bag__layout">
    <div class="bag__main">
      <div class="bag__items" data-cart-items><p class="empty">Загрузка…</p></div>
      <form class="bag__form" id="order-form" data-order-form novalidate>
        <fieldset class="form-block">
          <legend>Контактные данные</legend>
          <div class="field"><input id="f-name" name="name" autocomplete="name" placeholder=" " required><label for="f-name">Имя и фамилия</label></div>
          <div class="field-row">
            <div class="field"><input id="f-email" name="email" type="email" autocomplete="email" placeholder=" " required><label for="f-email">Email</label></div>
            <div class="field"><input id="f-phone" name="phone" type="tel" autocomplete="tel" placeholder=" " required><label for="f-phone">Телефон</label></div>
          </div>
        </fieldset>
        <fieldset class="form-block">
          <legend>Способ получения</legend>
          <div class="options">
          ${Object.entries(DELIVERY).map(([k, d], i) => `<label class="option">
            <input type="radio" name="delivery" value="${k}" data-needs-address="${d.needsAddress}" ${i === 0 ? 'checked' : ''}>
            <span class="option__box"><b>${esc(d.title)}</b><small>${k === 'pickup' ? 'Бесплатно' : 'Стоимость сообщит менеджер'}</small></span>
          </label>`).join('')}
          </div>
          <div class="field" data-address hidden><input id="f-address" name="address" autocomplete="street-address" placeholder=" "><label for="f-address">Адрес: город, улица, дом, квартира</label></div>
        </fieldset>
        <fieldset class="form-block">
          <legend>Комментарий</legend>
          <div class="field"><textarea id="f-comment" name="comment" rows="3" placeholder=" "></textarea><label for="f-comment">Комментарий к заказу</label></div>
        </fieldset>
      </form>
    </div>
    <aside class="bag__summary" data-summary>
      <h2>Сводка заказа</h2>
      <div class="sumrow"><span>Подытог</span><span data-cart-subtotal>0 ₽</span></div>
      <div class="sumrow"><span>Доставка</span><span data-cart-delivery>Бесплатно</span></div>
      <div class="sumrow sumrow--total"><span>Итого</span><b data-cart-total>0 ₽</b></div>
      <label class="checkbox"><input type="checkbox" name="consent" form="order-form" required><span>Мною прочитаны и принимаются <a href="/offer" target="_blank">правила и условия</a> и <a href="/policy" target="_blank">политика конфиденциальности</a></span></label>
      <label class="checkbox"><input type="checkbox" name="newsletter" form="order-form"><span>Я согласен(-на) получать информацию о новинках и акциях</span></label>
      <p class="form-error" data-form-error role="alert" hidden></p>
      <button class="btn btn--block btn--lg" type="submit" form="order-form">Оформить заказ</button>
      <p class="bag__note">Обработка заказа занимает до 4 дней*</p>
    </aside>
  </div>
</section>`;
  return layout({ title: 'Корзина', body, bodyClass: 'page-bag' });
}

export function orderDone(o) {
  const body = `
<section class="done">
  <p class="eyebrow">Спасибо</p>
  <h1>Заказ ${esc(o.id)} принят</h1>
  <div class="done__card">
    ${o.items.map((l) => `<div class="sumrow"><span>${esc(l.title)}, ${esc(l.size)} × ${l.qty}</span><span>${money(l.sum)}</span></div>`).join('')}
    <div class="sumrow"><span>${esc(o.delivery.title)}${o.delivery.address ? `: ${esc(o.delivery.address)}` : ''}</span><span>${o.delivery.price ? money(o.delivery.price) : ''}</span></div>
    <div class="sumrow sumrow--total"><span>Итого</span><b>${money(o.total)}</b></div>
  </div>
  <p class="done__test">Тестовый режим: оплата ещё не подключена, заказ сохранён без оплаты.</p>
  <p>Вопросы по заказу: <a href="${TG_MANAGER}">менеджер в Телеграме</a> или ${PHONE}</p>
  <a class="btn" href="/catalog">Вернуться в каталог</a>
</section>
<script>try{localStorage.removeItem('wm_cart')}catch(e){}</script>`;
  return layout({ title: `Заказ ${o.id}`, body });
}

export function info(name, title) {
  const html = fs.readFileSync(path.join(DATA, 'pages', `${name}.html`), 'utf8');
  const body = `<section class="info info--${name}">
  ${crumbs([['Главная', '/'], [title, '']])}
  <h1>${esc(title)}</h1>
  <div class="info__body">${html}</div>
</section>`;
  return layout({ title: `${title} | ${BRAND}`, body });
}

export function notFound() {
  return layout({ title: 'Страница не найдена', body: '<section class="done"><p class="eyebrow">404</p><h1>Такой страницы нет</h1><a class="btn" href="/catalog">В каталог</a></section>' });
}
