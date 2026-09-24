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

const MARK_SYMBOL = '<svg width="0" height="0" style="position:absolute" aria-hidden="true"><symbol id="wm-mark" viewBox="-6 -6 225 157"><path d="M73.932 69.1309L87.6213 37.5672L86.2659 32.2748L83.0673 19.6711L81.1155 12.0324C80.0583 7.88578 82.2811 3.60276 86.2931 2.10232L87.7298 1.58398C88.5972 1.25661 88.3261 -0.0529053 87.3774 0.00165605C84.26 0.219902 81.2511 0.54726 78.2964 0.929189C77.7542 0.95647 77.2391 1.06561 76.697 1.12017C75.965 1.2293 75.2332 1.33841 74.5284 1.44753C73.417 1.61121 72.3055 1.80221 71.2212 1.99318C71.0315 2.02046 70.8418 2.04773 70.652 2.07501C70.5165 2.07501 70.3538 2.12957 70.2183 2.15685C69.9472 2.21141 69.6761 2.26597 69.405 2.32053C69.2423 2.34781 69.0797 2.37512 68.9171 2.42968C68.2123 2.56608 67.5346 2.70247 66.8298 2.83887C66.2877 2.94799 65.7726 3.0571 65.2305 3.16623C64.7425 3.27535 64.2546 3.38446 63.7666 3.49358C63.1432 3.62998 62.5468 3.76645 61.9233 3.90286C61.7607 3.93014 61.5981 3.98464 61.4354 4.01192C61.2186 4.06648 61.0288 4.12104 60.8119 4.1756C60.1071 4.36656 59.3752 4.53028 58.6704 4.72124C58.318 4.80309 57.9656 4.88495 57.6132 4.99407C53.2489 6.2217 49.0743 7.5584 45.1437 9.03156C44.1949 9.38621 44.3305 10.8048 45.3335 10.9412L47.2852 11.2414C52.1917 12.0052 54.9838 17.3249 52.7881 21.8262L51.8935 23.654L15.7861 98.2394C13.6175 102.741 9.0092 105.523 4.0485 105.387L0.687184 105.305C0.0908157 105.305 -0.234539 106.014 0.199183 106.424C2.63887 108.906 5.32259 111.389 8.2231 113.844C8.5484 114.144 8.90081 114.417 9.25321 114.69C9.76825 115.099 10.2561 115.535 10.7983 115.945C11.2591 116.299 11.72 116.654 12.1808 117.009C12.723 117.418 13.2651 117.854 13.8073 118.263C13.9428 118.373 14.0783 118.482 14.2139 118.591C16.9517 120.637 19.8523 122.628 22.9697 124.565C23.7287 125.029 24.6503 124.238 24.2979 123.392L21.533 116.763C19.6354 112.18 19.7981 107.024 21.9396 102.577L61.2998 21.3079L61.7064 21.1988L72.3868 63.2383L73.8778 69.1037L73.932 69.1309Z"/><path d="M121.209 39.4228L119.746 36.1218L119.366 35.2215C118.2 32.5753 118.959 29.6017 120.965 27.8012C121.589 27.2556 121.318 26.2189 120.505 26.1098C118.743 25.8643 116.926 25.646 115.083 25.4278C113.728 25.2641 112.372 25.155 110.99 25.0459C110.61 25.0186 110.231 24.9913 109.824 24.964C108.659 24.8822 107.466 24.8276 106.246 24.7731C105.975 24.7731 105.677 24.7457 105.406 24.7184C105.189 24.7184 104.999 24.7184 104.782 24.7184C103.21 24.6639 101.638 24.6367 100.038 24.6094C98.5745 24.6094 97.1379 24.6367 95.7283 24.6912C94.7524 24.7185 93.7765 24.773 92.8006 24.8276C92.4753 24.8276 92.15 24.8276 91.8247 24.8822C91.3097 24.9095 90.7947 24.9368 90.3067 24.964C89.2224 25.0459 88.9513 26.519 89.9543 26.9828L90.876 27.392C92.5295 28.1558 93.8849 29.4926 94.6168 31.184L94.671 31.2931L90.1983 41.6052L73.6355 79.8528L65.3405 99.0038L43.79 66.7034L33.1367 88.6917L34.6005 90.9014L37.5552 95.4027C39.019 97.7488 41.5943 102.005 40.0491 103.805C39.5612 104.378 39.8051 105.278 40.4557 105.633C42.3533 106.67 44.3593 107.679 46.4194 108.634L46.4736 108.688C47.1784 109.016 47.9104 109.343 48.6423 109.671C48.7236 109.698 48.8049 109.752 48.8863 109.78C51.7326 111.035 54.7415 112.208 57.9131 113.272C58.1299 113.353 58.3468 113.408 58.5636 113.49C59.8648 113.926 61.166 114.336 62.5214 114.717C62.928 114.827 63.3346 114.963 63.7412 115.072C65.0152 115.427 66.2894 115.754 67.6176 116.082C67.9971 116.163 68.3495 116.272 68.729 116.354C70.3825 116.736 72.0903 117.118 73.8252 117.446C74.0963 117.5 74.3945 117.555 74.6927 117.582C75.8312 117.8 76.9697 117.991 78.1353 118.182C78.7046 118.237 79.2468 118.346 79.8431 118.428C80.8461 118.564 81.2798 117.145 80.3582 116.709C77.3492 115.29 74.774 113.081 72.9307 110.325L70.1928 106.233L78.5691 86.9184L93.912 51.5081L98.7101 40.4048L112.887 72.5688L121.291 39.4773L121.209 39.4228Z"/><path d="M136.66 21.0917L161.03 71.4246L174.584 51.1005L163.632 28.4848C161.437 23.9562 163.795 18.9093 167.997 17.2724C169.054 16.8632 169.189 15.4173 168.159 14.9263C163.795 12.6892 159.078 10.616 154.09 8.76089C153.874 8.65177 153.657 8.59721 153.467 8.51537C153.142 8.40625 152.816 8.26983 152.491 8.16071C150.946 7.6151 149.347 7.06949 147.747 6.55116C147.503 6.46932 147.232 6.38743 146.988 6.33287C145.47 5.8691 143.925 5.40532 142.326 4.96883C142.055 4.88699 141.784 4.80516 141.485 4.72332C141.296 4.66876 141.079 4.6142 140.889 4.55964C140.889 4.55964 140.618 4.50505 140.509 4.45049C139.181 4.09584 137.826 3.76852 136.443 3.46843C135.982 3.35931 135.549 3.25014 135.088 3.1683C134.925 3.14102 134.735 3.08652 134.573 3.05924C134.573 3.05924 134.573 3.05924 134.546 3.05924C133.055 2.73187 131.564 2.45904 130.019 2.18623C129.531 2.10439 129.016 1.99525 128.501 1.91341C128.094 1.83157 127.687 1.77704 127.281 1.6952C125.763 1.47696 124.245 1.20415 122.673 1.01318C121.968 0.931342 121.534 1.80424 122.049 2.2953L123.676 3.85032C128.962 8.97908 131.076 16.5359 129.26 23.6834L106.679 112.509L93.7216 61.5489L80.0323 93.14L87.6766 123.258C89.032 128.659 86.1857 134.225 81.0352 136.216L70.8699 140.172C69.7042 140.608 69.8669 142.327 71.0868 142.518C79.9239 144.073 89.5471 144.946 99.9564 145.001C101.285 145.001 102.586 145.001 103.887 144.946C104.809 144.946 105.73 144.891 106.652 144.837C106.977 144.837 107.303 144.837 107.601 144.81C108.766 144.755 109.905 144.7 111.016 144.619C111.07 144.619 111.125 144.619 111.152 144.619C112.345 144.537 113.537 144.455 114.703 144.346C120.585 143.855 126.17 143.064 131.483 142.054C132.757 141.809 132.838 140.008 131.591 139.654L119.935 136.189C115.028 134.743 111.26 130.787 109.986 125.795L110.637 123.176L136.606 21.0917H136.66Z"/><path d="M190.577 57.6174C187.541 53.9617 183.8 50.0606 179.3 46.1867C178.541 45.532 177.402 46.2685 177.673 47.2233L178.243 49.2694C178.677 50.8517 178.405 52.5704 177.484 53.9344L176.616 55.2166L161.328 78.1324L147.448 98.9203L131.536 62.8007L131.482 62.6642L130.669 60.8091L122.265 93.9006L124.949 100.011L125.193 100.53V100.584C127.877 106.613 125.383 113.679 119.528 116.68L119.148 116.871C118.281 117.307 118.714 118.617 119.663 118.481C124.027 117.88 128.148 117.089 132.106 116.134C132.566 116.053 132.973 115.916 133.407 115.807C134.627 115.507 135.819 115.207 136.985 114.852C137.581 114.688 138.151 114.498 138.72 114.334C139.831 114.006 140.943 113.652 142.027 113.297C142.623 113.106 143.193 112.888 143.789 112.67C144.819 112.315 145.822 111.933 146.798 111.551C147.394 111.333 147.964 111.087 148.56 110.842C149.509 110.46 150.457 110.051 151.379 109.669C151.623 109.56 151.867 109.451 152.111 109.369C154.334 108.359 156.475 107.323 158.508 106.231C159.403 105.74 159.159 104.404 158.129 104.295H157.939C156.069 104.076 155.066 101.921 156.123 100.339C156.665 99.5204 157.234 98.6747 157.804 97.8017L159.376 95.4556C161.084 92.9185 162.9 90.1904 164.77 87.3805L166.044 85.4436C166.397 84.898 166.749 84.3797 167.129 83.834L180.682 63.5099C180.899 63.1825 181.089 62.8825 181.306 62.5824L181.36 62.5005C181.658 62.064 181.929 61.6549 182.2 61.2456C183.529 59.2542 185.996 58.2993 188.3 58.9268L189.547 59.2541C190.523 59.5269 191.282 58.3539 190.631 57.5627L190.577 57.6174Z"/><path d="M22.6449 73.0898L23.1871 73.9082L34.1928 51.1561C33.6777 48.7827 34.0031 46.2456 35.25 44.0632L35.9277 42.8901C36.253 42.3172 35.6024 41.6352 35.0331 42.0171C33.1627 43.1902 31.4007 44.4178 29.6929 45.6454C29.6929 45.6454 29.476 45.8091 29.3676 45.8909C28.717 46.3547 28.0936 46.8457 27.4701 47.3095C27.3075 47.4186 27.1719 47.5551 27.0093 47.6642C26.4129 48.1279 25.8165 48.5917 25.2473 49.0555C25.0846 49.1919 24.922 49.3283 24.7322 49.4647C24.1901 49.9012 23.675 50.365 23.1599 50.8015C22.9702 50.9652 22.7805 51.1288 22.5907 51.3198C22.1299 51.729 21.669 52.1383 21.2082 52.5747C20.9913 52.7657 20.7745 52.9567 20.5576 53.1749C20.151 53.5569 19.7445 53.9387 19.3378 54.3207C19.0939 54.5389 18.877 54.7572 18.633 55.0027C18.2806 55.3573 17.9282 55.712 17.5758 56.0667C17.3318 56.3122 17.0879 56.5577 16.8439 56.8032C16.5186 57.1306 16.2204 57.458 15.8951 57.7854C15.6511 58.0309 15.4343 58.2764 15.1903 58.5492C14.8921 58.8766 14.594 59.2039 14.2958 59.5313C14.1602 59.695 14.0247 59.8314 13.8892 59.9951C11.3139 62.9414 9.14535 65.7513 7.38336 68.2884C6.89542 68.9704 7.57307 69.8707 8.35919 69.6252L10.6634 68.8885C15.1361 67.4699 19.9884 69.1614 22.5907 73.0898H22.6449Z"/><path d="M211.338 89.0756L207.841 90.3305C200.901 92.7858 193.257 89.6485 190.031 82.992L182.631 67.6875L169.077 88.0116L174.553 99.3059C177.453 105.28 177.128 112.319 173.685 117.993L168.453 126.668C167.776 127.814 169.023 129.151 170.188 128.523C175.366 125.741 180.083 122.74 184.393 119.63C185.477 118.866 186.507 118.075 187.537 117.257C187.727 117.12 187.917 116.956 188.107 116.82C188.947 116.165 189.787 115.483 190.6 114.801C190.709 114.719 190.817 114.638 190.899 114.556C191.82 113.792 192.715 113.028 193.582 112.264C193.718 112.155 193.853 112.019 193.989 111.882C194.694 111.255 195.371 110.627 196.049 110C196.266 109.809 196.483 109.591 196.7 109.4C197.377 108.772 198.028 108.145 198.678 107.49C198.787 107.381 198.922 107.245 199.031 107.135C199.654 106.508 200.278 105.88 200.874 105.28C205.754 100.206 209.684 95.2683 212.774 90.8761C213.452 89.9213 212.476 88.6664 211.392 89.0483L211.338 89.0756Z"/></symbol></svg>';

