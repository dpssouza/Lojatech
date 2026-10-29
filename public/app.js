const money = value => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(Number(value));
const grid = document.querySelector('#product-grid');
const status = document.querySelector('#product-status');
const panel = document.querySelector('#cart-panel');
const cartItemsEl = document.querySelector('#cart-items');
const cartCount = document.querySelector('#cart-count');
const cartTotal = document.querySelector('#cart-total');
const checkoutAccount = document.querySelector('.checkout-account');
const checkoutFormElement = document.querySelector('#checkout-form');
const checkoutMessage = document.querySelector('#checkout-message');
let products = [];
function readCart() {
  try {
    const saved = JSON.parse(
      localStorage.getItem('lojatech-cart') || '[]'
    );

    return new Map(
      Array.isArray(saved)
        ? saved
            .filter(item =>
              Array.isArray(item) &&
              item.length === 2 &&
              Number.isInteger(Number(item[0])) &&
              Number.isInteger(Number(item[1])) &&
              Number(item[1]) > 0
            )
            .map(([id, quantity]) => [
              Number(id),
              Number(quantity)
            ])
        : []
    );
  } catch {
    return new Map();
  }
}

const cart = readCart();

function saveCart() {
  localStorage.setItem(
    'lojatech-cart',
    JSON.stringify([...cart.entries()])
  );
}

async function loadProducts() {
  try {
    const response = await fetch('/api/products');
    if (!response.ok) throw new Error('Falha ao consultar a API');
  products = await response.json();
  renderProducts();
  renderCart();
status.textContent = `${products.length} produtos disponíveis`;
  } catch (error) {
    status.textContent = 'Não foi possível carregar os produtos.';
    grid.innerHTML = '<p>Verifique se a aplicação e o banco de dados estão em execução.</p>';
  }
}

function renderProducts() {
  const fallbackImage = '/images/products/produto-generico-01.svg';

  grid.innerHTML = products.map(product => {
    const gallery = Array.isArray(product.image_urls)
      ? product.image_urls
      : [];

    const imageUrl = gallery.find(url =>
      typeof url === 'string' && url.startsWith('/images/products/')
    ) || (
      typeof product.image_url === 'string' &&
      product.image_url.startsWith('/images/products/')
        ? product.image_url
        : fallbackImage
    );

    const productLink = `/produto.html?id=${encodeURIComponent(product.id)}`;

    return `
      <article class="product-card">
        <a class="product-card-link" href="${productLink}" aria-label="Ver detalhes de ${escapeHtml(product.name)}">
          <img class="product-image" src="${escapeHtml(imageUrl)}" alt="${escapeHtml(product.name)}" loading="lazy">
        </a>
        <div class="product-info">
          <h3><a class="product-name-link" href="${productLink}">${escapeHtml(product.name)}</a></h3>
          <p>${escapeHtml(product.description || '')}</p>
          <div class="product-bottom">
            <span class="price">${money(product.price)}</span>
            <button class="add-button" data-add="${Number(product.id)}" ${Number(product.stock) < 1 ? 'disabled' : ''}>Adicionar +</button>
          </div>
          <div class="stock">${Number(product.stock)} em estoque</div>
        </div>
      </article>`;
  }).join('');

  grid.querySelectorAll('.product-image').forEach(image => {
    image.addEventListener('error', () => {
      if (!image.src.endsWith('/images/products/produto-generico-01.svg')) {
        image.src = '/images/products/produto-generico-01.svg';
      }
    });
  });

  grid.querySelectorAll('[data-add]').forEach(button => {
    button.addEventListener('click', () => addToCart(Number(button.dataset.add)));
  });
}

