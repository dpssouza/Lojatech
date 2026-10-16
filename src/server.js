const express = require('express');
const path = require('path');
const { Pool } = require('pg');

const app = express();
const port = Number(process.env.PORT || 3000);
const pool = new Pool({
  host: process.env.DB_HOST || 'localhost',
  port: Number(process.env.DB_PORT || 5432),
  database: process.env.DB_NAME || 'lojatech',
  user: process.env.DB_USER || 'lojatech',
  password: process.env.DB_PASSWORD || 'lojatech_dev',
});

app.use(express.json());
app.use(express.static(path.join(__dirname, '..', 'public')));

app.get('/api/health', async (_req, res) => {
  try {
    await pool.query('SELECT 1');
    res.json({ status: 'ok', database: 'connected' });
  } catch (error) {
    res.status(503).json({ status: 'error', database: 'unavailable' });
  }
});

app.get('/api/products', async (_req, res) => {
  try {
    const { rows } = await pool.query(
      'SELECT id, name, description, price, image_url, stock FROM products WHERE active = TRUE ORDER BY id'
    );
    res.json(rows);
  } catch (error) {
    console.error('Erro ao listar produtos:', error.message);
    res.status(500).json({ error: 'Não foi possível carregar os produtos.' });
  }
});

app.post('/api/orders', async (req, res) => {
  const { customerName, customerEmail, items } = req.body;
  if (typeof customerName !== 'string' || !customerName.trim() ||
      typeof customerEmail !== 'string' || !/^\S+@\S+\.\S+$/.test(customerEmail) ||
      !Array.isArray(items) || items.length === 0) {
    return res.status(400).json({ error: 'Informe nome, e-mail válido e pelo menos um produto.' });
  }

  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    let total = 0;
    const verifiedItems = [];
    for (const item of items) {
      const productId = Number(item.productId);
      const quantity = Number(item.quantity);
      if (!Number.isInteger(productId) || !Number.isInteger(quantity) || quantity < 1 || quantity > 20) {
        throw Object.assign(new Error('Produto ou quantidade inválida.'), { status: 400 });
      }
      const result = await client.query(
        'SELECT id, name, price, stock FROM products WHERE id = $1 AND active = TRUE FOR UPDATE', [productId]
      );
      if (!result.rowCount) throw Object.assign(new Error('Um produto não foi encontrado.'), { status: 400 });
      const product = result.rows[0];
      if (product.stock < quantity) throw Object.assign(new Error(`Estoque insuficiente para ${product.name}.`), { status: 400 });
      total += Number(product.price) * quantity;
      verifiedItems.push({ product, quantity });
    }

    const orderResult = await client.query(
      'INSERT INTO orders (customer_name, customer_email, total) VALUES ($1, $2, $3) RETURNING id, total, created_at',
      [customerName.trim(), customerEmail.trim(), total.toFixed(2)]
    );
    const order = orderResult.rows[0];
    for (const { product, quantity } of verifiedItems) {
      await client.query(
        'INSERT INTO order_items (order_id, product_id, quantity, unit_price) VALUES ($1, $2, $3, $4)',
        [order.id, product.id, quantity, product.price]
      );
      await client.query('UPDATE products SET stock = stock - $1 WHERE id = $2', [quantity, product.id]);
    }
    await client.query('COMMIT');
    res.status(201).json({ message: 'Pedido registrado com sucesso!', orderId: order.id, total: Number(order.total) });
  } catch (error) {
    await client.query('ROLLBACK');
    res.status(error.status || 500).json({ error: error.status ? error.message : 'Não foi possível registrar o pedido.' });
    if (!error.status) console.error('Erro ao registrar pedido:', error.message);
  } finally {
    client.release();
  }
});

app.use('/api', (_req, res) => res.status(404).json({ error: 'Rota de API não encontrada.' }));

app.listen(port, '0.0.0.0', () => console.log(`LojaTech disponível na porta ${port}`));
