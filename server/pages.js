// HTML-шаблоны. Страницы собираются на сервере, в браузер уходит готовая разметка.
// Интерфейс по мотивам Farfetch и ASOS: баннер на весь экран, шапка на всю ширину,
// фильтры слева, панель покупки справа, ленты рекомендаций.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import * as catalog from './catalog.js';
import { DELIVERY, STATUS } from './orders.js';

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
// Марка стоит отдельной строкой, поэтому "Wasted" в начале названия не повторяем.
const model = (t) => String(t).replace(/^Wasted\s+/i, '');
const catUrl = (c) => `/catalog?cat=${encodeURIComponent(c)}`;
const ext = (href) => /^https?:/.test(href) ? ' target="_blank" rel="noopener"' : '';

function homeData() {
  try { return JSON.parse(fs.readFileSync(path.join(DATA, 'home.json'), 'utf8')); } catch { return { hero: [], lookbook: [] }; }
}

const icon = {
  heart: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 20s-7.5-4.6-9.3-9.2C1.4 7.3 3.6 4 7 4c2 0 3.6 1.1 5 3 1.4-1.9 3-3 5-3 3.4 0 5.6 3.3 4.3 6.8C19.5 15.4 12 20 12 20z"/></svg>',
  bag: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 8h14l-1 12H6L5 8z"/><path d="M9 8V6.5a3 3 0 0 1 6 0V8"/></svg>',
  menu: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M3 7h18M3 12h18M3 17h18"/></svg>',
  close: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 5l14 14M19 5L5 19"/></svg>',
  chevron: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 9l6 6 6-6"/></svg>',
  prev: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M15 5l-7 7 7 7"/></svg>',
  next: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M9 5l7 7-7 7"/></svg>',
  arrow: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 12h16M14 6l6 6-6 6"/></svg>',
  search: '<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="11" cy="11" r="6.5"/><path d="M16 16l4.5 4.5"/></svg>',
  user: '<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="8.5" r="3.8"/><path d="M4.5 20c1.2-3.6 4-5.4 7.5-5.4s6.3 1.8 7.5 5.4"/></svg>',
  filter: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 6h16M7 12h10M10 18h4"/></svg>',
  tg: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M21.5 4.3 2.9 11.5c-.9.4-.9 1.6.1 1.9l4.6 1.4 1.8 5.6c.2.7 1.1.9 1.6.4l2.6-2.4 4.7 3.5c.6.4 1.4.1 1.6-.6l3.2-15.4c.2-.9-.7-1.6-1.6-1.6z" fill="currentColor" stroke="none"/></svg>',
};

const PERKS = [
  ['Самовывоз в Санкт-Петербурге', '/delivery'],
  ['Доставка по всей России', '/delivery'],
  ['Анонсы дропов в Телеграме', TG_CHANNEL],
];

