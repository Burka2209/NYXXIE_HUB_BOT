// script.js

// Селекторы
const siteTitleEl = document.getElementById('site-title');
const greetingEl = document.getElementById('greeting');
const btnCatalog = document.getElementById('btn-catalog');
const btnTerms = document.getElementById('btn-terms');
const catalogTextEl = document.getElementById('catalog-text');
const termsTextEl = document.getElementById('terms-text');
const postsContainer = document.getElementById('posts-container');

let data = null;

// Загрузка данных с сервера
async function fetchData() {
  try {
    const res = await fetch('/api/data');
    data = await res.json();

    // Настройки
    siteTitleEl.textContent = data.settings.siteTitle || 'Магазин аккаунтов';
    greetingEl.textContent = data.settings.greeting?.ru || '';
    btnCatalog.textContent = data.settings.btnCatalogText || 'Каталог аккаунтов';
    btnTerms.textContent = data.settings.btnTermsText || 'Условия возврата';
    catalogTextEl.innerHTML = data.settings.catalogText || '';
    termsTextEl.innerHTML = data.settings.termsText || '';
    catalogTextEl.style.display = 'none';
    termsTextEl.style.display = 'none';

    renderPosts();
  } catch (err) {
    console.error('Ошибка загрузки данных:', err);
  }
}

// Рендер постов
function renderPosts() {
  postsContainer.innerHTML = '';
  if (!data.posts || data.posts.length === 0) {
    postsContainer.innerHTML = '<p>Пока нет аккаунтов.</p>';
    return;
  }

  data.posts.forEach(post => {
    const postEl = document.createElement('div');
    postEl.className = 'post';

    const imgHtml = post.image 
      ? `<img src="${post.image}" alt="${escapeHtml(post.title)}" style="max-width:100%; height:auto; border-radius:8px; margin-bottom:10px;">`
      : '';

    postEl.innerHTML = `
      ${imgHtml}
      <h3>${escapeHtml(post.title)}</h3>
      <p>${escapeHtml(post.description)}</p>
      <div class="price">${escapeHtml(post.price)}</div>
      <a href="https://t.me/${post.link.replace(/^@/, '')}" target="_blank" class="buy-btn">BUY</a>
    `;

    postsContainer.appendChild(postEl);
  });
}

// Защита от XSS
function escapeHtml(text) {
  if (!text) return '';
  return text.replace(/[&<>"']/g, m => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
  }[m]));
}

// Кнопки
btnCatalog.addEventListener('click', () => {
  catalogTextEl.style.display = catalogTextEl.style.display === 'none' ? 'block' : 'none';
  termsTextEl.style.display = 'none';
});
btnTerms.addEventListener('click', () => {
  termsTextEl.style.display = termsTextEl.style.display === 'none' ? 'block' : 'none';
  catalogTextEl.style.display = 'none';
});

// Старт
fetchData();