function escapeHtml(value) {
  return String(value).replace(/[&<>"']/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[char]));
}

function addToCart(id) {
  const product = products.find(item => Number(item.id) === id);
  if (!product) return;
  const current = cart.get(id) || 0;
  if (current >= Number(product.stock)) return;
  cart.set(id, current + 1);
  saveCart();
  renderCart();
}

function renderCart() {
  const entries = [...cart.entries()];
  const count = entries.reduce((sum, [, quantity]) => sum + quantity, 0);
  const total = entries.reduce((sum, [id, quantity]) => {
    const product = products.find(item => Number(item.id) === id);
    return sum + (product ? Number(product.price) * quantity : 0);
  }, 0);
  cartCount.textContent = count;
  cartTotal.textContent = money(total);
  const hasItems = entries.length > 0;
  checkoutAccount.hidden = !hasItems;
  checkoutFormElement.hidden = !hasItems;
  cartItemsEl.innerHTML = entries.length ? entries.map(([id, quantity]) => {
    const product = products.find(item => Number(item.id) === id);
    return product ? `<div class="cart-line"><div><strong>${escapeHtml(product.name)}</strong><br>${quantity} × ${money(product.price)}</div><button type="button" data-remove="${id}">Remover</button></div>` : '';
  }).join('') : '<p class="empty-cart">Seu carrinho está vazio. Adicione algum produto para continuar.</p>';
  cartItemsEl.querySelectorAll('[data-remove]').forEach(button =>
  button.addEventListener('click', () => {
    cart.delete(Number(button.dataset.remove));
    saveCart();
    renderCart();
  })
);
}

document.querySelector('#cart-toggle').addEventListener('click', () => { panel.hidden = false; });
document.querySelector('#cart-close').addEventListener('click', () => { panel.hidden = true; });
const params = new URLSearchParams(window.location.search);

if (params.get('abrirCarrinho') === '1') {
  panel.hidden = false;
}
let currentCustomer = null;
let customerCsrfToken = null;
const accountPanel = document.querySelector('#checkout-account-panel');
const accountMessage = document.querySelector('#account-checkout-message');
const accountStatus = document.querySelector('#checkout-account-status');
const guestFields = document.querySelector('#guest-checkout-fields');
const accountToggle = document.querySelector('#account-checkout-toggle');
const topAccountToggle = document.querySelector('#account-top-toggle');
const topLogoutButton = document.querySelector('#logout-top-button');

async function getCustomerCsrf() {
  const response = await fetch('/api/customer-auth/csrf', { credentials: 'same-origin', cache: 'no-store' });
  const result = await response.json().catch(() => ({}));
  if (!response.ok || !result.csrfToken) throw new Error(result.error || 'Não foi possível iniciar a autenticação.');
  customerCsrfToken = result.csrfToken;
  return customerCsrfToken;
}
function setAccountMode(mode) {
  const login = mode === 'login';
  document.querySelector('#checkout-login-form').hidden = !login;
  document.querySelector('#checkout-register-form').hidden = login;
  document.querySelector('#show-login').classList.toggle('active', login);
  document.querySelector('#show-register').classList.toggle('active', !login);
  accountMessage.textContent = '';
}
document.querySelector('#show-login').addEventListener('click', () => setAccountMode('login'));
document.querySelector('#show-register').addEventListener('click', () => setAccountMode('register'));
accountToggle.addEventListener('click', async () => {
  accountPanel.hidden = !accountPanel.hidden;
  if (!accountPanel.hidden) {
    setAccountMode('login');
    try { await getCustomerCsrf(); } catch (error) { accountMessage.textContent = error.message; }
  }
});
function setCustomer(customer) {
  currentCustomer = customer;
  accountPanel.hidden = true;
  accountToggle.hidden = true;
  accountStatus.hidden = false;
  accountStatus.textContent = `Compra vinculada à conta de ${customer.fullName} (${customer.email}).`;
  guestFields.hidden = true;
  document.querySelector('#customer-name').required = false;
  document.querySelector('#customer-email').required = false;
  topAccountToggle.textContent = 'Minha conta';
  topLogoutButton.hidden = false;
}

function setGuest() {
  currentCustomer = null;
  accountToggle.hidden = false;
  accountStatus.hidden = true;
  accountStatus.textContent = '';
  guestFields.hidden = false;
  document.querySelector('#customer-name').required = true;
  document.querySelector('#customer-email').required = true;
  topAccountToggle.textContent = 'Entrar / Criar conta';
  topLogoutButton.hidden = true;
}

const dashboard = document.querySelector('#customer-dashboard');
const dashboardOrdersList = document.querySelector('#dashboard-orders-list');
const dashboardOrdersMessage = document.querySelector('#dashboard-orders-message');
const dashboardProfileMessage = document.querySelector('#dashboard-profile-message');

function openCustomerDashboard(tab = 'orders') {
  if (!currentCustomer) return;
  dashboard.hidden = false;
  document.querySelector('#dashboard-customer-email').textContent = currentCustomer.email;
  document.querySelector('#dashboard-full-name').value = currentCustomer.fullName || '';
  document.querySelector('#dashboard-phone').value = currentCustomer.phone || '';
  setDashboardTab(tab);
  if (tab === 'orders') loadCustomerOrders();
}
function setDashboardTab(tab) {
  document.querySelectorAll('[data-dashboard-tab]').forEach(button => button.classList.toggle('active', button.dataset.dashboardTab === tab));
  document.querySelector('#dashboard-orders-section').hidden = tab !== 'orders';
  document.querySelector('#dashboard-profile-section').hidden = tab !== 'profile';
}
async function loadCustomerOrders() {
  dashboardOrdersMessage.textContent = 'Carregando seus pedidos...';
  dashboardOrdersList.replaceChildren();
  try {
    const response = await fetch('/api/customer/orders', { credentials: 'same-origin', cache: 'no-store' });
    const result = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(result.error || 'Não foi possível carregar seus pedidos.');
    if (!result.orders || !result.orders.length) {
      dashboardOrdersMessage.textContent = 'Você ainda não tem pedidos vinculados à sua conta.';
      return;
    }
    dashboardOrdersMessage.textContent = '';
    const statusNames = { pending: 'Aguardando processamento', processing: 'Em processamento', shipped: 'Enviado', delivered: 'Entregue', cancelled: 'Cancelado', paid: 'Pago', completed: 'Concluído' };
    result.orders.forEach(order => {
      const card = document.createElement('article');
      card.className = 'dashboard-order-card';
      const top = document.createElement('div'); top.className = 'dashboard-order-top';
      const info = document.createElement('div');
      const number = document.createElement('div'); number.className = 'dashboard-order-number'; number.textContent = `Pedido #${order.id}`;
      const date = document.createElement('div'); date.className = 'dashboard-order-date';
      const parsedDate = new Date(order.created_at);
      date.textContent = Number.isNaN(parsedDate.getTime()) ? '' : parsedDate.toLocaleString('pt-BR');
      const status = document.createElement('span'); status.className = 'dashboard-order-status'; status.textContent = statusNames[String(order.status || '').toLowerCase()] || (order.status || 'Recebido');
      info.append(number,date,status);
      const total = document.createElement('div'); total.className = 'dashboard-order-total'; total.textContent = money(order.total);
      top.append(info,total);
      const items = document.createElement('div'); items.className = 'dashboard-order-items';
      (Array.isArray(order.items) ? order.items : []).forEach(item => {
        const line = document.createElement('div');
        line.textContent = `${item.productName || 'Produto'} × ${item.quantity} — ${money(Number(item.unitPrice) * Number(item.quantity))}`;
        items.append(line);
      });
      card.append(top,items); dashboardOrdersList.append(card);
    });
  } catch (error) { dashboardOrdersMessage.textContent = error.message; }
}
document.querySelectorAll('[data-dashboard-tab]').forEach(button => button.addEventListener('click', () => setDashboardTab(button.dataset.dashboardTab)));
document.querySelector('#dashboard-close').addEventListener('click', () => { dashboard.hidden = true; });
dashboard.addEventListener('click', event => { if (event.target === dashboard) dashboard.hidden = true; });
document.querySelector('#dashboard-refresh-orders').addEventListener('click', loadCustomerOrders);
document.querySelector('#dashboard-logout').addEventListener('click', () => topLogoutButton.click());
document.querySelector('#dashboard-profile-form').addEventListener('submit', async event => {
  event.preventDefault();
  dashboardProfileMessage.textContent = '';
  try {
    if (!customerCsrfToken) await getCustomerCsrf();
    const response = await fetch('/api/customer-auth/profile', {
      method: 'PATCH', credentials: 'same-origin',
      headers: { 'Content-Type': 'application/json', 'X-CSRF-Token': customerCsrfToken },
      body: JSON.stringify({ fullName: document.querySelector('#dashboard-full-name').value.trim(), phone: document.querySelector('#dashboard-phone').value.trim() })
    });
    const result = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(result.error || 'Não foi possível salvar seus dados.');
    currentCustomer = result.customer || currentCustomer;
    document.querySelector('#dashboard-customer-email').textContent = currentCustomer.email;
    document.querySelector('#dashboard-full-name').value = currentCustomer.fullName || '';
    document.querySelector('#dashboard-phone').value = currentCustomer.phone || '';
    if (result.csrfToken) customerCsrfToken = result.csrfToken;
    dashboardProfileMessage.textContent = 'Seus dados foram atualizados.';
  } catch (error) { dashboardProfileMessage.textContent = error.message; }
});

topAccountToggle.addEventListener('click', async () => {
  if (currentCustomer) {
    window.location.href = '/minha-conta.html';
    return;
  }
  panel.hidden = false;
  checkoutAccount.hidden = false;
  accountPanel.hidden = false;
  setAccountMode('login');
  try { await getCustomerCsrf(); } catch (error) { accountMessage.textContent = error.message; }
});

topLogoutButton.addEventListener('click', async () => {
  topLogoutButton.disabled = true;
  try {
    await getCustomerCsrf();
    const response = await fetch('/api/customer-auth/logout', {
      method: 'POST', credentials: 'same-origin',
      headers: { 'X-CSRF-Token': customerCsrfToken }
    });
    const result = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(result.error || 'Não foi possível sair da conta.');
    customerCsrfToken = null;
    setGuest();
    dashboard.hidden = true;
    checkoutMessage.textContent = 'Você saiu da sua conta. Pode continuar como visitante ou entrar novamente.';
    accountMessage.textContent = '';
    accountPanel.hidden = true;
    // Não esconda as opções de checkout quando houver produtos no carrinho.
    renderCart();
  } catch (error) {
    checkoutMessage.textContent = error.message;
  } finally { topLogoutButton.disabled = false; }
});
// Se o cliente já estiver autenticado ao abrir ou atualizar a página, recuperar a conta.
(async () => {
  try {
    const response = await fetch('/api/customer-auth/me', { credentials: 'same-origin', cache: 'no-store' });
    if (!response.ok) return;
    const result = await response.json();
    if (result.authenticated && result.customer) {
      setCustomer(result.customer);
      await getCustomerCsrf();
    }
  } catch { /* A loja continua disponível para compra como visitante. */ }
})();

async function submitAccountForm(form, endpoint, payload) {
  accountMessage.textContent = '';
  try {
    if (!customerCsrfToken) await getCustomerCsrf();
    const response = await fetch(`/api/customer-auth/${endpoint}`, {
      method: 'POST', credentials: 'same-origin',
      headers: { 'Content-Type': 'application/json', 'X-CSRF-Token': customerCsrfToken },
      body: JSON.stringify(payload)
    });
    const result = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(result.error || 'Não foi possível autenticar a conta.');
    customerCsrfToken = result.csrfToken;
    setCustomer(result.customer);
    accountMessage.textContent = '';
    checkoutMessage.textContent = 'Conta conectada. Agora você pode finalizar o pedido.';
  } catch (error) { accountMessage.textContent = error.message; }
}
document.querySelector('#checkout-login-form').addEventListener('submit', async event => {
  event.preventDefault();
  const form = event.currentTarget;
  await submitAccountForm(form, 'login', {
    email: document.querySelector('#checkout-login-email').value,
    password: document.querySelector('#checkout-login-password').value
  });
  if (currentCustomer) form.reset();
});
document.querySelector('#checkout-register-form').addEventListener('submit', async event => {
  event.preventDefault();
  const form = event.currentTarget;
  await submitAccountForm(form, 'register', {
    fullName: document.querySelector('#checkout-register-name').value,
    email: document.querySelector('#checkout-register-email').value,
    phone: document.querySelector('#checkout-register-phone').value,
    password: document.querySelector('#checkout-register-password').value
  });
  if (currentCustomer) form.reset();
});

document.querySelector('#checkout-form').addEventListener('submit', async event => {
  event.preventDefault();
  const checkoutForm = event.currentTarget;
  checkoutMessage.textContent = '';
  if (!cart.size) { checkoutMessage.textContent = 'Adicione pelo menos um produto ao carrinho.'; return; }
  const form = new FormData(checkoutForm);
  const payload = {
    customerName: form.get('customerName'), customerEmail: form.get('customerEmail'),
    items: [...cart.entries()].map(([productId, quantity]) => ({ productId, quantity }))
  };
  const submit = event.currentTarget.querySelector('button[type="submit"]');
  submit.disabled = true;
  try {
    const headers = { 'Content-Type': 'application/json' };
    if (currentCustomer) {
      if (!customerCsrfToken) await getCustomerCsrf();
      headers['X-CSRF-Token'] = customerCsrfToken;
    }
    const response = await fetch('/api/orders', { method: 'POST', credentials: 'same-origin', headers, body: JSON.stringify(payload) });
    const result = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(result.error || 'Não foi possível concluir o pedido.');
    checkoutMessage.textContent = `Pedido #${result.orderId} registrado! Total: ${money(result.total)}.${result.linkedToAccount ? ' Pedido vinculado à sua conta.' : ''}`;
    cart.clear();
    saveCart();
    checkoutForm.reset();
    renderCart();
    await loadProducts();
  } catch (error) {
    checkoutMessage.textContent = error.message;
  } finally { submit.disabled = false; }
});

loadProducts();
renderCart();