function layout({ title, body, bodyClass = '', user = null }) {
  const cats = catalog.categories();
  return `<!doctype html>
<html lang="ru">
<head>
<meta name="robots" content="noindex,nofollow,noarchive">
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
<meta name="theme-color" content="#000000">
<title>${esc(title)}</title>
<link rel="icon" href="/img/site/wm_logo.svg" type="image/svg+xml">
<link rel="preload" href="/fonts/onest-cyrillic.woff2" as="font" type="font/woff2" crossorigin>
<link rel="stylesheet" href="/fonts/onest.css">
<link rel="stylesheet" href="/css/site.css">
</head>
<body class="${bodyClass}"${user ? ' data-user="1"' : ''}>
<a class="skip" href="#main">К содержимому</a>
<div class="perks" data-perks>${PERKS.map(([t, h], i) => `<a href="${h}"${ext(h)}${i === 0 ? ' class="is-active"' : ''}>${esc(t)}</a>`).join('<i aria-hidden="true">|</i>')}</div>
<header class="hdr" data-hdr>
  <div class="hdr__row">
    <div class="hdr__left">
      <button class="icon-btn hdr__burger" type="button" aria-label="Меню" data-drawer-open="menu">${icon.menu}</button>
      <nav class="hdr__nav" aria-label="Разделы">
        <a href="/catalog">Каталог</a>
        ${cats.map((c) => `<a href="${catUrl(c)}">${esc(c)}</a>`).join('')}
      </nav>
    </div>
    <a class="hdr__logo" href="/" aria-label="${BRAND}, главная"><img src="/img/site/WASTED_MONDAYS.svg" alt="${BRAND}"></a>
    <div class="hdr__icons">
      <button class="icon-btn" type="button" aria-label="Поиск" data-search-open>${icon.search}</button>
      <a class="icon-btn hdr__tg" href="${TG_CHANNEL}" target="_blank" rel="noopener" aria-label="Телеграм-канал">${icon.tg}</a>
      <a class="icon-btn hdr__user" href="/account" aria-label="${user ? 'Личный кабинет' : 'Войти'}">${icon.user}${user ? '<b class="dot" aria-hidden="true"></b>' : ''}</a>
      <a class="icon-btn" href="/catalog?fav=1" aria-label="Избранное">${icon.heart}<b class="badge" data-fav-count hidden></b></a>
      <a class="bag-btn" href="/cart" aria-label="Корзина" data-bag-link>${icon.bag}<span class="bag-btn__label">Корзина</span><b class="badge" data-cart-count hidden></b></a>
    </div>
  </div>
  <div class="search" data-search hidden>
    <form class="search__form" action="/search" role="search">
      ${icon.search}
      <input name="q" type="search" placeholder="Поиск: худи, футболка, штаны" autocomplete="off" aria-label="Поиск по сайту" data-search-input>
      <button class="icon-btn" type="button" aria-label="Закрыть поиск" data-search-close>${icon.close}</button>
    </form>
    <div class="search__results" data-search-results></div>
  </div>
</header>
<div class="search-scrim" data-search-close hidden></div>

<div class="drawer drawer--left" data-drawer="menu" hidden>
  <div class="drawer__panel" role="dialog" aria-modal="true" aria-label="Меню">
    <div class="drawer__head"><span>Меню</span><button class="icon-btn" type="button" aria-label="Закрыть" data-drawer-close>${icon.close}</button></div>
    <nav class="drawer__nav">
      <a href="/catalog">Каталог ${icon.next}</a>
      ${cats.map((c) => `<a href="${catUrl(c)}">${esc(c)} ${icon.next}</a>`).join('')}
      <a href="/catalog?fav=1">Избранное ${icon.next}</a>
    </nav>
    <a class="drawer__account" href="/account">${icon.user}<span>${user ? `Личный кабинет${user.name ? `, ${esc(user.name)}` : ''}` : 'Войти или зарегистрироваться'}</span></a>
    <div class="drawer__social">
      <a class="social" href="${TG_CHANNEL}" target="_blank" rel="noopener">${icon.tg}<span><b>Телеграм-канал</b><small>Анонсы дропов</small></span></a>
      <a class="social" href="${TG_MANAGER}" target="_blank" rel="noopener">${icon.tg}<span><b>Менеджер</b><small>Вопросы по заказам</small></span></a>
    </div>
    <nav class="drawer__sub">
      <a href="/delivery">Доставка</a><a href="/return">Возврат</a><a href="/contacts">Контакты</a>
    </nav>
  </div>
</div>

<div class="drawer drawer--right" data-drawer="bag" hidden>
  <div class="drawer__panel" role="dialog" aria-modal="true" aria-label="Корзина">
    <div class="drawer__head"><span data-bag-title>Корзина</span><button class="icon-btn" type="button" aria-label="Закрыть" data-drawer-close>${icon.close}</button></div>
    <div class="drawer__body">
      <div data-bag-body></div>
      <div class="drawer__recs" data-bag-recs hidden>
        <p class="drawer__recs-title">Вам может понравиться</p>
        <div class="drawer__recs-list" data-bag-recs-list></div>
      </div>
    </div>
    <div class="drawer__foot" data-bag-foot hidden>
      <div class="sumrow"><span>Подытог</span><b data-bag-total></b></div>
      <a class="btn btn--block" href="/cart">Оформить заказ</a>
      <button class="btn btn--block btn--ghost" type="button" data-drawer-close>Продолжить покупки</button>
    </div>
  </div>
</div>

<main id="main">
${body}
</main>

<footer class="ftr">
  <section class="ftr__tg">
    <div>
      <p class="eyebrow eyebrow--light">Мы в соцсетях</p>
      <h2>Подпишись на телеграм, чтобы следить за новостями</h2>
    </div>
    <div class="ftr__tg-links">
      <a class="social social--dark" href="${TG_CHANNEL}" target="_blank" rel="noopener">${icon.tg}<span><b>Телеграм-канал</b><small>Анонсы дропов и новые модели</small></span>${icon.arrow}</a>
      <a class="social social--dark" href="${TG_MANAGER}" target="_blank" rel="noopener">${icon.tg}<span><b>Менеджер в Телеграме</b><small>Вопросы по заказам и размерам</small></span>${icon.arrow}</a>
    </div>
  </section>
  <div class="ftr__inner">
    <section class="ftr__col">
      <h2>Магазин</h2>
      <a href="/catalog">Каталог</a>
      ${cats.map((c) => `<a href="${catUrl(c)}">${esc(c)}</a>`).join('')}
    </section>
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
      <h2>Связаться</h2>
      <a href="tel:+79939572663">${PHONE}</a>
      <span>Самовывоз: ${PICKUP}</span>
    </section>
  </div>
  <img class="ftr__word" src="/img/site/WASTED_MONDAYS.svg" alt="" aria-hidden="true">
  <div class="ftr__legal">
    <span>© 2026 ${BRAND}</span>
    <span>ИП Кельнер Юлия Вадимовна, ОГРНИП 325784700404335</span>
  </div>
</footer>

<a class="fab" href="/cart" aria-label="Корзина" data-fab hidden>${icon.bag}<b data-cart-count></b></a>
<div class="cookie" data-cookie hidden role="dialog" aria-label="Cookie">
  <p class="cookie__title">Мы используем cookie</p>
  <p>Для обеспечения оптимальной работы, анализа использования и улучшения пользовательского опыта на сайте используются технологии cookie. Продолжая пользоваться сайтом, Вы соглашаетесь с размещением cookie-файлов на Вашем устройстве на условиях, изложенных в <a href="/policy">Политике конфиденциальности</a>.</p>
  <div class="cookie__btns">
    <button class="btn btn--ghost-light btn--sm" type="button" data-cookie-ok="necessary">Только необходимые</button>
    <button class="btn btn--light btn--sm" type="button" data-cookie-ok="all">Принять все</button>
  </div>
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
      ${soldOut ? '<span class="card__tag">Нет в наличии</span>' : sizes.length < p.variants.length ? '<span class="card__tag">Не все размеры</span>' : ''}
    </span>
    <span class="card__brand">${BRAND}</span>
    <span class="card__title">${esc(model(p.title))}</span>
    <span class="card__price">${money(p.price)}</span>
    <span class="card__sizes">${soldOut ? 'Нет в наличии' : `Размеры: ${sizes.map(esc).join(', ')}`}</span>
  </a>
  <button class="fav" type="button" aria-label="В избранное: ${esc(p.title)}" data-fav="${esc(p.id)}">${icon.heart}</button>
</article>`;
}

