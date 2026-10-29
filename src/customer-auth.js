'use strict';

const express = require('express');
const crypto = require('crypto');
const session = require('express-session');
const PgSession = require('connect-pg-simple')(session);
const rateLimit = require('express-rate-limit');

const SCRYPT_KEY_LENGTH = 64;
const SCRYPT_OPTIONS = { N: 16384, r: 8, p: 1, maxmem: 64 * 1024 * 1024 };
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function hashPassword(password) {
  return new Promise((resolve, reject) => {
    const salt = crypto.randomBytes(16);
    crypto.scrypt(password, salt, SCRYPT_KEY_LENGTH, SCRYPT_OPTIONS, (err, derivedKey) => {
      if (err) return reject(err);
      resolve(`scrypt$${salt.toString('hex')}$${derivedKey.toString('hex')}`);
    });
  });
}

function verifyPassword(password, stored) {
  return new Promise((resolve, reject) => {
    const parts = typeof stored === 'string' ? stored.split('$') : [];
    if (parts.length !== 3 || parts[0] !== 'scrypt' || !/^[a-f0-9]{32}$/i.test(parts[1]) || !/^[a-f0-9]{128}$/i.test(parts[2])) {
      return resolve(false);
    }
    const salt = Buffer.from(parts[1], 'hex');
    const expected = Buffer.from(parts[2], 'hex');
    crypto.scrypt(password, salt, expected.length, SCRYPT_OPTIONS, (err, derivedKey) => {
      if (err) return reject(err);
      resolve(derivedKey.length === expected.length && crypto.timingSafeEqual(derivedKey, expected));
    });
  });
}

function normalizeEmail(value) {
  return value.trim().toLowerCase();
}

function publicCustomer(row) {
  return {
    id: row.id,
    fullName: row.full_name,
    email: row.email,
    phone: row.phone || '',
    createdAt: row.created_at
  };
}