const icon = {
  mark: '<svg class="mark" viewBox="-6 -6 225 157" aria-hidden="true"><use href="#wm-mark"/></svg>',
  plus: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 5v14M5 12h14"/></svg>',
  expand: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 9V4h5M20 9V4h-5M4 15v5h5M20 15v5h-5"/></svg>',
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
${MARK_SYMBOL}
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
      <a class="icon-btn" href="/catalog?fav=1" aria-label="Избранное">${icon.mark}<b class="badge" data-fav-count hidden></b></a>
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

// Карточка как у Represent: фото на всю ячейку, "+" в углу открывает размеры,
// под фото название и цена в строку, цвет и кружки цветов модели.
function card(p, order = 0) {
  const variants = p.variants.map((v) => ({ ...v, left: catalog.available(p.id, v.size) }));
  const sizes = variants.filter((v) => v.left > 0).map((v) => v.size);
  const soldOut = sizes.length === 0;
  const sibs = catalog.siblings(p);
  const n = sibs.length || 1;
  return `<article class="card${soldOut ? ' is-soldout' : ''}" data-id="${esc(p.id)}" data-cat="${esc(p.category.join('|'))}"
    data-sizes="${esc(sizes.join('|'))}" data-price="${p.price}" data-order="${order}">
  <div class="card__media">
    <a class="card__img" href="/product/${esc(p.id)}" tabindex="-1" aria-hidden="true">
      <img src="${esc(p.images[0])}" alt="" loading="lazy" width="1120" height="1493">
      ${p.images[1] ? `<img class="card__alt" src="${esc(p.images[1])}" alt="" loading="lazy">` : ''}
    </a>
    ${soldOut ? '<span class="card__tag">Нет в наличии</span>' : sizes.length < variants.length ? '<span class="card__tag">Не все размеры</span>' : ''}
    <button class="fav card__fav" type="button" aria-label="В избранное: ${esc(p.title)}" data-fav="${esc(p.id)}">${icon.mark}</button>
    ${soldOut ? '' : `<div class="quick" data-quick>
      <button class="quick__plus" type="button" aria-label="Выбрать размер: ${esc(p.title)}" aria-expanded="false" data-quick-toggle>${icon.plus}</button>
      <div class="quick__sizes" role="group" aria-label="Размеры">
        ${variants.map((v) => `<button type="button" data-quick-add="${esc(p.id)}" data-size="${esc(v.size)}" ${v.left <= 0 ? 'disabled aria-label="' + esc(v.size) + ', нет в наличии"' : ''}>${esc(v.size)}</button>`).join('')}
      </div>
    </div>`}
  </div>
  <a class="card__info" href="/product/${esc(p.id)}">
    <span class="card__row"><span class="card__title">${esc(model(p.title))}</span><span class="card__price">${money(p.price)}</span></span>
    <span class="card__color">${esc(p.color?.name || '')}</span>
    <span class="card__swatches">${sibs.map((x) => `<i style="--c:${esc(x.color?.hex || '#ccc')}"${x.id === p.id ? ' class="is-current"' : ''}></i>`).join('')}<small>${n} ${plural(n, 'цвет', 'цвета', 'цветов')}</small></span>
  </a>
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
  // Горизонтальные кадры съёмки показываем целиком, широкие лукбук-кадры заполняют экран.
  const fit = s.fit || (s.img.includes('/look/') ? 'contain' : 'cover');
  return `<figure class="hero__slide${i === 0 ? ' is-active' : ''}" data-slide aria-roledescription="слайд" aria-label="${i + 1}">
    ${fit === 'contain' ? `<img class="hero__bg" src="${esc(s.mobile || s.img)}" alt="" aria-hidden="true" ${i === 0 ? '' : 'loading="lazy"'}>` : ''}
    <picture>
      ${s.mobile ? `<source media="(max-width: 700px)" srcset="${esc(s.mobile)}">` : ''}
      <img class="hero__img hero__img--${fit}" src="${esc(s.img)}" alt="" style="object-position:${esc(s.focus || 'center')}" ${i === 0 ? 'fetchpriority="high"' : 'loading="lazy"'}>
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

<section class="shop">
  <div class="shop__head">
    <h2>Новинки <sup>${all.length}</sup></h2>
    <nav class="shop__tabs">
      <a href="/catalog" class="is-active">Все</a>
      ${cats.map((c) => `<a href="${catUrl(c)}">${esc(c)}</a>`).join('')}
    </nav>
  </div>
  <div class="pgrid">${all.map(card).join('')}</div>
</section>

${breaker(br[0])}

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

<section class="shop shop--center" data-recent hidden>
  <div class="shop__head"><h2>Вы недавно смотрели</h2></div>
  <div class="pgrid" data-recent-list></div>
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
      <div class="pgrid pgrid--3" data-catalog>
        ${all.map((p, i) => card(p, i)).join('\n')}
      </div>
      <p class="empty" data-empty hidden>По выбранным фильтрам ничего нет. <button class="link" type="button" data-filters-reset>Сбросить фильтры</button></p>
    </div>
  </div>
</section>
<section class="shop shop--center" data-recent hidden>
  <div class="shop__head"><h2>Вы недавно смотрели</h2></div>
  <div class="pgrid" data-recent-list></div>
</section>`;
  return layout({ user, title: `Каталог | ${BRAND}`, body, bodyClass: 'page-plp' });
}

export function product(p, user) {
  const variants = p.variants.map((v) => ({ ...v, left: catalog.available(p.id, v.size) }));
  const anyAvail = variants.some((v) => v.left > 0);
  const cat = p.category[0];
  const sibs = catalog.siblings(p);
  // "Вам может понравиться": все остальные товары, сначала из других категорий.
  const others = catalog.all().filter((x) => x.group !== p.group)
    .sort((a, b) => Number(a.category.includes(cat)) - Number(b.category.includes(cat)));
  const body = `
<section class="pdp" data-product='${esc(JSON.stringify({ id: p.id, title: p.title }))}'>
  <div class="pdp__gallery" data-gallery-wrap>
    <div class="pdp__track" data-gallery>
      ${p.images.map((src, i) => `<figure class="pdp__slide"><img src="${esc(src)}" alt="${esc(model(p.title))}, фото ${i + 1}" ${i ? 'loading="lazy"' : 'fetchpriority="high"'} width="1120" height="1680"></figure>`).join('\n      ')}
    </div>
    <button class="pdp__arrow pdp__arrow--prev" type="button" aria-label="Предыдущее фото" data-gprev>${icon.prev}</button>
    <button class="pdp__arrow pdp__arrow--next" type="button" aria-label="Следующее фото" data-gnext>${icon.next}</button>
    <span class="pdp__count"><b data-gindex>1</b> / ${p.images.length}</span>
    <button class="pdp__zoom" type="button" aria-label="Все фото крупно" data-gzoom>${icon.expand}</button>
  </div>

  <div class="pdp__side">
    <div class="pdp__panel">
      ${crumbs([['Главная', '/'], ['Каталог', '/catalog'], ...(cat ? [[cat, catUrl(cat)]] : []), [model(p.title), '']])}
      <div class="pdp__row">
        <h1 class="pdp__title">${esc(model(p.title))}</h1>
        <p class="pdp__price">${money(p.price)}</p>
      </div>

      <div class="pdp__line">
        <p><b>Цвет</b><sup>${sibs.length}</sup> <span class="muted">${esc(p.color?.name || '')}</span></p>
        <button class="fav-link" type="button" data-fav="${esc(p.id)}"><span data-fav-label>В избранное</span>${icon.mark}</button>
      </div>
      <div class="pdp__colors">
        ${sibs.map((x) => `<a href="/product/${esc(x.id)}" class="pdp__color${x.id === p.id ? ' is-current' : ''}" aria-label="${esc(x.color?.name || x.title)}"${x.id === p.id ? ' aria-current="true"' : ''}><img src="${esc(x.images[0])}" alt=""></a>`).join('')}
      </div>

      <fieldset class="sizes">
        <div class="pdp__line"><legend><b>Размер</b></legend><a class="muted-link" href="${TG_MANAGER}" target="_blank" rel="noopener">Помочь с размером</a></div>
        <div class="sizes__list">
        ${variants.map((v) => `<label class="size${v.left <= 0 ? ' is-out' : ''}">
          <input type="radio" name="size" value="${esc(v.size)}" ${v.left <= 0 ? 'disabled' : ''}>
          <span>${esc(v.size)}${v.left > 0 && v.left <= 2 ? '<small>мало</small>' : ''}</span>
        </label>`).join('')}
        </div>
      </fieldset>
      <p class="pdp__hint" data-size-hint hidden>Выберите размер</p>
      <button class="btn btn--block btn--lg" type="button" data-add ${anyAvail ? '' : 'disabled'}>${anyAvail ? 'Добавить в корзину' : 'Нет в наличии'}</button>

      <ul class="pdp__perks">
        <li><span>СПб</span>Самовывоз: ${PICKUP}</li>
        <li><span>РФ</span>Доставка по всей России, до двери или до пункта выдачи</li>
        <li><span>TG</span><a href="${TG_MANAGER}" target="_blank" rel="noopener">Вопрос по заказу? Напишите менеджеру</a></li>
      </ul>

      <div class="pdp__more">
        <button class="more-btn" type="button" data-sheet-open="desc">${icon.plus}<span>Описание</span></button>
        <button class="more-btn" type="button" data-sheet-open="ship">${icon.plus}<span>Доставка и возврат</span></button>
      </div>
    </div>
  </div>

  <div class="sheet" data-sheet hidden>
    <div class="sheet__panel" role="dialog" aria-modal="true" aria-label="Подробнее о товаре">
      <div class="sheet__head">
        <div class="sheet__tabs" role="tablist">
          <button type="button" role="tab" data-sheet-tab="desc">Описание</button>
          <button type="button" role="tab" data-sheet-tab="ship">Доставка и возврат</button>
        </div>
        <button class="icon-btn" type="button" aria-label="Закрыть" data-sheet-close>${icon.close}</button>
      </div>
      <div class="sheet__body rich" data-sheet-body="desc">
        <p class="sheet__title">${esc(model(p.title))}</p>
        ${p.description}
        <p class="sheet__meta">Цвет: ${esc(p.color?.name || '')}<br>Размеры: ${variants.map((v) => esc(v.size)).join(', ')}</p>
      </div>
      <div class="sheet__body rich" data-sheet-body="ship" hidden>
        <p class="sheet__title">Доставка</p>
        <p><b>Самовывоз в Санкт-Петербурге:</b> ${PICKUP}.</p>
        <p><b>По России:</b> курьером до двери или до пункта выдачи, способ выбирается при оформлении.</p>
        <p>Обработка заказа занимает до 4 дней. <a href="/delivery">Подробнее о доставке</a></p>
        <p class="sheet__title">Возврат</p>
        <p>Условия и порядок возврата описаны на странице <a href="/return">Возврат товара</a>.</p>
        <p>Вопросы по заказу и размеру: <a href="${TG_MANAGER}" target="_blank" rel="noopener">менеджер в Телеграме</a>.</p>
      </div>
    </div>
  </div>
</section>
<div class="buybar" data-buybar hidden>
  <div><b>${esc(model(p.title))}</b><span>${money(p.price)}</span></div>
  <button class="btn" type="button" data-buybar-add ${anyAvail ? '' : 'disabled'}>${anyAvail ? 'В корзину' : 'Нет в наличии'}</button>
</div>
${others.length ? rail({ title: 'Вам может понравиться', items: others.map(card).join(''), link: '/catalog' }) : ''}
<section class="shop shop--center" data-recent hidden>
  <div class="shop__head"><h2>Вы недавно смотрели</h2></div>
  <div class="pgrid" data-recent-list></div>
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
  ${results.length ? `<div class="pgrid">${results.map(card).join('')}</div>`
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

      ${tab === 'favs' ? (favItems.length ? `<div class="pgrid pgrid--3">${favItems.map(card).join('')}</div>`
        : `<div class="empty-state"><p>В избранном пусто. Нажмите на сердечко на карточке товара.</p><a class="btn" href="/catalog">Перейти в каталог</a></div>`) : ''}
    </div>
  </div>
</section>`;
  return layout({ user, title: `Личный кабинет | ${BRAND}`, body, bodyClass: 'page-acct' });
}