// Горизонтальная лента со стрелками, как на ASOS.
function rail({ title, items, link, id = '' }) {
  return `<section class="section rail-section"${id ? ` data-rail-id="${id}"` : ''}>
  <div class="section__head">
    <h2 class="section__title">${esc(title)}</h2>
    <div class="rail__ctrl">
      ${link ? `<a class="btn btn--ghost btn--sm" href="${link}">Смотреть всё</a>` : ''}
      <button class="icon-btn rail__btn" type="button" aria-label="Назад" data-rail-prev>${icon.prev}</button>
      <button class="icon-btn rail__btn" type="button" aria-label="Вперёд" data-rail-next>${icon.next}</button>
    </div>
  </div>
  <div class="rail" data-rail>${items}</div>
</section>`;
}

function heroSlide(s, i) {
  const p = s.product ? catalog.byId(s.product) : null;
  const eyebrow = p ? BRAND : s.eyebrow;
  const title = p ? model(p.title) : s.title;
  const href = p ? `/product/${p.id}` : s.href;
  const cta = p ? 'Купить' : s.cta;
  return `<figure class="hero__slide${i === 0 ? ' is-active' : ''}" data-slide aria-roledescription="слайд" aria-label="${i + 1}">
    <picture>
      ${s.mobile ? `<source media="(max-width: 700px)" srcset="${esc(s.mobile)}">` : ''}
      <img src="${esc(s.img)}" alt="" style="object-position:${esc(s.focus || 'center')}" ${i === 0 ? 'fetchpriority="high"' : 'loading="lazy"'}>
    </picture>
    <figcaption class="hero__cap">
      ${eyebrow ? `<p class="eyebrow eyebrow--light">${esc(eyebrow)}</p>` : ''}
      <h${i === 0 ? '1' : '2'} class="hero__title">${esc(title)}</h${i === 0 ? '1' : '2'}>
      ${p ? `<p class="hero__price">${money(p.price)}</p>` : ''}
      ${href ? `<a class="btn btn--light" href="${esc(href)}"${ext(href)}>${esc(cta)}</a>` : ''}
    </figcaption>
  </figure>`;
}

