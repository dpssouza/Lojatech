'use strict';

const express = require('express');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const path = require('path');
const { Pool } = require('pg');

const app = express();
const port = Number(process.env.PORT || 3000);

// Não use uma senha padrão. O serviço deve falhar de forma explícita se faltar
// configuração essencial, em vez de tentar autenticar com credenciais conhecidas.
const requiredEnv = ['DB_USER', 'DB_PASSWORD'];
for (const name of requiredEnv) {
  if (!process.env[name] || !process.env[name].trim()) {
    throw new Error(`Variável obrigatória ausente: ${name}`);
  }
}

if (!Number.isInteger(port) || port < 1 || port > 65535) {
  throw new Error('PORT deve ser um número entre 1 e 65535.');
}

// Configure TRUST_PROXY=true somente se houver exatamente um proxy reverso
// confiável à frente da aplicação. Ajuste conforme a topologia real.
if (process.env.TRUST_PROXY === 'true') {
  app.set('trust proxy', 1);
}

const pool = new Pool({
  host: process.env.DB_HOST || 'localhost',
  port: Number(process.env.DB_PORT || 5432),
  database: process.env.DB_NAME || 'lojatech',
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  connectionTimeoutMillis: 5000,
  idleTimeoutMillis: 30000,
  max: Number(process.env.DB_POOL_MAX || 10),
});

// Migração compatível com volumes PostgreSQL já existentes. As imagens da galeria
// ficam referenciadas por caminhos locais dentro de public/images/products.
const schemaReady = Promise.resolve().then(async () => {
  const galleryByName = {
    'teclado mecânico': ['/images/products/teclado-mecanico-01.svg','/images/products/teclado-mecanico-02.svg','/images/products/teclado-mecanico-03.svg'],
    'mouse sem fio': ['/images/products/mouse-sem-fio-01.png','/images/products/mouse-sem-fio-02.svg','/images/products/mouse-sem-fio-03.svg'],
    'headset usb': ['/images/products/headset-usb-01.svg','/images/products/headset-usb-02.svg','/images/products/headset-usb-03.svg'],
    'webcam hd': ['/images/products/webcam-hd-01.svg','/images/products/webcam-hd-02.svg','/images/products/webcam-hd-03.svg'],
    'hub usb': ['/images/products/hub-usb-01.svg','/images/products/hub-usb-02.svg','/images/products/hub-usb-03.svg'],
    'fone de ouvido bluetooth': ['/images/products/fone-bluetooth-01.svg','/images/products/fone-bluetooth-02.svg','/images/products/fone-bluetooth-03.svg'],
    'fone bluetooth': ['/images/products/fone-bluetooth-01.svg','/images/products/fone-bluetooth-02.svg','/images/products/fone-bluetooth-03.svg'],
    'ssd 1tb': ['/images/products/ssd-1tb-01.svg','/images/products/ssd-1tb-02.svg','/images/products/ssd-1tb-03.svg']
  };
  for (const [name, urls] of Object.entries(galleryByName)) {
    await pool.query("UPDATE products SET image_urls = $1::jsonb, image_url = $2 WHERE LOWER(name) = $3 AND (image_urls = '[]'::jsonb OR image_urls IS NULL)", [JSON.stringify(urls), urls[0], name]);
  }
  const genericGallery = ['/images/products/produto-generico-01.svg','/images/products/produto-generico-02.svg','/images/products/produto-generico-03.svg'];
  await pool.query("UPDATE products SET image_urls = $1::jsonb, image_url = $2 WHERE image_urls = '[]'::jsonb OR image_urls IS NULL", [JSON.stringify(genericGallery), genericGallery[0]]);
});
app.use(async (_req, _res, next) => {
  try { await schemaReady; next(); } catch (error) { next(error); }
});

pool.on('error', (error) => {
  console.error('Erro inesperado em conexão ociosa com PostgreSQL:', error.message);
});

