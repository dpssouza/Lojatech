'use strict';
const money = value => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(Number(value || 0));
let customer = null;
let csrfToken = null;
let cachedOrders = [];
let cachedAddresses = [];
const $ = selector => document.querySelector(selector);
async function readJson(response) { return response.json().catch(() => ({})); }
async function getCsrf() {
  const response = await fetch('/api/customer-auth/csrf', { credentials: 'same-origin', cache: 'no-store' });
  const result = await readJson(response);
  if (!response.ok || !result.csrfToken) throw new Error(result.error || 'Não foi possível validar a sessão.');
  csrfToken = result.csrfToken; return csrfToken;
}
async function requestJson(url, options = {}) {
  const response = await fetch(url, { credentials: 'same-origin', cache: 'no-store', ...options });
  const result = await readJson(response);
  if (response.status === 401) { window.location.replace('/'); throw new Error('Sua sessão expirou. Entre novamente.'); }
  if (!response.ok) throw new Error(result.error || 'Não foi possível concluir a operação.');
  return result;
}
function setTab(tab) {
  document.querySelectorAll('[data-account-tab]').forEach(button => button.classList.toggle('active', button.dataset.accountTab === tab));
  ['overview', 'orders', 'profile', 'addresses', 'security'].forEach(name => { const section = $(`#account-page-${name}`); if (section) section.hidden = name !== tab; });
  if (tab === 'orders') loadOrders();
  if (tab === 'addresses') loadAddresses();
}
document.querySelectorAll('[data-account-tab]').forEach(button => button.addEventListener('click', () => setTab(button.dataset.accountTab)));
document.querySelectorAll('[data-open-tab]').forEach(button => button.addEventListener('click', () => setTab(button.dataset.openTab)));
function orderCard(order) {
  const card = document.createElement('article'); card.className = 'dashboard-order-card';
  const top = document.createElement('div'); top.className = 'dashboard-order-top';
  const info = document.createElement('div');
  const number = document.createElement('div'); number.className = 'dashboard-order-number'; number.textContent = `Pedido #${order.id}`;
  const date = document.createElement('div'); date.className = 'dashboard-order-date'; const parsedDate = new Date(order.created_at); date.textContent = Number.isNaN(parsedDate.getTime()) ? '' : parsedDate.toLocaleString('pt-BR');
  const statusNames = { pending: 'Aguardando processamento', processing: 'Em processamento', shipped: 'Enviado', delivered: 'Entregue', cancelled: 'Cancelado', paid: 'Pago', completed: 'Concluído' };
  const status = document.createElement('span'); status.className = 'dashboard-order-status'; status.textContent = statusNames[String(order.status || '').toLowerCase()] || (order.status || 'Recebido');
  info.append(number, date, status); const total = document.createElement('div'); total.className = 'dashboard-order-total'; total.textContent = money(order.total); top.append(info, total); card.append(top);
  const items = document.createElement('div'); items.className = 'dashboard-order-items';
  (Array.isArray(order.items) ? order.items : []).forEach(item => { const line = document.createElement('div'); line.textContent = `${item.productName || 'Produto'} × ${item.quantity} — ${money(Number(item.unitPrice) * Number(item.quantity))}`; items.append(line); });
  card.append(items); return card;
}
async function loadOrders() {
  const message = $('#account-page-orders-message'); const list = $('#account-page-orders-list');
  message.textContent = 'Carregando seus pedidos...'; list.replaceChildren();
  try {
    const result = await requestJson('/api/customer/orders'); cachedOrders = Array.isArray(result.orders) ? result.orders : [];
    if (!cachedOrders.length) { message.textContent = 'Você ainda não tem pedidos vinculados à sua conta.'; }
    else { message.textContent = ''; cachedOrders.forEach(order => list.append(orderCard(order))); }
    updateOverview();
  } catch (error) {
    message.textContent = error.message;
    const overviewMessage = $('#account-overview-message');
    if (overviewMessage) overviewMessage.textContent = `Não foi possível carregar os pedidos: ${error.message}`;
  }
}
function updateOverview() {
  $('#account-stat-orders').textContent = String(cachedOrders.length);
  const active = cachedOrders.filter(order => !['delivered', 'completed', 'cancelled'].includes(String(order.status || '').toLowerCase())).length;
  $('#account-stat-active').textContent = String(active);
  $('#account-stat-spent').textContent = money(cachedOrders.reduce((sum, order) => sum + Number(order.total || 0), 0));
  const addressCount = document.querySelector('#account-stat-addresses'); if (addressCount) addressCount.textContent = String(cachedAddresses.length);
  $('#account-overview-name').textContent = (customer?.fullName || 'cliente').split(' ')[0];
  const previewName = document.querySelector('#account-preview-name'); if (previewName) previewName.textContent = customer?.fullName || 'Não informado';
  const previewPhone = document.querySelector('#account-preview-phone'); if (previewPhone) previewPhone.textContent = customer?.phone || 'Não informado';
  const previewEmail = document.querySelector('#account-preview-email'); if (previewEmail) previewEmail.textContent = customer?.email || '—';
  const defaultAddress = cachedAddresses.find(address => address.is_default) || cachedAddresses[0];
  const previewAddress = document.querySelector('#account-preview-address');
  if (previewAddress) previewAddress.textContent = defaultAddress ? `${defaultAddress.street}, ${defaultAddress.street_number}${defaultAddress.complement ? ', ' + defaultAddress.complement : ''}\n${defaultAddress.neighborhood}\n${defaultAddress.city} - ${defaultAddress.state}\nCEP: ${defaultAddress.postal_code}${defaultAddress.is_default ? ' · Endereço padrão' : ''}` : 'Nenhum endereço cadastrado. Adicione um endereço para agilizar suas próximas compras.';
  const message = $('#account-overview-message'); const list = $('#account-overview-orders'); list.replaceChildren();
  if (!cachedOrders.length) message.textContent = 'Você ainda não tem pedidos vinculados à sua conta.';
  else { message.textContent = ''; cachedOrders.slice(0, 3).forEach(order => list.append(orderCard(order))); }
}
$('#account-page-refresh').addEventListener('click', loadOrders);
$('#account-overview-refresh').addEventListener('click', loadOrders);
$('#account-page-profile-form').addEventListener('submit', async event => {
  event.preventDefault(); const message = $('#account-page-profile-message'); message.textContent = '';
  try {
    if (!csrfToken) await getCsrf();
    const result = await requestJson('/api/customer-auth/profile', { method: 'PATCH', headers: { 'Content-Type': 'application/json', 'X-CSRF-Token': csrfToken }, body: JSON.stringify({ fullName: $('#account-page-full-name').value.trim(), phone: $('#account-page-phone').value.trim() }) });
    customer = result.customer || customer; $('#account-page-full-name').value = customer.fullName || ''; $('#account-page-phone').value = customer.phone || ''; $('#account-overview-name').textContent = (customer.fullName || 'cliente').split(' ')[0]; message.textContent = 'Seus dados foram atualizados.';
  } catch (error) { message.textContent = error.message; }
});
function addressValue(address, key) { return address[key] ?? ''; }
function renderAddresses() {
  const list = $('#account-address-list'); list.replaceChildren();
  if (!cachedAddresses.length) { $('#account-address-message').textContent = 'Você ainda não cadastrou um endereço.'; return; }
  $('#account-address-message').textContent = '';
  cachedAddresses.forEach(address => {
    const card = document.createElement('article'); card.className = 'account-address-card';
    const title = document.createElement('div'); title.className = 'account-address-card-title';
    const name = document.createElement('strong'); name.textContent = address.recipient_name;
    if (address.is_default) { const tag = document.createElement('span'); tag.className = 'dashboard-order-status'; tag.textContent = 'Padrão'; title.append(name, tag); } else title.append(name);
    const detail = document.createElement('p'); detail.textContent = `${address.street}, ${address.street_number}${address.complement ? `, ${address.complement}` : ''} — ${address.neighborhood}, ${address.city} - ${address.state}, CEP ${address.postal_code}`;
    const actions = document.createElement('div'); actions.className = 'account-address-actions';
    const edit = document.createElement('button'); edit.type = 'button'; edit.className = 'text-button'; edit.textContent = 'Editar'; edit.addEventListener('click', () => showAddressForm(address));
    const remove = document.createElement('button'); remove.type = 'button'; remove.className = 'text-button account-delete-address'; remove.textContent = 'Excluir'; remove.addEventListener('click', async () => {
      if (!window.confirm('Deseja excluir este endereço?')) return;
      try { if (!csrfToken) await getCsrf(); await requestJson(`/api/customer-auth/addresses/${address.id}`, { method: 'DELETE', headers: { 'X-CSRF-Token': csrfToken } }); await loadAddresses(); }
      catch (error) { $('#account-address-message').textContent = error.message; }
    });
    actions.append(edit, remove); card.append(title, detail, actions); list.append(card);
  });
}
async function loadAddresses() {
  $('#account-address-message').textContent = 'Carregando endereços...';
  try { const result = await requestJson('/api/customer-auth/addresses'); cachedAddresses = Array.isArray(result.addresses) ? result.addresses : []; renderAddresses(); updateOverview(); }
  catch (error) {
    $('#account-address-message').textContent = error.message;
    const previewAddress = $('#account-preview-address');
    if (previewAddress) previewAddress.textContent = `Não foi possível carregar os endereços: ${error.message}`;
  }
}
function showAddressForm(address = null) {
  const form = $('#account-address-form'); form.hidden = false; $('#account-address-form-title').textContent = address ? 'Editar endereço' : 'Novo endereço'; $('#account-address-form-message').textContent = '';
  $('#account-address-id').value = address?.id || '';
  const map = { 'address-recipient': address?.recipient_name, 'address-postal': address?.postal_code, 'address-street': address?.street, 'address-number': address?.street_number, 'address-complement': address?.complement, 'address-neighborhood': address?.neighborhood, 'address-city': address?.city, 'address-state': address?.state };
  Object.entries(map).forEach(([id, value]) => { $(`#${id}`).value = value || ''; }); $('#address-default').checked = Boolean(address?.is_default); form.scrollIntoView({ behavior: 'smooth', block: 'start' });
}
$('#account-address-new').addEventListener('click', () => showAddressForm());
$('#account-address-cancel').addEventListener('click', () => { $('#account-address-form').hidden = true; });
$('#account-address-form').addEventListener('submit', async event => {
  event.preventDefault(); const message = $('#account-address-form-message'); message.textContent = '';
  const body = { recipientName: $('#address-recipient').value.trim(), postalCode: $('#address-postal').value.trim(), street: $('#address-street').value.trim(), streetNumber: $('#address-number').value.trim(), complement: $('#address-complement').value.trim(), neighborhood: $('#address-neighborhood').value.trim(), city: $('#address-city').value.trim(), state: $('#address-state').value.trim().toUpperCase(), isDefault: $('#address-default').checked };
  try {
    if (!csrfToken) await getCsrf(); const id = $('#account-address-id').value; const result = await requestJson(id ? `/api/customer-auth/addresses/${id}` : '/api/customer-auth/addresses', { method: id ? 'PATCH' : 'POST', headers: { 'Content-Type': 'application/json', 'X-CSRF-Token': csrfToken }, body: JSON.stringify(body) });
    if (result.ok) { $('#account-address-form').reset(); $('#account-address-form').hidden = true; await loadAddresses(); }
  } catch (error) { message.textContent = error.message; }
});
$('#address-state').addEventListener('input', event => { event.target.value = event.target.value.toUpperCase().slice(0, 2); });
$('#account-email-form').addEventListener('submit', async event => {
  event.preventDefault();
  const message = $('#account-email-message');
  message.textContent = '';
  const currentPassword = $('#account-current-email-password').value;
  const newEmail = $('#account-new-email').value.trim();
  try {
    if (!csrfToken) await getCsrf();
    const result = await requestJson('/api/customer-auth/change-email', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'X-CSRF-Token': csrfToken },
      body: JSON.stringify({ currentPassword, newEmail })
    });
    customer = result.customer || customer;
    $('#account-page-email').textContent = customer.email || '';
    $('#account-page-email-field').value = customer.email || '';
    $('#account-preview-email').textContent = customer.email || '—';
    $('#account-email-form').reset();
    message.textContent = result.message || 'E-mail alterado com sucesso.';
  } catch (error) {
    message.textContent = error.message;
  }
});
$('#account-password-form').addEventListener('submit', async event => {
  event.preventDefault(); const message = $('#account-password-message'); message.textContent = '';
  const currentPassword = $('#account-current-password').value; const newPassword = $('#account-new-password').value; const confirmPassword = $('#account-confirm-password').value;
  if (newPassword !== confirmPassword) { message.textContent = 'A confirmação não corresponde à nova senha.'; return; }
  if (newPassword.length < 8) { message.textContent = 'A nova senha deve ter pelo menos 8 caracteres.'; return; }
  try {
    if (!csrfToken) await getCsrf(); const result = await requestJson('/api/customer-auth/change-password', { method: 'POST', headers: { 'Content-Type': 'application/json', 'X-CSRF-Token': csrfToken }, body: JSON.stringify({ currentPassword, newPassword }) });
    $('#account-password-form').reset(); message.textContent = result.message || 'Senha alterada com sucesso.';
  } catch (error) { message.textContent = error.message; }
});
// O botão de logout pode estar apenas no cabeçalho, sem o ID account-page-logout.
// Não deixe um botão ausente interromper a inicialização de toda a página.
const accountLogoutButton = $('#account-page-logout');
if (accountLogoutButton) {
  accountLogoutButton.addEventListener('click', async event => {
    const button = event.currentTarget; button.disabled = true;
    try {
      if (!csrfToken) await getCsrf();
      await requestJson('/api/customer-auth/logout', { method: 'POST', headers: { 'X-CSRF-Token': csrfToken } });
      window.location.replace('/');
    } catch (error) {
      button.disabled = false;
      const message = $('#account-page-orders-message') || $('#account-overview-message');
      if (message) message.textContent = error.message;
    }
  });
}
(async function init() {
  const emailLabel = $('#account-page-email');
  try {
    const result = await requestJson('/api/customer-auth/me');
    if (!result.authenticated || !result.customer) { window.location.replace('/'); return; }
    customer = result.customer;
    emailLabel.textContent = customer.email || '';
    $('#account-page-full-name').value = customer.fullName || '';
    $('#account-page-phone').value = customer.phone || '';
    $('#account-page-email-field').value = customer.email || '';
    $('#account-overview-name').textContent = (customer.fullName || 'cliente').split(' ')[0];

    // Mostra a visão geral imediatamente. Leituras GET não precisam aguardar o token CSRF.
    setTab('overview');
    await Promise.all([loadOrders(), loadAddresses()]);
  } catch (error) {
    if (emailLabel) emailLabel.textContent = error.message || 'Não foi possível carregar sua conta.';
    const overviewMessage = $('#account-overview-message');
    if (overviewMessage) overviewMessage.textContent = error.message || 'Não foi possível carregar sua conta.';
  }
})();