// Отбивка как у ASOS: человек по центру на фоне цвета фотографии, текст слева и справа.
function breaker(b) {
  if (!b) return '';
  return `<a class="breaker" href="${esc(b.href)}"${ext(b.href)} style="--bg:${esc(b.bg || '#efeeec')}">
  <span class="breaker__left">${esc(b.left)}</span>
  <img class="breaker__img" src="${esc(b.img)}" alt="" loading="lazy">
  <span class="breaker__right">${esc(b.right)} ${icon.arrow}</span>
</a>`;
}

export function home(user) {
  const all = catalog.all();
  const cats = catalog.categories();
  const h = homeData();
  const coverFor = (c) => all.find((p) => p.category.includes(c));
  const b = h.banner;
  const br = h.breakers || [];
  const body = `
<section class="hero" data-hero aria-roledescription="карусель" aria-label="Лукбук">
  ${h.hero.map(heroSlide).join('\n  ')}
  <div class="hero__ui">
    <div class="hero__bars">${h.hero.map((_, i) => `<button type="button" class="hero__bar${i === 0 ? ' is-active' : ''}" data-go="${i}" aria-label="Слайд ${i + 1}"><i></i></button>`).join('')}</div>
    <div class="hero__nav">
      <span class="hero__count"><b data-hero-index>01</b> / ${String(h.hero.length).padStart(2, '0')}</span>
      <button class="icon-btn" type="button" aria-label="Предыдущий слайд" data-hero-prev>${icon.prev}</button>
      <button class="icon-btn" type="button" aria-label="Следующий слайд" data-hero-next>${icon.next}</button>
    </div>
  </div>
</section>

<section class="section">
  <h2 class="section__title">Категории</h2>
  <div class="cats cats--${Math.min(cats.length, 4)}">
    ${cats.map((c) => {
      const p = coverFor(c);
      const n = all.filter((x) => x.category.includes(c)).length;
      return `<a class="cat" href="${catUrl(c)}">
      <span class="cat__img"><img src="${esc(p.images[0])}" alt="" loading="lazy"></span>
      <span class="cat__name">${esc(c)}</span>
      <span class="cat__count">${n} ${plural(n, 'модель', 'модели', 'моделей')}</span>
    </a>`;
    }).join('')}
  </div>
</section>

${breaker(br[0])}

${rail({ title: 'Все товары', items: all.map(card).join(''), link: '/catalog' })}

${breaker(br[1])}

${b ? `<a class="banner" href="${esc(b.href)}"${ext(b.href)}>
  <picture>
    ${b.mobile ? `<source media="(max-width: 700px)" srcset="${esc(b.mobile)}">` : ''}
    <img src="${esc(b.img)}" alt="" loading="lazy" style="object-position:${esc(b.focus || 'center')}">
  </picture>
  <span class="banner__left">${esc(b.left)}</span>
  <span class="banner__right">${esc(b.right)} ${icon.arrow}</span>
</a>` : ''}

${h.lookbook?.length ? `<section class="section rail-section" id="lookbook">
  <div class="section__head">
    <h2 class="section__title">Съёмка, июль 2026</h2>
    <div class="rail__ctrl">
      <button class="icon-btn rail__btn" type="button" aria-label="Назад" data-rail-prev>${icon.prev}</button>
      <button class="icon-btn rail__btn" type="button" aria-label="Вперёд" data-rail-next>${icon.next}</button>
    </div>
  </div>
  <div class="rail rail--look" data-rail>
    ${h.lookbook.map((n) => `<img src="/img/look/${esc(n)}-m.jpg" alt="Wasted Mondays, съёмка" loading="lazy">`).join('')}
  </div>
</section>` : ''}

${breaker(br[2])}

<section class="section" data-recent hidden>
  <div class="section__head"><h2 class="section__title">Вы недавно смотрели</h2></div>
  <div class="rail" data-recent-list></div>
</section>`;
  return layout({ user, title: BRAND, body, bodyClass: 'page-home' });
}

