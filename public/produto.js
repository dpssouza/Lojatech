const money = value => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(Number(value));
const status = document.querySelector('#detail-status');
const detail = document.querySelector('#product-detail');
const mainImage = document.querySelector('#detail-main-image');
const thumbnails = document.querySelector('#detail-thumbnails');
const nameEl = document.querySelector('#detail-name');
const descriptionEl = document.querySelector('#detail-description');
const priceEl = document.querySelector('#detail-price');
const stockEl = document.querySelector('#detail-stock');
const quantityEl = document.querySelector('#detail-quantity');
const addButton = document.querySelector('#detail-add');
const message = document.querySelector('#detail-message');
const relatedSection = document.querySelector('#related-section');
const relatedProductsEl = document.querySelector('#related-products');
let product;
let allProducts = [];

function escapeHtml(value) {
  return String(value ?? '').replace(/[&<>"']/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[char]));
}
function readCart() {
  try {
    const saved = JSON.parse(localStorage.getItem('lojatech-cart') || '[]');
    return new Map(Array.isArray(saved) ? saved.filter(item => Array.isArray(item) && item.length === 2).map(([id, qty]) => [Number(id), Number(qty)]) : []);
  } catch { return new Map(); }
}
function showGallery(urls, alt) {
  const fallbackImage = '/images/products/produto-generico-01.svg';
  const validUrls = [...new Set(
    (Array.isArray(urls) ? urls : []).filter(
      url => typeof url === 'string' &&
        url.startsWith('/images/products/')
    )
  )];

  const gallery = validUrls.length ? validUrls : [fallbackImage];

  function selectImage(url, selectedButton) {
    mainImage.classList.remove('image-unavailable');
    mainImage.src = url;
    mainImage.alt = alt;

    mainImage.onerror = () => {
      mainImage.onerror = null;
      mainImage.src = fallbackImage;
      mainImage.alt = `${alt} — imagem ilustrativa`;
    };

    thumbnails.querySelectorAll('.detail-thumbnail').forEach(button => {
      const active = button === selectedButton;
      button.classList.toggle('is-active', active);
      button.setAttribute('aria-pressed', String(active));
    });
  }

  thumbnails.innerHTML = '';

  gallery.forEach((url, index) => {
    const thumb = document.createElement('button');
    thumb.type = 'button';
    thumb.className = `detail-thumbnail${index === 0 ? ' is-active' : ''}`;
    thumb.setAttribute('aria-label', `Ver imagem ${index + 1} de ${gallery.length}`);
    thumb.setAttribute('aria-pressed', String(index === 0));

    const img = document.createElement('img');
    img.src = url;
    img.alt = '';
    img.loading = 'lazy';
    img.onerror = () => thumb.remove();

    thumb.appendChild(img);
    thumb.addEventListener('click', () => selectImage(url, thumb));
    thumbnails.appendChild(thumb);

    if (index === 0) {
      selectImage(url, thumb);
    }
  });
}

function renderRelatedProducts() {
  const related = allProducts.filter(item => Number(item.id) !== Number(product.id)).slice(0, 8);
  if (!related.length) return;
  relatedProductsEl.innerHTML = related.map(item => `
    <article class="related-card">
      <a class="related-card-link" href="/produto.html?id=${encodeURIComponent(item.id)}" aria-label="Ver detalhes de ${escapeHtml(item.name)}">
        <img class="related-card-image" src="${escapeHtml((Array.isArray(item.image_urls) && item.image_urls[0]) || item.image_url || '')}" alt="${escapeHtml(item.name)}" loading="lazy">
        <div class="related-card-body">
          <h3>${escapeHtml(item.name)}</h3>
          <p class="related-card-description">${escapeHtml(item.description || 'Confira os detalhes deste produto.')}</p>
          <div class="related-card-bottom"><span class="related-card-price">${money(item.price)}</span></div>
          <p class="related-stock">${Number(item.stock) > 0 ? `${escapeHtml(item.stock)} em estoque` : 'Indisponível'}</p>
        </div>
      </a>
      <div class="related-card-body related-card-action">
        <button class="related-add" type="button" data-related-add="${Number(item.id)}" ${Number(item.stock) < 1 ? 'disabled' : ''}>Adicionar +</button>
      </div>
    </article>`).join('');
  relatedProductsEl.querySelectorAll('.related-card-image').forEach(img => {
    img.addEventListener('error', () => { img.style.visibility = 'hidden'; }, { once: true });
  });
  relatedProductsEl.querySelectorAll('[data-related-add]').forEach(button => {
    button.addEventListener('click', () => addRelatedToCart(Number(button.dataset.relatedAdd), button));
  });
  relatedSection.hidden = false;
}
function addRelatedToCart(id, button) {
  const item = allProducts.find(entry => Number(entry.id) === id);
  if (!item) return;
  const cart = readCart();
  const current = cart.get(id) || 0;
  if (current >= Number(item.stock)) {
    button.textContent = 'Estoque insuficiente';
    return;
  }
  cart.set(id, current + 1);
  localStorage.setItem('lojatech-cart', JSON.stringify([...cart.entries()]));
  const oldText = button.textContent;
  button.textContent = 'Adicionado ✓';
  window.setTimeout(() => { button.textContent = oldText; }, 1400);
}
async function loadProduct() {
  const id = new URLSearchParams(location.search).get('id');
  if (!id || !/^\d+$/.test(id)) {
    status.textContent = 'Produto não informado. Volte ao catálogo e selecione um produto.';
    return;
  }
  try {
    const response = await fetch('/api/products');
    if (!response.ok) throw new Error('Não foi possível consultar o catálogo.');
    allProducts = await response.json();
    product = allProducts.find(item => Number(item.id) === Number(id));
    if (!product) throw new Error('Produto não encontrado. Ele pode ter sido removido do catálogo.');
    document.title = `${product.name} | LojaTech`;
    nameEl.textContent = product.name;
    descriptionEl.textContent = product.description || 'Mais informações sobre este produto em breve.';
    priceEl.textContent = money(product.price);
    stockEl.textContent = Number(product.stock) > 0 ? `${product.stock} unidades em estoque` : 'Produto indisponível no momento';
    quantityEl.max = Math.max(1, Number(product.stock) || 1);
    addButton.disabled = Number(product.stock) < 1;
    const gallery = Array.isArray(product.image_urls) && product.image_urls.length ? product.image_urls : (product.image_url ? [product.image_url] : []);
    showGallery(gallery, product.name);
    status.textContent = '';
    status.hidden = true;
    detail.hidden = false;
    renderRelatedProducts();
  } catch (error) {
    status.textContent = error.message || 'Ocorreu um erro ao carregar o produto.';
  }
}
addButton.addEventListener('click', () => {
  if (!product) return;
  const quantity = Number.parseInt(quantityEl.value, 10);
  if (!Number.isInteger(quantity) || quantity < 1) {
    message.textContent = 'Informe uma quantidade válida.';
    return;
  }
  if (quantity > Number(product.stock)) {
    message.textContent = `Há apenas ${product.stock} unidade(s) em estoque.`;
    return;
  }
  const cart = readCart();
  const current = cart.get(Number(product.id)) || 0;
  if (current + quantity > Number(product.stock)) {
    message.textContent = `Você já tem ${current} unidade(s) no carrinho. O estoque disponível é ${product.stock}.`;
    return;
  }
  cart.set(Number(product.id), current + quantity);
  localStorage.setItem('lojatech-cart', JSON.stringify([...cart.entries()]));
  message.textContent = 'Produto adicionado ao carrinho!';
  addButton.textContent = 'Adicionado ✓';
  window.setTimeout(() => { addButton.textContent = 'Adicionar ao carrinho'; }, 1600);
});
loadProduct();