app.disable('x-powered-by');
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      baseUri: ["'self'"],
      fontSrc: ["'self'", 'https:', 'data:'],
      formAction: ["'self'"],
      frameAncestors: ["'none'"],
      imgSrc: ["'self'","https://images.unsplash.com","https://media.istockphoto.com","data:"],
      objectSrc: ["'none'"],
      scriptSrc: ["'self'"],
      styleSrc: ["'self'"],
      upgradeInsecureRequests: null,
    },
  },
  // HSTS é ativado somente em produção. Em produção, entregue a aplicação
  // por HTTPS e confirme que o domínio permanece exclusivamente em HTTPS.
  strictTransportSecurity: process.env.NODE_ENV === 'production' ? undefined : false,
}));

app.use(express.json({ limit: '16kb', strict: true }));
app.use(express.static(path.join(__dirname, '..', 'public'), {
  dotfiles: 'deny',
  index: 'index.html',
  maxAge: process.env.NODE_ENV === 'production' ? '1h' : 0,
}));

app.get('/produtos', (_req, res) => res.redirect('/#produtos'));

const productLimiter = rateLimit({
  windowMs: 60 * 1000,
  limit: 120,
  standardHeaders: 'draft-8',
  legacyHeaders: false,
  message: { error: 'Muitas consultas. Tente novamente em instantes.' },
});

const orderLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 10,
  standardHeaders: 'draft-8',
  legacyHeaders: false,
  message: { error: 'Muitos pedidos enviados. Aguarde antes de tentar novamente.' },
});

app.get('/api/health', async (_req, res) => {
  try {
    await pool.query('SELECT 1');
    res.json({ status: 'ok' });
  } catch (error) {
    console.error('Verificação de saúde falhou:', error.message);
    res.status(503).json({ status: 'error' });
  }
});

app.get('/api/products', productLimiter, async (_req, res) => {
  try {
    const { rows } = await pool.query(
      "SELECT id, name, description, price, image_url, image_urls, stock FROM products WHERE active = TRUE ORDER BY id"
    );
    res.json(rows);
  } catch (error) {
    console.error('Erro ao listar produtos:', error.message);
    res.status(500).json({ error: 'Não foi possível carregar os produtos.' });
  }
});