export function catalogPage(user) {
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
  <div class="plp__quick" role="list">
    <a class="pill" href="/catalog" data-pill="">Все</a>
    ${cats.map((c) => `<a class="pill" href="${catUrl(c)}" data-pill="${esc(c)}">${esc(c)}</a>`).join('')}
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
</section>
<section class="section" data-recent hidden>
  <div class="section__head"><h2 class="section__title">Вы недавно смотрели</h2></div>
  <div class="rail" data-recent-list></div>
</section>`;
  return layout({ user, title: `Каталог | ${BRAND}`, body, bodyClass: 'page-plp' });
}

export function product(p, user) {
  const variants = p.variants.map((v) => ({ ...v, left: catalog.available(p.id, v.size) }));
  const anyAvail = variants.some((v) => v.left > 0);
  const cat = p.category[0];
  // Сначала товары из другой категории: к худи предлагаем штаны и футболки.
  const others = catalog.all().filter((x) => x.id !== p.id)
    .sort((a, b) => Number(a.category.includes(cat)) - Number(b.category.includes(cat)));
  const body = `
<section class="pdp" data-product='${esc(JSON.stringify({ id: p.id, title: p.title }))}'>
  ${crumbs([['Главная', '/'], ['Каталог', '/catalog'], ...(cat ? [[cat, catUrl(cat)]] : []), [model(p.title), '']])}
  <div class="pdp__layout">
    <div class="pdp__gallery">
      <div class="pdp__images" data-gallery>
        ${p.images.map((src, i) => `<img src="${esc(src)}" alt="${esc(p.title)}, фото ${i + 1}" ${i > 1 ? 'loading="lazy"' : 'fetchpriority="high"'} width="1120" height="1680">`).join('\n        ')}
      </div>
      <div class="pdp__dots" aria-hidden="true">${p.images.map((_, i) => `<i${i === 0 ? ' class="is-active"' : ''}></i>`).join('')}</div>
    </div>
    <div class="pdp__panel">
      <p class="pdp__brand">${BRAND}</p>
      <h1 class="pdp__title">${esc(model(p.title))}</h1>
      <p class="pdp__price">${money(p.price)}</p>
      <fieldset class="sizes">
        <legend>Размер</legend>
        <div class="sizes__list">
        ${variants.map((v) => `<label class="size${v.left <= 0 ? ' is-out' : ''}">
          <input type="radio" name="size" value="${esc(v.size)}" ${v.left <= 0 ? 'disabled' : ''}>
          <span>${esc(v.size)}</span>
          ${v.left > 0 && v.left <= 2 ? '<small>мало</small>' : ''}
        </label>`).join('')}
        </div>
      </fieldset>
      <p class="pdp__hint" data-size-hint hidden>Выберите размер</p>
      <div class="pdp__buy">
        <button class="btn btn--block btn--lg" type="button" data-add ${anyAvail ? '' : 'disabled'}>${anyAvail ? 'Добавить в корзину' : 'Нет в наличии'}</button>
        <button class="btn btn--ghost btn--lg fav-btn" type="button" data-fav="${esc(p.id)}" aria-label="В избранное">${icon.heart}</button>
      </div>
      <ul class="pdp__perks">
        <li>Самовывоз в Санкт-Петербурге</li>
        <li>Доставка по всей России</li>
        <li><a href="${TG_MANAGER}" target="_blank" rel="noopener">Вопрос по размеру? Напишите менеджеру</a></li>
      </ul>
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
<div class="buybar" data-buybar hidden>
  <div><b>${esc(model(p.title))}</b><span>${money(p.price)}</span></div>
  <button class="btn" type="button" data-buybar-add ${anyAvail ? '' : 'disabled'}>${anyAvail ? 'В корзину' : 'Нет в наличии'}</button>
</div>
${others.length ? rail({ title: 'Вам может понравиться', items: others.map(card).join('') }) : ''}
<section class="section" data-recent hidden>
  <div class="section__head"><h2 class="section__title">Вы недавно смотрели</h2></div>
  <div class="rail" data-recent-list></div>
</section>`;
  return layout({ user, title: `${p.title} | ${BRAND}`, body, bodyClass: 'page-pdp' });
}

export function cart(user) {
  const all = catalog.all();
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
          <div class="field"><input id="f-name" name="name" autocomplete="name" placeholder=" " required value="${esc(user?.name)}"><label for="f-name">Имя и фамилия</label></div>
          <div class="field-row">
            <div class="field"><input id="f-email" name="email" type="email" autocomplete="email" placeholder=" " required value="${esc(user?.email || user?.contact?.email)}"><label for="f-email">Email</label></div>
            <div class="field"><input id="f-phone" name="phone" type="tel" autocomplete="tel" placeholder=" " required value="${esc(user?.phone || user?.contact?.phone)}"><label for="f-phone">Телефон</label></div>
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
          <div class="field" data-address hidden><input id="f-address" name="address" autocomplete="street-address" placeholder=" " value="${esc(user?.contact?.address)}"><label for="f-address">Адрес: город, улица, дом, квартира</label></div>
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
      ${user ? '' : '<p class="bag__note"><a href="/account?next=/cart">Войдите</a>, чтобы видеть заказы в личном кабинете</p>'}
      <p class="bag__note">Обработка заказа занимает до 4 дней*</p>
    </aside>
  </div>
</section>
${rail({ title: 'Вам может понравиться', items: all.map(card).join(''), id: 'cart-recs' })}`;
  return layout({ user, title: `Корзина | ${BRAND}`, body, bodyClass: 'page-bag' });
}

