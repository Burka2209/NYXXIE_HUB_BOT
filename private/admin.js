const DATA_URL = "/api/data";
const SETTINGS_URL = "/api/settings";
const POSTS_URL = "/api/posts";

let data = null;

const titleInput = document.getElementById("site-title");
const greetingInput = document.getElementById("greeting-ru");
const btnCatalogInput = document.getElementById("btn-catalog-text");
const btnTermsInput = document.getElementById("btn-terms-text");
const catalogTextInput = document.getElementById("catalog-text-input");
const termsTextInput = document.getElementById("terms-text-input");

const postForm = document.getElementById("post-form");
const postIdInput = document.getElementById("post-id");
const postTitleInput = document.getElementById("post-title");
const postPriceInput = document.getElementById("post-price");
const postDescriptionInput = document.getElementById("post-description");
const postLinkInput = document.getElementById("post-link");

const postImageInput = document.getElementById("post-image");
const postImagePreview = document.getElementById("post-image-preview");

const postListDiv = document.getElementById("post-list");
const settingsForm = document.getElementById("settings-form");

const credentialsForm = document.getElementById("credentials-form");
const loginInput = document.getElementById("admin-login");
const passwordInput = document.getElementById("admin-password");

let postImageBase64 = "";

postImageInput.addEventListener("change", () => {
  const file = postImageInput.files[0];
  if (!file) {
    postImageBase64 = "";
    postImagePreview.innerHTML = "";
    return;
  }
  const reader = new FileReader();
  reader.onload = () => {
    postImageBase64 = reader.result;
    postImagePreview.innerHTML = `<img src="${postImageBase64}" style="max-width: 100%; border-radius: 8px;" alt="Превью фото" />`;
  };
  reader.readAsDataURL(file);
});

function fetchData() {
  fetch(DATA_URL)
    .then(res => res.json())
    .then(json => {
      data = json;
      fillSettingsForm();
      renderPostList();
    })
    .catch(err => {
      alert("Ошибка загрузки данных.");
      console.error(err);
    });
}

function fillSettingsForm() {
  const s = data.settings || {};
  titleInput.value = s.siteTitle || "";
  greetingInput.value = s.greeting?.ru || "";
  btnCatalogInput.value = s.btnCatalogText || "";
  btnTermsInput.value = s.btnTermsText || "";
  catalogTextInput.value = s.catalogText || "";
  termsTextInput.value = s.termsText || "";

  // Подставляем текущие логин/пароль в поля для смены
  loginInput.value = s.auth?.login || "";
  passwordInput.value = s.auth?.password || "";
}

function renderPostList() {
  postListDiv.innerHTML = "";
  if (!data.posts || data.posts.length === 0) {
    postListDiv.innerHTML = "<p>Пока нет аккаунтов.</p>";
    return;
  }

  data.posts.forEach(post => {
    const div = document.createElement("div");
    div.className = "post admin-post";

    div.innerHTML = `
      ${post.image ? `<img src="${post.image}" alt="${escapeHtml(post.title)}" style="max-width: 100%; border-radius: 8px; margin-bottom:10px;" />` : ""}
      <strong>${escapeHtml(post.title)}</strong> — ${escapeHtml(post.price)}<br/>
      <button data-id="${post.id}" class="edit-post-btn">Редактировать</button>
      <button data-id="${post.id}" class="delete-post-btn">Удалить</button>
    `;

    postListDiv.appendChild(div);
  });

  document.querySelectorAll(".edit-post-btn").forEach(btn => {
    btn.onclick = () => {
      const id = btn.getAttribute("data-id");
      editPost(id);
    };
  });

  document.querySelectorAll(".delete-post-btn").forEach(btn => {
    btn.onclick = () => {
      const id = btn.getAttribute("data-id");
      if (confirm("Удалить этот аккаунт?")) {
        deletePost(id);
      }
    };
  });
}

function editPost(id) {
  const post = data.posts.find(p => p.id === id);
  if (!post) return alert("Пост не найден");

  postIdInput.value = post.id;
  postTitleInput.value = post.title;
  postPriceInput.value = post.price;
  postDescriptionInput.value = post.description;
  postLinkInput.value = post.link;

  if (post.image) {
    postImageBase64 = post.image;
    postImagePreview.innerHTML = `<img src="${post.image}" style="max-width: 100%; border-radius: 8px;" alt="Превью фото" />`;
  } else {
    postImageBase64 = "";
    postImagePreview.innerHTML = "";
  }
  postImageInput.value = "";
}

