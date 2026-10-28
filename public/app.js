const money = value => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(Number(value));
const grid = document.querySelector('#product-grid');
const status = document.querySelector('#product-status');
const panel = document.querySelector('#cart-panel');
const cartItemsEl = document.querySelector('#cart-items');
const cartCount = document.querySelector('#cart-count');
const cartTotal = document.querySelector('#cart-total');
const checkoutMessage = document.querySelector('#checkout-message');
let products = [];
const cart = new Map();

async function loadProducts() {
  try {
    const response = await fetch('/api/products');
    if (!response.ok) throw new Error('Falha ao consultar a API');
    products = await response.json();
    renderProducts();
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
  cartItemsEl.innerHTML = entries.length ? entries.map(([id, quantity]) => {
    const product = products.find(item => Number(item.id) === id);
    return product ? `<div class="cart-line"><div><strong>${escapeHtml(product.name)}</strong><br>${quantity} × ${money(product.price)}</div><button type="button" data-remove="${id}">Remover</button></div>` : '';
  }).join('') : '<p class="empty-cart">Seu carrinho está vazio. Adicione algum produto para continuar.</p>';
  cartItemsEl.querySelectorAll('[data-remove]').forEach(button => button.addEventListener('click', () => { cart.delete(Number(button.dataset.remove)); renderCart(); }));
}

document.querySelector('#cart-toggle').addEventListener('click', () => { panel.hidden = false; });
document.querySelector('#cart-close').addEventListener('click', () => { panel.hidden = true; });
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
    const response = await fetch('/api/orders', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
    const result = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(result.error || 'Não foi possível concluir o pedido.');
    checkoutMessage.textContent = `Pedido #${result.orderId} registrado! Total: ${money(result.total)}.`;
    cart.clear();
    checkoutForm.reset();
    renderCart();
    await loadProducts();
  } catch (error) {
    checkoutMessage.textContent = error.message;
  } finally { submit.disabled = false; }
});

loadProducts();
renderCart();