export function orderDone(o, user) {
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
  return layout({ user, title: `Заказ ${o.id}`, body });
}

export function info(name, title, user) {
  const html = fs.readFileSync(path.join(DATA, 'pages', `${name}.html`), 'utf8');
  const body = `<section class="info info--${name}">
  ${crumbs([['Главная', '/'], [title, '']])}
  <h1>${esc(title)}</h1>
  <div class="info__body">${html}</div>
</section>`;
  return layout({ user, title: `${title} | ${BRAND}`, body });
}

export function notFound(user) {
  return layout({ user, title: 'Страница не найдена', body: '<section class="done"><p class="eyebrow">404</p><h1>Такой страницы нет</h1><a class="btn" href="/catalog">В каталог</a></section>' });
}

export function searchPage(q, results, user) {
  const body = `
<section class="plp">
  ${crumbs([['Главная', '/'], ['Поиск', '']])}
  <div class="plp__head">
    <h1>${q ? `Поиск: «${esc(q)}»` : 'Поиск'}</h1>
    <p class="plp__count">${results.length} ${plural(results.length, 'товар', 'товара', 'товаров')}</p>
  </div>
  <form class="search-page" action="/search" role="search">
    <input name="q" type="search" value="${esc(q)}" placeholder="Что ищем?" aria-label="Поиск по сайту">
    <button class="btn" type="submit">Найти</button>
  </form>
  ${results.length ? `<div class="grid grid--4">${results.map(card).join('')}</div>`
    : `<div class="empty-state"><p>${q ? 'Ничего не нашлось. Попробуйте «худи», «футболка» или «штаны».' : 'Введите запрос.'}</p>
       <div class="plp__quick">${catalog.categories().map((c) => `<a class="pill" href="${catUrl(c)}">${esc(c)}</a>`).join('')}</div></div>`}
</section>
${results.length ? '' : rail({ title: 'Вам может понравиться', items: catalog.all().map(card).join('') })}`;
  return layout({ user, title: `Поиск | ${BRAND}`, body, bodyClass: 'page-search' });
}

