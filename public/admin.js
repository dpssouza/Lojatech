
'use strict';

const loginSection = document.getElementById('loginSection');
const adminSection = document.getElementById('adminSection');
const loginForm = document.getElementById('loginForm');
const loginMessage = document.getElementById('loginMessage');
const logoutButton = document.getElementById('logoutButton');
const productForm = document.getElementById('productForm');
const productList = document.getElementById('productList');
const productId = document.getElementById('productId');
const productMessage = document.getElementById('productMessage');
const cancelEditButton = document.getElementById('cancelEdit');

let csrfToken = '';
let products = [];

async function api(url, options = {}) {
  const method = (options.method || 'GET').toUpperCase();
  const headers = { ...(options.headers || {}) };

  if (options.body) {
    headers['Content-Type'] = 'application/json';
  }

  if (!['GET', 'HEAD', 'OPTIONS'].includes(method)) {
    if (!csrfToken) {
      throw new Error('Token de segurança ausente. Atualize a página.');
    }

    headers['X-CSRF-Token'] = csrfToken;
  }

  const response = await fetch(url, {
    ...options,
    method,
    headers,
    credentials: 'same-origin',
    cache: 'no-store'
  });

  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    if (response.status === 401 && url !== '/api/admin/login') {
      showLogin('Sua sessão expirou. Entre novamente.');
    }

    throw new Error(
      data.error || `Falha na requisição (HTTP ${response.status}).`
    );
  }

  return data;
}

async function refreshCsrf() {
  const response = await fetch('/api/admin/csrf', {
    credentials: 'same-origin',
    cache: 'no-store'
  });

  if (!response.ok) {
    throw new Error(`Falha ao obter token de segurança (HTTP ${response.status}).`);
  }

  const data = await response.json();

  if (typeof data.csrfToken !== 'string' || !data.csrfToken) {
    throw new Error('O servidor não retornou o token de segurança.');
  }

  csrfToken = data.csrfToken;
}

function showLogin(message = '') {
  loginSection.classList.remove('hidden');
  adminSection.classList.add('hidden');

  loginSection.hidden = false;
  adminSection.hidden = true;

  loginMessage.textContent = message;
}

function showAdmin() {
  loginSection.classList.add('hidden');
  adminSection.classList.remove('hidden');

  loginSection.hidden = true;
  adminSection.hidden = false;

  loginMessage.textContent = '';
}


loginForm.addEventListener('submit', async (event) => {
  event.preventDefault();

  const username = document.getElementById('username').value.trim();
  const password = document.getElementById('password').value;
  const button = loginForm.querySelector('button[type="submit"]');

  button.disabled = true;
  loginMessage.textContent = 'Verificando credenciais...';

  try {
    await refreshCsrf();

    const data = await api('/api/admin/login', {
      method: 'POST',
      body: JSON.stringify({ username, password })
    });

    csrfToken = data.csrfToken;
    loginForm.reset();
    showAdmin();
    await loadProducts();
  } catch (error) {
    loginMessage.textContent = error.message;
  } finally {
    button.disabled = false;
  }
});

async function loadProducts() {
  try {
    products = await api('/api/admin/products');
    renderProducts();
    updateDashboardStats();
    productMessage.textContent = '';
  } catch (error) {
    productMessage.textContent = error.message;
    throw error;
  }
}

function updateDashboardStats() {
  const total = products.length;
  const active = products.filter((product) => Boolean(product.active)).length;
  const lowStock = products.filter((product) => Number(product.stock) <= 5).length;

  const totalElement = document.getElementById('totalProducts');
  const activeElement = document.getElementById('activeProducts');
  const lowStockElement = document.getElementById('lowStockProducts');

  if (totalElement) totalElement.textContent = String(total);
  if (activeElement) activeElement.textContent = String(active);
  if (lowStockElement) lowStockElement.textContent = String(lowStock);
}