function createCustomerAuthRouter(pool) {
  const router = express.Router();
  const { NODE_ENV } = process.env;
  const cookieName = 'lojatech.customer.sid';

  router.use(session({
    name: cookieName,
    secret: process.env.CUSTOMER_SESSION_SECRET || process.env.ADMIN_SESSION_SECRET,
    store: new PgSession({ pool, tableName: 'session', createTableIfMissing: false }),
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
    return first.length === second.length && crypto.timingSafeEqual(first, second);
  }

  function requireCsrf(req, res, next) {
    const supplied = req.get('X-CSRF-Token');
    const expected = req.session.csrfToken;
    if (typeof supplied !== 'string' || typeof expected !== 'string' || !safeEqual(supplied, expected)) {
      return res.status(403).json({ error: 'Token de segurança inválido. Atualize a página e tente novamente.' });
    }
    next();
  }

  function requireCustomer(req, res, next) {
    if (!Number.isSafeInteger(req.session.customerId) || req.session.customerId < 1) {
      return res.status(401).json({ error: 'Faça login para acessar sua conta.' });
    }
    next();
  }

  const authLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    limit: 10,
    standardHeaders: 'draft-8',
    legacyHeaders: false,
    message: { error: 'Muitas tentativas. Aguarde alguns minutos antes de tentar novamente.' }
  });

  router.get('/csrf', (req, res, next) => {
    if (!req.session.csrfToken) req.session.csrfToken = crypto.randomBytes(32).toString('hex');
    req.session.save((err) => {
      if (err) return next(err);
      res.set('Cache-Control', 'no-store');
      res.json({ csrfToken: req.session.csrfToken });
    });
  });

  router.post('/register', authLimiter, requireCsrf, async (req, res, next) => {
    try {
      const body = req.body || {};
      const fullName = typeof body.fullName === 'string' ? body.fullName.trim() : '';
      const email = typeof body.email === 'string' ? normalizeEmail(body.email) : '';
      const password = typeof body.password === 'string' ? body.password : '';
      const phone = typeof body.phone === 'string' ? body.phone.trim() : '';

      if (fullName.length < 2 || fullName.length > 120 || !EMAIL_RE.test(email) || email.length > 180 ||
          password.length < 8 || password.length > 128 || /[\u0000-\u001f\u007f]/.test(password) || phone.length > 30) {
        return res.status(400).json({ error: 'Informe nome (2 a 120 caracteres), e-mail válido, senha de 8 a 128 caracteres e telefone opcional de até 30 caracteres.' });
      }

      const passwordHash = await hashPassword(password);
      const result = await pool.query(
        `INSERT INTO public.customers (full_name, email, password_hash, phone)
         VALUES ($1, $2, $3, NULLIF($4, ''))
         ON CONFLICT DO NOTHING
         RETURNING id, full_name, email, phone, created_at`,
        [fullName, email, passwordHash, phone]
      );

      if (!result.rowCount) return res.status(409).json({ error: 'Já existe uma conta com esse e-mail.' });

      const customer = result.rows[0];
      req.session.regenerate((err) => {
        if (err) return next(err);
        req.session.customerId = Number(customer.id);
        req.session.csrfToken = crypto.randomBytes(32).toString('hex');
        req.session.save((saveErr) => {
          if (saveErr) return next(saveErr);
          res.set('Cache-Control', 'no-store');
          res.status(201).json({ ok: true, customer: publicCustomer(customer), csrfToken: req.session.csrfToken });
        });
      });
    } catch (err) {
      if (err && err.code === '23505') return res.status(409).json({ error: 'Já existe uma conta com esse e-mail.' });
      next(err);
    }
  });

  router.post('/login', authLimiter, requireCsrf, async (req, res, next) => {
    try {
      const email = typeof req.body?.email === 'string' ? normalizeEmail(req.body.email) : '';
      const password = typeof req.body?.password === 'string' ? req.body.password : '';
      if (!EMAIL_RE.test(email) || email.length > 180 || !password || password.length > 128) {
        return res.status(400).json({ error: 'Informe um e-mail e uma senha válidos.' });
      }

      const result = await pool.query(
        `SELECT id, full_name, email, phone, password_hash, created_at
         FROM public.customers WHERE LOWER(email) = $1 AND status = 'active' LIMIT 1`,
        [email]
      );
      const customer = result.rows[0];
      const valid = customer ? await verifyPassword(password, customer.password_hash) : false;
      if (!valid) return res.status(401).json({ error: 'E-mail ou senha inválidos.' });

      req.session.regenerate((err) => {
        if (err) return next(err);
        req.session.customerId = Number(customer.id);
        req.session.csrfToken = crypto.randomBytes(32).toString('hex');
        req.session.save((saveErr) => {
          if (saveErr) return next(saveErr);
          res.set('Cache-Control', 'no-store');
          res.json({ ok: true, customer: publicCustomer(customer), csrfToken: req.session.csrfToken });
        });
      });
    } catch (err) {
      next(err);
    }
  });

  router.get('/me', requireCustomer, async (req, res, next) => {
    try {
      const result = await pool.query(
        `SELECT id, full_name, email, phone, created_at
         FROM public.customers WHERE id = $1 AND status = 'active'`,
        [req.session.customerId]
      );
      if (!result.rowCount) return res.status(401).json({ authenticated: false });
      res.set('Cache-Control', 'no-store');
      res.json({ authenticated: true, customer: publicCustomer(result.rows[0]) });
    } catch (err) {
      next(err);
    }
  });

  router.patch('/profile', requireCustomer, requireCsrf, async (req, res, next) => {
    try {
      const fullName = typeof req.body?.fullName === 'string' ? req.body.fullName.trim() : '';
      const phone = typeof req.body?.phone === 'string' ? req.body.phone.trim() : '';
      if (fullName.length < 2 || fullName.length > 120 || phone.length > 30) {
        return res.status(400).json({ error: 'Informe nome de 2 a 120 caracteres e telefone opcional de até 30 caracteres.' });
      }
      const result = await pool.query(
        `UPDATE public.customers SET full_name = $1, phone = NULLIF($2, ''), updated_at = NOW()
         WHERE id = $3 AND status = 'active'
         RETURNING id, full_name, email, phone, created_at`,
        [fullName, phone, req.session.customerId]
      );
      if (!result.rowCount) return res.status(401).json({ error: 'Conta não encontrada ou inativa.' });
      res.set('Cache-Control', 'no-store');
      res.json({ ok: true, customer: publicCustomer(result.rows[0]) });
    } catch (err) {
      next(err);
    }
  });

  // Visão geral e gestão de endereços da conta do cliente.
  router.get('/addresses', requireCustomer, async (req, res, next) => {
    try {
      const result = await pool.query(
        `SELECT id, recipient_name, postal_code, street, street_number, complement,
                neighborhood, city, state, is_default, created_at, updated_at
         FROM public.customer_addresses WHERE customer_id = $1
         ORDER BY is_default DESC, updated_at DESC, id DESC`,
        [req.session.customerId]
      );
      res.set('Cache-Control', 'no-store');
      res.json({ addresses: result.rows });
    } catch (err) { next(err); }
  });

  function validateAddress(body) {
    const value = body || {};
    const address = {
      recipientName: typeof value.recipientName === 'string' ? value.recipientName.trim() : '',
      postalCode: typeof value.postalCode === 'string' ? value.postalCode.replace(/\s/g, '').trim() : '',
      street: typeof value.street === 'string' ? value.street.trim() : '',
      streetNumber: typeof value.streetNumber === 'string' ? value.streetNumber.trim() : '',
      complement: typeof value.complement === 'string' ? value.complement.trim() : '',
      neighborhood: typeof value.neighborhood === 'string' ? value.neighborhood.trim() : '',
      city: typeof value.city === 'string' ? value.city.trim() : '',
      state: typeof value.state === 'string' ? value.state.trim().toUpperCase() : '',
      isDefault: value.isDefault === true
    };
    if (address.recipientName.length < 2 || address.recipientName.length > 120 ||
        !/^[0-9A-Za-z-]{5,12}$/.test(address.postalCode) ||
        address.street.length < 2 || address.street.length > 180 ||
        !address.streetNumber || address.streetNumber.length > 30 ||
        address.complement.length > 120 || address.neighborhood.length < 2 || address.neighborhood.length > 120 ||
        address.city.length < 2 || address.city.length > 120 || !/^[A-Z]{2}$/.test(address.state)) return null;
    return address;
  }

  router.post('/addresses', requireCustomer, requireCsrf, async (req, res, next) => {
    const address = validateAddress(req.body);
    if (!address) return res.status(400).json({ error: 'Confira os campos do endereço. CEP, rua, número, bairro, cidade e UF são obrigatórios.' });
    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      if (address.isDefault) await client.query('UPDATE public.customer_addresses SET is_default = FALSE WHERE customer_id = $1', [req.session.customerId]);
      const result = await client.query(
        `INSERT INTO public.customer_addresses
          (customer_id, recipient_name, postal_code, street, street_number, complement, neighborhood, city, state, is_default)
         VALUES ($1,$2,$3,$4,$5,NULLIF($6,''),$7,$8,$9,$10)
         RETURNING id, recipient_name, postal_code, street, street_number, complement, neighborhood, city, state, is_default, created_at, updated_at`,
        [req.session.customerId, address.recipientName, address.postalCode, address.street, address.streetNumber, address.complement, address.neighborhood, address.city, address.state, address.isDefault]
      );
      await client.query('COMMIT');
      res.status(201).json({ ok: true, address: result.rows[0] });
    } catch (err) {
      await client.query('ROLLBACK').catch(() => {});
      next(err);
    } finally { client.release(); }
  });

  router.patch('/addresses/:id', requireCustomer, requireCsrf, async (req, res, next) => {
    const id = Number(req.params.id);
    const address = validateAddress(req.body);
    if (!Number.isSafeInteger(id) || id < 1) return res.status(400).json({ error: 'Endereço inválido.' });
    if (!address) return res.status(400).json({ error: 'Confira os campos do endereço. CEP, rua, número, bairro, cidade e UF são obrigatórios.' });
    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      if (address.isDefault) await client.query('UPDATE public.customer_addresses SET is_default = FALSE WHERE customer_id = $1', [req.session.customerId]);
      const result = await client.query(
        `UPDATE public.customer_addresses SET recipient_name=$1, postal_code=$2, street=$3, street_number=$4,
          complement=NULLIF($5,''), neighborhood=$6, city=$7, state=$8, is_default=$9, updated_at=NOW()
         WHERE id=$10 AND customer_id=$11
         RETURNING id, recipient_name, postal_code, street, street_number, complement, neighborhood, city, state, is_default, created_at, updated_at`,
        [address.recipientName, address.postalCode, address.street, address.streetNumber, address.complement, address.neighborhood, address.city, address.state, address.isDefault, id, req.session.customerId]
      );
      if (!result.rowCount) { await client.query('ROLLBACK'); return res.status(404).json({ error: 'Endereço não encontrado.' }); }
      await client.query('COMMIT');
      res.json({ ok: true, address: result.rows[0] });
    } catch (err) {
      await client.query('ROLLBACK').catch(() => {});
      next(err);
    } finally { client.release(); }
  });

  router.delete('/addresses/:id', requireCustomer, requireCsrf, async (req, res, next) => {
    const id = Number(req.params.id);
    if (!Number.isSafeInteger(id) || id < 1) return res.status(400).json({ error: 'Endereço inválido.' });
    try {
      const result = await pool.query('DELETE FROM public.customer_addresses WHERE id = $1 AND customer_id = $2 RETURNING id', [id, req.session.customerId]);
      if (!result.rowCount) return res.status(404).json({ error: 'Endereço não encontrado.' });
      res.json({ ok: true });
    } catch (err) { next(err); }
  });

  router.post('/change-email', authLimiter, requireCustomer, requireCsrf, async (req, res, next) => {
    try {
      const currentPassword = typeof req.body?.currentPassword === 'string' ? req.body.currentPassword : '';
      const newEmail = typeof req.body?.newEmail === 'string' ? normalizeEmail(req.body.newEmail) : '';
      if (!EMAIL_RE.test(newEmail) || newEmail.length > 180) {
        return res.status(400).json({ error: 'Informe um e-mail válido com até 180 caracteres.' });
      }

      const current = await pool.query(
        `SELECT password_hash FROM public.customers WHERE id = $1 AND status = 'active'`,
        [req.session.customerId]
      );
      if (!current.rowCount) return res.status(401).json({ error: 'Conta não encontrada ou inativa.' });
      const valid = await verifyPassword(currentPassword, current.rows[0].password_hash);
      if (!valid) return res.status(400).json({ error: 'A senha atual está incorreta.' });

      const updated = await pool.query(
        `UPDATE public.customers SET email = $1, updated_at = NOW()
         WHERE id = $2 AND status = 'active'
         RETURNING id, full_name, email, phone, created_at`,
        [newEmail, req.session.customerId]
      );
      res.set('Cache-Control', 'no-store');
      res.json({ ok: true, customer: publicCustomer(updated.rows[0]), message: 'E-mail alterado com sucesso.' });
    } catch (err) {
      if (err && err.code === '23505') return res.status(409).json({ error: 'Já existe uma conta com esse e-mail.' });
      next(err);
    }
  });

  router.post('/change-password', authLimiter, requireCustomer, requireCsrf, async (req, res, next) => {
    try {
      const currentPassword = typeof req.body?.currentPassword === 'string' ? req.body.currentPassword : '';
      const newPassword = typeof req.body?.newPassword === 'string' ? req.body.newPassword : '';
      if (newPassword.length < 8 || newPassword.length > 128 || /[\u0000-\u001f\u007f]/.test(newPassword)) {
        return res.status(400).json({ error: 'A nova senha deve ter de 8 a 128 caracteres.' });
      }
      const result = await pool.query('SELECT password_hash FROM public.customers WHERE id = $1 AND status = $2', [req.session.customerId, 'active']);
      if (!result.rowCount) return res.status(401).json({ error: 'Conta não encontrada ou inativa.' });
      const valid = await verifyPassword(currentPassword, result.rows[0].password_hash);
      if (!valid) return res.status(400).json({ error: 'A senha atual está incorreta.' });
      if (currentPassword === newPassword) return res.status(400).json({ error: 'Escolha uma senha diferente da atual.' });
      const passwordHash = await hashPassword(newPassword);
      await pool.query('UPDATE public.customers SET password_hash = $1, updated_at = NOW() WHERE id = $2', [passwordHash, req.session.customerId]);
      res.set('Cache-Control', 'no-store');
      res.json({ ok: true, message: 'Senha alterada com sucesso.' });
    } catch (err) { next(err); }
  });

  router.post('/logout', requireCustomer, requireCsrf, (req, res, next) => {
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

  return router;
}

module.exports = createCustomerAuthRouter;