export function login(info, { next = '/account', error = '' } = {}) {
  const tabs = [info.email && ['email', 'Почта'], info.sms && ['sms', 'Телефон']].filter(Boolean);
  const body = `
<section class="auth">
  <div class="auth__card">
    <p class="eyebrow">Личный кабинет</p>
    <h1>Вход и регистрация</h1>
    <p class="auth__lead">Отправим одноразовый код. Если аккаунта ещё нет, он создастся автоматически.</p>
    ${error ? `<p class="form-error" role="alert">${esc(error)}</p>` : ''}
    ${info.yandex ? `<a class="btn btn--block btn--lg btn--yandex" href="/auth/yandex?next=${encodeURIComponent(next)}"><span class="ya">Я</span>Войти с Яндекс ID</a>
    <div class="auth__or"><span>или</span></div>` : ''}
    ${tabs.length ? `<div class="auth__tabs" role="tablist">
      ${tabs.map(([k, t], i) => `<button type="button" role="tab" class="auth__tab${i === 0 ? ' is-active' : ''}" data-auth-tab="${k}" aria-selected="${i === 0}">${t}</button>`).join('')}
    </div>
    <form class="auth__form" data-auth-form data-channel="${tabs[0][0]}" data-next="${esc(next)}" novalidate>
      <div class="auth__step" data-step="1">
        <div class="field" data-for="email"${tabs[0][0] === 'email' ? '' : ' hidden'}><input id="a-email" name="email" type="email" autocomplete="email" placeholder=" "><label for="a-email">Электронная почта</label></div>
        <div class="field" data-for="sms"${tabs[0][0] === 'sms' ? '' : ' hidden'}><input id="a-phone" name="phone" type="tel" autocomplete="tel" placeholder=" "><label for="a-phone">Номер телефона</label></div>
        <label class="checkbox"><input type="checkbox" name="consent"><span>Я даю согласие на обработку моих персональных данных согласно <a href="/policy" target="_blank">политике обработки персональных данных</a></span></label>
        <button class="btn btn--block btn--lg" type="submit">Получить код</button>
      </div>
      <div class="auth__step" data-step="2" hidden>
        <p class="auth__sent" data-sent></p>
        <div class="field"><input id="a-code" name="code" inputmode="numeric" autocomplete="one-time-code" maxlength="6" placeholder=" "><label for="a-code">Код из сообщения</label></div>
        <p class="auth__test" data-test-code hidden></p>
        <button class="btn btn--block btn--lg" type="submit">Войти</button>
        <button class="link" type="button" data-auth-back>Изменить почту или телефон</button>
      </div>
      <p class="form-error" data-auth-error role="alert" hidden></p>
    </form>` : '<p class="empty">Вход временно недоступен.</p>'}
    <ul class="auth__perks">
      <li>История заказов и статусы доставки</li>
      <li>Избранное на всех устройствах</li>
      <li>Данные для доставки подставляются сами</li>
    </ul>
  </div>
</section>`;
  return layout({ user: null, title: `Вход | ${BRAND}`, body, bodyClass: 'page-auth' });
}

