
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
const productsTab = document.getElementById('productsTab');
const ordersTab = document.getElementById('ordersTab');
const productManagement = document.getElementById('productManagement');
const orderManagement = document.getElementById('orderManagement');
const ordersList = document.getElementById('ordersList');
const ordersMessage = document.getElementById('ordersMessage');
const orderDetails = document.getElementById('orderDetails');
const orderStatusFilter = document.getElementById('orderStatusFilter');
let orders = [];
const orderStatusLabels = {
  pending: 'Pendente', processing: 'Em preparação', shipped: 'Enviado',
  delivered: 'Entregue', cancelled: 'Cancelado'
};
const currency = (value) => Number(value).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
const dateTime = (value) => new Date(value).toLocaleString('pt-BR');

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

function showAdminTab(tab) {
  const showOrders = tab === 'orders';
  productManagement.classList.toggle('hidden', showOrders);
  orderManagement.classList.toggle('hidden', !showOrders);
  productsTab.classList.toggle('active', !showOrders);
  ordersTab.classList.toggle('active', showOrders);
  productsTab.setAttribute('aria-pressed', String(!showOrders));
  ordersTab.setAttribute('aria-pressed', String(showOrders));
  if (showOrders) loadOrders();
}

productsTab.addEventListener('click', () => showAdminTab('products'));
ordersTab.addEventListener('click', () => showAdminTab('orders'));
document.getElementById('refreshOrdersButton').addEventListener('click', loadOrders);
orderStatusFilter.addEventListener('change', renderOrders);


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
    await loadOrders();
  } catch (error) {
    loginMessage.textContent = error.message;
  } finally {
    button.disabled = false;
  }
});

async function loadOrders() {
  ordersMessage.textContent = 'Carregando pedidos...';
  try {
    orders = await api('/api/admin/orders');
    renderOrders();
    document.getElementById('totalOrders').textContent = String(orders.length);
    document.getElementById('pendingOrders').textContent = String(orders.filter(o => o.status === 'pending').length);
    document.getElementById('activeOrders').textContent = String(orders.filter(o => ['processing', 'shipped'].includes(o.status)).length);
    ordersMessage.textContent = orders.length ? '' : 'Ainda não há pedidos registrados.';
  } catch (error) {
    ordersMessage.textContent = error.message;
  }
}

function renderOrders() {
  ordersList.replaceChildren();
  const filter = orderStatusFilter.value;
  const visibleOrders = orders.filter(order => filter === 'all' || order.status === filter);
  if (!visibleOrders.length) {
    const empty = document.createElement('p');
    empty.className = 'empty-state';
    empty.textContent = 'Nenhum pedido encontrado para este filtro.';
    ordersList.appendChild(empty);
    return;
  }
  const table = document.createElement('table');
  const head = table.createTHead().insertRow();
  ['Pedido', 'Data', 'Cliente', 'Itens', 'Total', 'Status', 'Ações'].forEach(label => {
    const th = document.createElement('th'); th.textContent = label; head.appendChild(th);
  });
  const body = table.createTBody();
  visibleOrders.forEach(order => {
    const row = body.insertRow();
    [`#${order.id}`, dateTime(order.created_at), order.customer_name, order.item_count, currency(order.total)].forEach(value => {
      const cell = row.insertCell(); cell.textContent = String(value);
    });
    const statusCell = row.insertCell();
    const badge = document.createElement('span');
    badge.className = `status-badge status-${order.status}`;
    badge.textContent = orderStatusLabels[order.status] || order.status;
    statusCell.appendChild(badge);
    const actions = row.insertCell();
    const detailButton = document.createElement('button');
    detailButton.type = 'button'; detailButton.textContent = 'Detalhes';
    detailButton.addEventListener('click', () => loadOrderDetails(order.id));
    actions.appendChild(detailButton);
    if (!['delivered', 'cancelled'].includes(order.status)) {
      const select = document.createElement('select');
      select.className = 'inline-status-select';
      select.setAttribute('aria-label', `Atualizar status do pedido ${order.id}`);
      Object.entries(orderStatusLabels).forEach(([value, label]) => {
        const option = document.createElement('option'); option.value = value; option.textContent = label;
        option.selected = value === order.status; select.appendChild(option);
      });
      select.addEventListener('change', () => updateOrderStatus(order, select.value));
      actions.appendChild(select);
    }
  });
  ordersList.appendChild(table);
}

