// script.js

// Селекторы из твоего HTML
const siteTitleEl = document.getElementById('main-title');
const greetingEl = document.getElementById('greeting');
const btnCatalog = document.getElementById('btn-catalog');
const btnTerms = document.getElementById('btn-terms');
const catalogTextEl = document.getElementById('catalog-text');
const termsTextEl = document.getElementById('terms-text');
const postsContainer = document.getElementById('posts-container');

let data = null;

async function fetchData() {
  try {
    const res = await fetch('/api/data', { credentials: 'include' });
    const text = await res.text();

    console.log('Ответ сервера /api/data:', text);

    // Если сервер вернул HTML (например, страницу логина), предупреждаем
    if (text.trim().startsWith('<')) {
      alert('Ошибка: сервер вернул HTML вместо JSON. Возможно, нужна авторизация.');
      return;
    }

    const json = JSON.parse(text);
    data = json;

    // Вставляем настройки в DOM
    if (siteTitleEl) siteTitleEl.textContent = data.settings?.siteTitle || 'Магазин аккаунтов';
    if (greetingEl) greetingEl.textContent = data.settings?.greeting?.ru || '';
    if (btnCatalog) btnCatalog.textContent = data.settings?.btnCatalogText || 'Каталог аккаунтов';
    if (btnTerms) btnTerms.textContent = data.settings?.btnTermsText || 'Условия возврата';
    if (catalogTextEl) {
      catalogTextEl.innerHTML = data.settings?.catalogText || '';
      catalogTextEl.style.display = 'none';
    }
    if (termsTextEl) {
      termsTextEl.innerHTML = data.settings?.termsText || '';
      termsTextEl.style.display = 'none';
    }

    renderPosts(data.posts);
  } catch (err) {
    console.error('Ошибка загрузки данных:', err);
  }
}

function renderPosts(posts) {
  postsContainer.innerHTML = '';

  if (!posts || posts.length === 0) {
    postsContainer.innerHTML = '<p>Пока нет аккаунтов.</p>';
    return;
  }

  posts.forEach(post => {
    const postEl = document.createElement('div');
    postEl.className = 'post';

    // Формируем корректный src для картинки (если base64 без префикса)
    let imgSrc = '';
    if (post.image) {
      imgSrc = post.image.startsWith('data:')
        ? post.image
        : 'data:image/png;base64,' + post.image;
      console.log('Используемый src картинки:', imgSrc.substring(0, 30)); // для отладки
    }

    const imgHtml = imgSrc
      ? `<img src="${imgSrc}" alt="${escapeHtml(post.title)}" style="max-width:100%; height:auto; border-radius:8px; margin-bottom:10px;">`
      : '';

    postEl.innerHTML = `
      ${imgHtml}
      <h3>${escapeHtml(post.title)}</h3>
      <p>${escapeHtml(post.description)}</p>
      <div class="price">${escapeHtml(post.price)}</div>
      <a href="https://t.me/${post.link.replace(/^@/, '')}" target="_blank" rel="noopener noreferrer" class="buy-btn">BUY</a>
    `;

    postsContainer.appendChild(postEl);
  });
}

function escapeHtml(text) {
  if (!text) return '';
  return text.replace(/[&<>"']/g, m => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#39;'
  }[m]));
}

// Кнопки показа текста
btnCatalog.addEventListener('click', () => {
  if (!catalogTextEl || !termsTextEl) return;
  catalogTextEl.style.display = catalogTextEl.style.display === 'none' ? 'block' : 'none';
  termsTextEl.style.display = 'none';
});

btnTerms.addEventListener('click', () => {
  if (!termsTextEl || !catalogTextEl) return;
  termsTextEl.style.display = termsTextEl.style.display === 'none' ? 'block' : 'none';
  catalogTextEl.style.display = 'none';
});

// Запускаем загрузку данных после загрузки DOM
document.addEventListener('DOMContentLoaded', fetchData);