export function account(user, orders, tab = 'orders') {
  const u = user;
  const contactEmail = u.email || u.contact?.email || '';
  const contactPhone = u.phone || u.contact?.phone || '';
  const tabs = [['orders', 'Заказы'], ['profile', 'Мои данные'], ['favs', 'Избранное']];
  const favItems = (u.favs || []).map((id) => catalog.byId(id)).filter(Boolean);
  const body = `
<section class="acct">
  ${crumbs([['Главная', '/'], ['Личный кабинет', '']])}
  <div class="acct__head">
    <div>
      <p class="eyebrow">Личный кабинет</p>
      <h1>${u.name ? `Привет, ${esc(u.name.split(' ')[0])}` : 'Мой аккаунт'}</h1>
      <p class="acct__id">${esc([u.email, u.phone].filter(Boolean).join(' · '))}${u.yandexId ? ' · Яндекс ID' : ''}</p>
    </div>
    <button class="btn btn--ghost btn--sm" type="button" data-logout>Выйти</button>
  </div>
  <div class="acct__layout">
    <nav class="acct__nav" aria-label="Разделы кабинета">
      ${tabs.map(([k, t]) => `<a href="/account?tab=${k}"${k === tab ? ' aria-current="page"' : ''}>${t}${k === 'orders' && orders.length ? ` <small>${orders.length}</small>` : ''}</a>`).join('')}
    </nav>
    <div class="acct__main">
      ${tab === 'orders' ? (orders.length ? orders.map((o) => `
      <article class="order">
        <header class="order__head">
          <div><b>Заказ ${esc(o.id)}</b><span>${new Date(o.createdAt).toLocaleDateString('ru-RU', { day: 'numeric', month: 'long', year: 'numeric' })}</span></div>
          <span class="status status--${esc(o.status)}">${esc(STATUS[o.status] || o.status)}</span>
        </header>
        <div class="order__items">
          ${o.items.map((l) => { const p = catalog.byId(l.productId); return `<a class="order__item" href="/product/${esc(l.productId)}">
            ${p ? `<img src="${esc(p.images[0])}" alt="" loading="lazy">` : ''}
            <span><b>${esc(model(l.title))}</b><small>Размер ${esc(l.size)} · ${l.qty} шт.</small></span>
          </a>`; }).join('')}
        </div>
        <footer class="order__foot"><span>${esc(o.delivery.title)}</span><b>${money(o.total)}</b></footer>
      </article>`).join('') : `<div class="empty-state"><p>Заказов пока нет.</p><a class="btn" href="/catalog">Перейти в каталог</a></div>`) : ''}

      ${tab === 'profile' ? `
      <form class="profile" data-profile-form novalidate>
        <div class="field"><input id="p-name" name="name" autocomplete="name" placeholder=" " value="${esc(u.name)}"><label for="p-name">Имя и фамилия</label></div>
        <div class="field"><input id="p-email" name="email" type="email" autocomplete="email" placeholder=" " value="${esc(contactEmail)}" ${u.email ? 'readonly' : ''}><label for="p-email">Электронная почта${u.email ? ' (подтверждена)' : ''}</label></div>
        <div class="field"><input id="p-phone" name="phone" type="tel" autocomplete="tel" placeholder=" " value="${esc(contactPhone)}" ${u.phone ? 'readonly' : ''}><label for="p-phone">Телефон${u.phone ? ' (подтверждён)' : ''}</label></div>
        <div class="field"><input id="p-address" name="address" autocomplete="street-address" placeholder=" " value="${esc(u.contact?.address)}"><label for="p-address">Адрес доставки</label></div>
        <p class="form-error" data-profile-msg role="status" hidden></p>
        <button class="btn btn--lg" type="submit">Сохранить</button>
      </form>` : ''}

      ${tab === 'favs' ? (favItems.length ? `<div class="grid grid--3">${favItems.map(card).join('')}</div>`
        : `<div class="empty-state"><p>В избранном пусто. Нажмите на сердечко на карточке товара.</p><a class="btn" href="/catalog">Перейти в каталог</a></div>`) : ''}
    </div>
  </div>
</section>`;
  return layout({ user, title: `Личный кабинет | ${BRAND}`, body, bodyClass: 'page-acct' });
}