async function loadOrderDetails(id) {
  orderDetails.classList.remove('hidden');
  orderDetails.replaceChildren();
  const loading = document.createElement('p'); loading.textContent = `Carregando pedido #${id}...`;
  orderDetails.appendChild(loading);
  try {
    const order = await api(`/api/admin/orders/${encodeURIComponent(id)}`);
    orderDetails.replaceChildren();
    const heading = document.createElement('h2'); heading.textContent = `Detalhes do pedido #${order.id}`;
    orderDetails.appendChild(heading);
    const customer = document.createElement('p'); customer.textContent = `Cliente: ${order.customer_name} · E-mail: ${order.customer_email}`;
    orderDetails.appendChild(customer);
    const created = document.createElement('p'); created.textContent = `Data: ${dateTime(order.created_at)} · Status: ${orderStatusLabels[order.status] || order.status}`;
    orderDetails.appendChild(created);
    const table = document.createElement('table');
    const head = table.createTHead().insertRow();
    ['Produto', 'Quantidade', 'Preço unitário', 'Subtotal'].forEach(label => { const th = document.createElement('th'); th.textContent = label; head.appendChild(th); });
    const body = table.createTBody();
    order.items.forEach(item => {
      const row = body.insertRow();
      [item.product_name, item.quantity, currency(item.unit_price), currency(item.subtotal)].forEach(value => { const cell = row.insertCell(); cell.textContent = String(value); });
    });
    orderDetails.appendChild(table);
    const total = document.createElement('p'); total.className = 'order-total'; total.textContent = `Total do pedido: ${currency(order.total)}`;
    orderDetails.appendChild(total);
    const close = document.createElement('button'); close.type = 'button'; close.textContent = 'Fechar detalhes'; close.addEventListener('click', () => orderDetails.classList.add('hidden'));
    orderDetails.appendChild(close);
    orderDetails.scrollIntoView({ behavior: 'smooth', block: 'start' });
  } catch (error) {
    orderDetails.replaceChildren(); const message = document.createElement('p'); message.textContent = error.message; orderDetails.appendChild(message);
  }
}

function showAdminDialog({
  title = 'Confirmar ação',
  message = '',
  confirmText = 'Confirmar',
  cancelText = 'Cancelar',
  danger = false,
  alertOnly = false
} = {}) {
  return new Promise((resolve) => {
    const overlay = document.createElement('div');
    overlay.className = 'admin-dialog-overlay';
    overlay.setAttribute('role', 'presentation');

    const dialog = document.createElement('section');
    dialog.className = 'admin-dialog';
    dialog.setAttribute('role', 'alertdialog');
    dialog.setAttribute('aria-modal', 'true');
    dialog.setAttribute('aria-labelledby', 'adminDialogTitle');
    dialog.setAttribute('aria-describedby', 'adminDialogMessage');

    const icon = document.createElement('div');
    icon.className = `admin-dialog-icon${danger ? ' is-danger' : ''}`;
    icon.setAttribute('aria-hidden', 'true');
    icon.textContent = danger ? '!' : (alertOnly ? 'i' : '?');

    const heading = document.createElement('h2');
    heading.id = 'adminDialogTitle';
    heading.textContent = title;

    const text = document.createElement('p');
    text.id = 'adminDialogMessage';
    text.textContent = message;

    const actions = document.createElement('div');
    actions.className = 'admin-dialog-actions';

    const cancel = document.createElement('button');
    cancel.type = 'button';
    cancel.className = 'admin-dialog-cancel';
    cancel.textContent = cancelText;

    const confirm = document.createElement('button');
    confirm.type = 'button';
    confirm.className = `admin-dialog-confirm${danger ? ' is-danger' : ''}`;
    confirm.textContent = alertOnly ? 'Entendi' : confirmText;

    const finish = (result) => {
      document.removeEventListener('keydown', onKeydown);
      overlay.remove();
      resolve(result);
    };
    const onKeydown = (event) => {
      if (event.key === 'Escape' && !alertOnly) finish(false);
      if (event.key === 'Escape' && alertOnly) finish(true);
      if (event.key === 'Enter') finish(alertOnly ? true : document.activeElement === confirm);
    };

    if (!alertOnly) {
      cancel.addEventListener('click', () => finish(false));
      actions.appendChild(cancel);
    }
    confirm.addEventListener('click', () => finish(true));
    actions.appendChild(confirm);
    dialog.append(icon, heading, text, actions);
    overlay.appendChild(dialog);
    overlay.addEventListener('click', (event) => {
      if (event.target === overlay && !alertOnly) finish(false);
    });
    document.addEventListener('keydown', onKeydown);
    document.body.appendChild(overlay);
    confirm.focus();
  });
}

function confirmAdminAction(message, options = {}) {
  return showAdminDialog({
    title: options.title || 'Confirmar ação',
    message,
    confirmText: options.confirmText || 'Confirmar',
    cancelText: options.cancelText || 'Cancelar',
    danger: Boolean(options.danger)
  });
}

function showAdminAlert(message, title = 'Não foi possível concluir') {
  return showAdminDialog({ title, message, alertOnly: true, danger: true });
}

async function updateOrderStatus(order, status) {
  if (status === 'cancelled' && !(await confirmAdminAction(`Deseja cancelar o pedido #${order.id}? O estoque dos itens será devolvido automaticamente.`, { title: 'Cancelar pedido', confirmText: 'Sim, cancelar', danger: true }))) {
    renderOrders(); return;
  }
  try {
    await api(`/api/admin/orders/${encodeURIComponent(order.id)}/status`, {
      method: 'PATCH', body: JSON.stringify({ status })
    });
    await loadOrders();
    ordersMessage.textContent = `Pedido #${order.id} atualizado para: ${orderStatusLabels[status]}.`;
    if (!orderDetails.classList.contains('hidden')) await loadOrderDetails(order.id);
    await loadProducts();
  } catch (error) {
    ordersMessage.textContent = error.message;
    await loadOrders();
  }
}

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

  if (!(await confirmAdminAction(
    `Deseja ${active ? 'ativar' : 'desativar'} o produto "${product.name}"?`,
    { title: active ? 'Ativar produto' : 'Desativar produto', confirmText: active ? 'Sim, ativar' : 'Sim, desativar', danger: !active }
  ))) {
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
    await showAdminAlert(error.message);
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
      await loadOrders();
    }
  } catch (error) {
    showLogin(error.message);
  }
}

initializeAdmin();