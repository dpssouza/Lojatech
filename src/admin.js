
const express = require('express');
const crypto = require('crypto');
const session = require('express-session');
const PgSession = require('connect-pg-simple')(session);
const rateLimit = require('express-rate-limit');

function createAdminRouter(pool) {
  const router = express.Router();

  const {
    ADMIN_USERNAME,
    ADMIN_PASSWORD,
    ADMIN_SESSION_SECRET,
    NODE_ENV
  } = process.env;

  if (!ADMIN_USERNAME || !ADMIN_PASSWORD || !ADMIN_SESSION_SECRET) {
    throw new Error(
      'Configure ADMIN_USERNAME, ADMIN_PASSWORD e ADMIN_SESSION_SECRET no .env.'
    );
  }

  if (ADMIN_SESSION_SECRET.length < 64) {
    throw new Error(
      'ADMIN_SESSION_SECRET deve ter pelo menos 64 caracteres.'
    );
  }

  const cookieName = 'lojatech.sid';

  router.use(session({
    name: cookieName,
    secret: ADMIN_SESSION_SECRET,
    store: new PgSession({
      pool,
      tableName: 'session',
      createTableIfMissing: true
    }),
    resave: false,
    saveUninitialized: false,
    cookie: {
      httpOnly: true,
      secure: NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 8 * 60 * 60 * 1000,
      path: '/'
    }
  }));

  function safeEqual(a, b) {
    const first = Buffer.from(String(a));
    const second = Buffer.from(String(b));

    return first.length === second.length &&
      crypto.timingSafeEqual(first, second);
  }

  function requireCsrf(req, res, next) {
    const supplied = req.get('X-CSRF-Token');
    const expected = req.session.csrfToken;

    if (
      typeof supplied !== 'string' ||
      typeof expected !== 'string' ||
      !safeEqual(supplied, expected)
    ) {
      return res.status(403).json({
        error: 'Token de segurança inválido. Atualize a página e tente novamente.'
      });
    }

    next();
  }

  function requireAuth(req, res, next) {
    if (req.session.authenticated !== true) {
      return res.status(401).json({
        error: 'Acesso não autorizado.'
      });
    }

    next();
  }

  function validateProduct(body) {
    if (!body || typeof body !== 'object' || Array.isArray(body)) {
      return 'Dados do produto inválidos.';
    }

    const { name, description, price, image_url, image_urls, stock, active } = body;

    if (typeof name !== 'string' || !name.trim() || name.trim().length > 120) {
      return 'O nome é obrigatório e deve ter até 120 caracteres.';
    }

    if (typeof description !== 'string') {
      return 'A descrição deve ser um texto.';
    }

    if (
      typeof price !== 'number' ||
      !Number.isFinite(price) ||
      price < 0 ||
      price > 99999999.99
    ) {
      return 'Informe um preço válido.';
    }

    if (
      image_url !== null &&
      image_url !== undefined &&
      (typeof image_url !== 'string' || image_url.length > 2000)
    ) {
      return 'O endereço da imagem é inválido.';
    }

    if (image_urls !== undefined && (!Array.isArray(image_urls) || image_urls.length > 12 || image_urls.some(url => typeof url !== 'string' || url.length > 500 || !url.startsWith('/images/products/')))) {
      return 'Use até 12 caminhos locais em /images/products/ (um por linha).';
    }

    if (!Number.isSafeInteger(stock) || stock < 0) {
      return 'O estoque deve ser um número inteiro igual ou maior que zero.';
    }

    if (typeof active !== 'boolean') {
      return 'O status do produto é inválido.';
    }

    return null;
  }

  function productValues(body) {
    return [
      body.name.trim(),
      body.description.trim(),
      body.price,
      body.image_url?.trim() || (Array.isArray(body.image_urls) ? body.image_urls[0] : null) || null,
      JSON.stringify(Array.isArray(body.image_urls) ? body.image_urls : []),
      body.stock,
      body.active
    ];
  }

  router.get('/csrf', (req, res) => {
    if (!req.session.csrfToken) {
      req.session.csrfToken = crypto.randomBytes(32).toString('hex');
    }

    res.set('Cache-Control', 'no-store');
    res.json({ csrfToken: req.session.csrfToken });
  });

  const loginLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    limit: 5,
    standardHeaders: 'draft-8',
    legacyHeaders: false,
    message: {
      error: 'Muitas tentativas. Aguarde 15 minutos antes de tentar novamente.'
    }
  });

  router.post('/login', loginLimiter, requireCsrf, async (req, res, next) => {
    try {
      const { username, password } = req.body || {};

      if (
        typeof username !== 'string' ||
        typeof password !== 'string' ||
        !safeEqual(username, ADMIN_USERNAME) ||
        !safeEqual(password, ADMIN_PASSWORD)
      ) {
        return res.status(401).json({
          error: 'Usuário ou senha inválidos.'
        });
      }

      req.session.regenerate((err) => {
        if (err) return next(err);

        req.session.authenticated = true;
        req.session.csrfToken = crypto.randomBytes(32).toString('hex');

        req.session.save((saveErr) => {
          if (saveErr) return next(saveErr);

          res.set('Cache-Control', 'no-store');
          res.json({
            ok: true,
            csrfToken: req.session.csrfToken
          });
        });
      });
    } catch (err) {
      next(err);
    }
  });

  router.get('/me', (req, res) => {
    res.set('Cache-Control', 'no-store');
    res.json({
      authenticated: req.session.authenticated === true
    });
  });

  router.post('/logout', requireAuth, requireCsrf, (req, res, next) => {
    req.session.destroy((err) => {
      if (err) return next(err);

      res.clearCookie(cookieName, {
        httpOnly: true,
        secure: NODE_ENV === 'production',
        sameSite: 'strict',
        path: '/'
      });

      res.json({ ok: true });
    });
  });

  router.get('/products', requireAuth, async (req, res, next) => {
    try {
      const result = await pool.query(
        `SELECT id, name, description, price, image_url, image_urls, stock, active
         FROM products
         ORDER BY id DESC`
      );

      res.set('Cache-Control', 'no-store');
      res.json(result.rows);
    } catch (err) {
      next(err);
    }
  });

  router.post('/products', requireAuth, requireCsrf, async (req, res, next) => {
    try {
      const validationError = validateProduct(req.body);

      if (validationError) {
        return res.status(400).json({ error: validationError });
      }

      const result = await pool.query(
        `INSERT INTO products
          (name, description, price, image_url, image_urls, stock, active)
         VALUES ($1, $2, $3, $4, $5::jsonb, $6, $7)
         RETURNING id, name, description, price, image_url, image_urls, stock, active`,
        productValues(req.body)
      );

      res.status(201).json(result.rows[0]);
    } catch (err) {
      next(err);
    }
  });

  router.put('/products/:id', requireAuth, requireCsrf, async (req, res, next) => {
    try {
      const id = Number(req.params.id);

      if (!Number.isSafeInteger(id) || id < 1) {
        return res.status(400).json({ error: 'ID de produto inválido.' });
      }

      const validationError = validateProduct(req.body);

      if (validationError) {
        return res.status(400).json({ error: validationError });
      }

      const values = productValues(req.body);

      const result = await pool.query(
      `UPDATE products
       SET name = $1,
       description = $2,
       price = $3,
       image_url = CASE
         WHEN $9::boolean THEN $4
         ELSE image_url
       END,
       image_urls = CASE
         WHEN $9::boolean THEN $5::jsonb
         ELSE image_urls
       END,
       stock = $6,
       active = $7
   WHERE id = $8
   RETURNING id, name, description, price, image_url, image_urls, stock, active`,
  [
    ...values,
    id,
    Object.prototype.hasOwnProperty.call(req.body, 'image_urls')
  ]
);

      if (!result.rowCount) {
        return res.status(404).json({ error: 'Produto não encontrado.' });
      }

      res.json(result.rows[0]);
    } catch (err) {
      next(err);
    }
  });

  return router;
}

module.exports = createAdminRouter;