function clearPostForm() {
  postIdInput.value = "";
  postTitleInput.value = "";
  postPriceInput.value = "";
  postDescriptionInput.value = "";
  postLinkInput.value = "";
  postImageInput.value = "";
  postImageBase64 = "";
  postImagePreview.innerHTML = "";
}

postForm.addEventListener("submit", e => {
  e.preventDefault();

  const newPost = {
    title: postTitleInput.value.trim(),
    price: postPriceInput.value.trim(),
    description: postDescriptionInput.value.trim(),
    link: postLinkInput.value.trim(),
    image: postImageBase64
  };

  if (!newPost.title) {
    alert("Введите название аккаунта");
    return;
  }

  const id = postIdInput.value;

  if (id) {
    fetch(`${POSTS_URL}/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(newPost),
    })
      .then(res => res.json())
      .then(resJson => {
        if (resJson.success) {
          alert("Аккаунт обновлён");
          fetchData();
          clearPostForm();
        } else {
          alert("Ошибка обновления аккаунта");
        }
      })
      .catch(() => alert("Ошибка при обновлении аккаунта"));
  } else {
    fetch(POSTS_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(newPost),
    })
      .then(res => res.json())
      .then(resJson => {
        if (resJson.success) {
          alert("Аккаунт добавлен");
          fetchData();
          clearPostForm();
        } else {
          alert("Ошибка добавления аккаунта");
        }
      })
      .catch(() => alert("Ошибка при добавлении аккаунта"));
  }
});

document.getElementById("post-clear").onclick = clearPostForm;

settingsForm.addEventListener("submit", e => {
  e.preventDefault();

  // Собираем все настройки, кроме логина/пароля
  const newSettings = {
    siteTitle: titleInput.value.trim(),
    greeting: { ru: greetingInput.value.trim() },
    btnCatalogText: btnCatalogInput.value.trim(),
    btnTermsText: btnTermsInput.value.trim(),
    catalogText: catalogTextInput.value.trim(),
    termsText: termsTextInput.value.trim(),
  };

  // Отправляем настройки (без auth)
  fetch(SETTINGS_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(newSettings),
  })
    .then(res => res.json())
    .then(resJson => {
      if (resJson.success) {
        alert("Настройки сохранены");
        fetchData();
      } else {
        alert("Ошибка сохранения настроек");
      }
    })
    .catch(() => alert("Ошибка при сохранении настроек"));
});

// Обработка смены логина и пароля — отправляем все настройки, включая auth
credentialsForm.addEventListener("submit", (e) => {
  e.preventDefault();

  const newLogin = loginInput.value.trim();
  const newPassword = passwordInput.value.trim();

  if (!newLogin || !newPassword) {
    alert("Введите логин и пароль");
    return;
  }

  const updatedSettings = {
    siteTitle: titleInput.value.trim(),
    greeting: { ru: greetingInput.value.trim() },
    btnCatalogText: btnCatalogInput.value.trim(),
    btnTermsText: btnTermsInput.value.trim(),
    catalogText: catalogTextInput.value.trim(),
    termsText: termsTextInput.value.trim(),
    auth: {
      login: newLogin,
      password: newPassword
    }
  };

  fetch(SETTINGS_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(updatedSettings),
  })
    .then(res => res.json())
    .then(resJson => {
      if (resJson.success) {
        alert("Логин и пароль обновлены. Пожалуйста, войдите заново.");
        loginInput.value = "";
        passwordInput.value = "";

        // Выйти из сессии и перенаправить на страницу логина
        fetch('/logout', { method: 'POST' }).finally(() => {
          window.location.href = '/login.html';
        });
      } else {
        alert("Ошибка обновления логина/пароля");
      }
    })
    .catch(() => alert("Ошибка соединения с сервером"));
});

function deletePost(id) {
  fetch(`${POSTS_URL}/${id}`, {
    method: "DELETE",
  })
    .then(res => res.json())
    .then(resJson => {
      if (resJson.success) {
        alert("Аккаунт удалён");
        fetchData();
        clearPostForm();
      } else {
        alert("Ошибка удаления аккаунта");
      }
    })
    .catch(() => alert("Ошибка при удалении аккаунта"));
}

function escapeHtml(text) {
  if (!text) return "";
  return text.replace(/[&<>"']/g, function (m) {
    return {
      '&': "&amp;",
      '<': "&lt;",
      '>': "&gt;",
      '"': "&quot;",
      "'": "&#39;"
    }[m];
  });
}

fetchData();