function renderProducts() {
  productList.replaceChildren();

  if (products.length === 0) {
    const message = document.createElement('p');
    message.textContent = 'Nenhum produto cadastrado.';
    productList.appendChild(message);
    return;
  }

  const table = document.createElement('table');
  const header = table.createTHead().insertRow();

  ['ID', 'Produto', 'Preço', 'Estoque', 'Status', 'Ações'].forEach((label) => {
    const cell = document.createElement('th');
    cell.textContent = label;
    header.appendChild(cell);
  });

  const body = table.createTBody();

  products.forEach((product) => {
    const row = body.insertRow();

    [
      product.id,
      product.name,
      Number(product.price).toLocaleString('pt-BR', {
        style: 'currency',
        currency: 'BRL'
      }),
      product.stock,
      product.active ? 'Ativo' : 'Inativo'
    ].forEach((value) => {
      const cell = row.insertCell();
      cell.textContent = String(value);
    });

    const actions = row.insertCell();

    const editButton = document.createElement('button');
    editButton.type = 'button';
    editButton.textContent = 'Editar';
    editButton.addEventListener('click', () => editProduct(product));
    actions.appendChild(editButton);

    const statusButton = document.createElement('button');
    statusButton.type = 'button';
    statusButton.textContent = product.active ? 'Desativar' : 'Ativar';
    statusButton.addEventListener('click', () => toggleProduct(product));
    actions.appendChild(statusButton);
  });

  productList.appendChild(table);
}

function editProduct(product) {
  productId.value = product.id;
  document.getElementById('productName').value = product.name;
  document.getElementById('productDescription').value = product.description;
  document.getElementById('productPrice').value = Number(product.price);
  document.getElementById('productImage').value = product.image_url || '';
  document.getElementById('productImages').value = (Array.isArray(product.image_urls) ? product.image_urls : []).join('\n');
  document.getElementById('productStock').value = product.stock;
  document.getElementById('productActive').checked = product.active;

  productForm.querySelector('button[type="submit"]').textContent =
    'Atualizar produto';

  productMessage.textContent = '';
  productForm.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

productForm.addEventListener('submit', async (event) => {
  event.preventDefault();

  const id = productId.value;

  const product = {
    name: document.getElementById('productName').value.trim(),
    description: document.getElementById('productDescription').value.trim(),
    price: Number(document.getElementById('productPrice').value),
    image_url: document.getElementById('productImage').value.trim(),
    image_urls: document.getElementById('productImages').value
  .split(/\r?\n/)
  .map(value => value.trim())
  .filter(Boolean),
    stock: Number(document.getElementById('productStock').value),
    active: document.getElementById('productActive').checked
  };

  const button = productForm.querySelector('button[type="submit"]');
  button.disabled = true;
  productMessage.textContent = 'Salvando produto...';

  try {
    await api(
      id
        ? `/api/admin/products/${encodeURIComponent(id)}`
        : '/api/admin/products',
      {
        method: id ? 'PUT' : 'POST',
        body: JSON.stringify(product)
      }
    );

    resetProductForm();
    await loadProducts();
    productMessage.textContent = 'Produto salvo com sucesso!';
  } catch (error) {
    productMessage.textContent = error.message;
  } finally {
    button.disabled = false;
  }
});

async function toggleProduct(product) {
  const active = !product.active;

  if (!confirm(
    `Deseja ${active ? 'ativar' : 'desativar'} o produto "${product.name}"?`
  )) {
    return;
  }

  try {
    await api(`/api/admin/products/${encodeURIComponent(product.id)}`, {
      method: 'PUT',
      body: JSON.stringify({
        name: product.name,
        description: product.description,
        price: Number(product.price),
        image_url: product.image_url || null,
        image_urls: Array.isArray(product.image_urls) ? product.image_urls : [],
        stock: Number(product.stock),
        active
      })
    });

    await loadProducts();
  } catch (error) {
    alert(error.message);
  }
}

function resetProductForm() {
  productForm.reset();
  productId.value = '';
  document.getElementById('productActive').checked = true;
  productForm.querySelector('button[type="submit"]').textContent =
    'Salvar produto';
  productMessage.textContent = '';
}

cancelEditButton.addEventListener('click', resetProductForm);

logoutButton.addEventListener('click', async () => {
  logoutButton.disabled = true;

  try {
    await api('/api/admin/logout', { method: 'POST' });
    showLogin('Você saiu do painel.');
    await refreshCsrf();
  } catch (error) {
    loginMessage.textContent = error.message;
  } finally {
    logoutButton.disabled = false;
  }
});

async function initializeAdmin() {
  showLogin();

  try {
    await refreshCsrf();

    const response = await fetch('/api/admin/me', {
      credentials: 'same-origin',
      cache: 'no-store'
    });

    if (!response.ok) {
      throw new Error(`Falha ao verificar sessão (HTTP ${response.status}).`);
    }

    const data = await response.json();

    if (data.authenticated) {
      showAdmin();
      await loadProducts();
    }
  } catch (error) {
    showLogin(error.message);
  }
}

initializeAdmin();