app.post('/api/orders', orderLimiter, async (req, res) => {
  const body = req.body;
  if (!body || typeof body !== 'object' || Array.isArray(body)) {
    return res.status(400).json({ error: 'Corpo da requisição inválido.' });
  }

  const customerName = typeof body.customerName === 'string' ? body.customerName.trim() : '';
  const customerEmail = typeof body.customerEmail === 'string' ? body.customerEmail.trim() : '';
  const items = body.items;

  if (
    !customerName ||
    customerName.length > 120 ||
    !customerEmail ||
    customerEmail.length > 180 ||
    !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(customerEmail) ||
    !Array.isArray(items) ||
    items.length === 0 ||
    items.length > 50
  ) {
    return res.status(400).json({
      error: 'Informe nome (até 120 caracteres), e-mail válido (até 180 caracteres) e até 50 itens.',
    });
  }

  // Agrega IDs repetidos antes de consultar o banco. Sem isso, um mesmo
  // produto poderia aparecer várias vezes e cada linha validar o estoque
  // isoladamente, permitindo ultrapassar o limite total por produto.
  const quantitiesByProduct = new Map();
  for (const item of items) {
    if (!item || typeof item !== 'object' || Array.isArray(item)) {
      return res.status(400).json({ error: 'Item de pedido inválido.' });
    }
    const productId = Number(item.productId);
    const quantity = Number(item.quantity);
    if (!Number.isSafeInteger(productId) || productId < 1 ||
        !Number.isSafeInteger(quantity) || quantity < 1) {
      return res.status(400).json({ error: 'Produto ou quantidade inválida.' });
    }
    const combined = (quantitiesByProduct.get(productId) || 0) + quantity;
    if (combined > 20) {
      return res.status(400).json({ error: 'A quantidade máxima por produto é 20 unidades.' });
    }
    quantitiesByProduct.set(productId, combined);
  }

  let client;
  let transactionStarted = false;
  try {
    client = await pool.connect();
    await client.query('BEGIN');
    transactionStarted = true;

    let totalCents = 0;
    const verifiedItems = [];

    // Ordenar IDs reduz a chance de deadlocks quando pedidos concorrentes
    // contêm os mesmos produtos em ordens diferentes.
    const orderedItems = [...quantitiesByProduct.entries()].sort((a, b) => a[0] - b[0]);

    for (const [productId, quantity] of orderedItems) {
      const result = await client.query(
        'SELECT id, name, price, stock FROM products WHERE id = $1 AND active = TRUE FOR UPDATE',
        [productId]
      );

      if (!result.rowCount) {
        const error = new Error('Um produto não foi encontrado ou está indisponível.');
        error.status = 400;
        throw error;
      }

      const product = result.rows[0];
      if (Number(product.stock) < quantity) {
        const error = new Error(`Estoque insuficiente para ${product.name}.`);
        error.status = 400;
        throw error;
      }

      // PostgreSQL retorna NUMERIC como string. Convertemos o preço para
      // centavos inteiros para evitar acumular erros de ponto flutuante.
      const priceCents = Math.round(Number(product.price) * 100);
      totalCents += priceCents * quantity;
      verifiedItems.push({ product, quantity });
    }

    if (!Number.isSafeInteger(totalCents) || totalCents < 0) {
      const error = new Error('Total do pedido inválido.');
      error.status = 400;
      throw error;
    }

    const total = (totalCents / 100).toFixed(2);
    const orderResult = await client.query(
      'INSERT INTO orders (customer_name, customer_email, total) VALUES ($1, $2, $3) RETURNING id, total, created_at',
      [customerName, customerEmail, total]
    );
    const order = orderResult.rows[0];

    for (const { product, quantity } of verifiedItems) {
      await client.query(
        'INSERT INTO order_items (order_id, product_id, quantity, unit_price) VALUES ($1, $2, $3, $4)',
        [order.id, product.id, quantity, product.price]
      );
      await client.query(
        'UPDATE products SET stock = stock - $1 WHERE id = $2',
        [quantity, product.id]
      );
    }

    await client.query('COMMIT');
    transactionStarted = false;
    return res.status(201).json({
      message: 'Pedido registrado com sucesso!',
      orderId: order.id,
      total: Number(order.total),
    });
  } catch (error) {
    if (client && transactionStarted) {
      try {
        await client.query('ROLLBACK');
      } catch (rollbackError) {
        console.error('Falha ao reverter transação:', rollbackError.message);
      }
    }

    if (error.status) {
      return res.status(error.status).json({ error: error.message });
    }

    console.error('Erro ao registrar pedido:', error.message);
    return res.status(500).json({ error: 'Não foi possível registrar o pedido.' });
  } finally {
    if (client) client.release();
  }
});

// Painel administrativo da LojaTech
const createAdminRouter = require('./admin');
app.use('/api/admin', createAdminRouter(pool));

// Página do painel administrativo
app.get('/admin', (_req, res) => {
  res.sendFile(path.join(__dirname, '../public/admin.html'));
});

app.use('/api', (_req, res) => {
  res.status(404).json({ error: 'Rota de API não encontrada.' });
});

// Evita expor stack traces e detalhes internos em respostas a erros de parsing.
app.use((error, _req, res, _next) => {
  if (error && (error.type === 'entity.too.large' || error.status === 413)) {
    return res.status(413).json({ error: 'Corpo da requisição muito grande.' });
  }
  if (error instanceof SyntaxError && error.status === 400 && 'body' in error) {
    return res.status(400).json({ error: 'JSON inválido.' });
  }
  console.error('Erro inesperado na aplicação:', error && error.message);
  return res.status(500).json({ error: 'Erro interno do servidor.' });
});

const server = app.listen(port, '0.0.0.0', () => {
  console.log(`LojaTech disponível na porta ${port}`);
});

function shutdown(signal) {
  console.log(`${signal} recebido; encerrando a aplicação...`);
  server.close(() => {
    pool.end()
      .then(() => process.exit(0))
      .catch((error) => {
        console.error('Erro ao encerrar pool do PostgreSQL:', error.message);
        process.exit(1);
      });
  });
  setTimeout(() => process.exit(1), 10000).unref();
}

process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));