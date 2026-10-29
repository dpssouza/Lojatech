CREATE TABLE IF NOT EXISTS products (
  id SERIAL PRIMARY KEY,
  name VARCHAR(120) NOT NULL,
  description TEXT NOT NULL,
  price NUMERIC(10,2) NOT NULL CHECK (price >= 0),
  image_url TEXT,
  image_urls JSONB NOT NULL DEFAULT '[]'::jsonb,
  stock INTEGER NOT NULL DEFAULT 0 CHECK (stock >= 0),
  active BOOLEAN NOT NULL DEFAULT TRUE
);

CREATE TABLE IF NOT EXISTS orders (
  id SERIAL PRIMARY KEY,
  customer_name VARCHAR(120) NOT NULL,
  customer_email VARCHAR(180) NOT NULL,
  total NUMERIC(10,2) NOT NULL CHECK (total >= 0),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS order_items (
  id SERIAL PRIMARY KEY,
  order_id INTEGER NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  product_id INTEGER NOT NULL REFERENCES products(id),
  quantity INTEGER NOT NULL CHECK (quantity > 0),
  unit_price NUMERIC(10,2) NOT NULL CHECK (unit_price >= 0)
);

INSERT INTO products
  (id, name, description, price, image_url, image_urls, stock, active)
VALUES
  (1, 'Teclado Mecânico',
   'Teclado confortável para estudo e trabalho.',
   189.90, '/images/products/teclado-mecanico-01.svg',
   '["/images/products/teclado-mecanico-01.svg", "/images/products/teclado-mecanico-02.svg", "/images/products/teclado-mecanico-03.svg"]'::jsonb,
   2000, TRUE),

  (2, 'Mouse sem Fio',
   'Mouse sem fio para o dia a dia.',
   79.90, '/images/products/mouse-sem-fio-01.png',
   '["/images/products/mouse-sem-fio-01.png", "/images/products/mouse-sem-fio-02.svg", "/images/products/mouse-sem-fio-03.svg"]'::jsonb,
   2000, TRUE),

  (3, 'Headset USB',
   'Headset com microfone para aulas e reuniões.',
   129.90, '/images/products/headset-usb-01.svg',
   '["/images/products/headset-usb-01.svg", "/images/products/headset-usb-02.svg", "/images/products/headset-usb-03.svg"]'::jsonb,
   2000, TRUE),

  (4, 'Webcam HD',
   'Webcam para videoconferências.',
   159.90, '/images/products/webcam-hd-01.svg',
   '["/images/products/webcam-hd-01.svg", "/images/products/webcam-hd-02.svg", "/images/products/webcam-hd-03.svg"]'::jsonb,
   2000, TRUE),

  (5, 'SSD',
   'SanDisk SSD Plus, 240GB, SATA, Leitura 530MB/s, Gravação 440MB/s, SDSSDA-240G-G26, Preto',
   199.96, '/images/products/produto-generico-01.svg',
   '["/images/products/produto-generico-01.svg", "/images/products/produto-generico-02.svg", "/images/products/produto-generico-03.svg"]'::jsonb,
   500, TRUE),

  (6, 'Processador Intel core i5 12400f',
   E'processador de decima segunda geração\nsem gráficos integrados',
   799.96, '/images/products/processador-i9-12900kf.jpg',
   '["/images/products/processador-i9-12900kf.jpg"]'::jsonb,
   100, TRUE),

  (7, 'Kit Memória Kingston Fury Beast 16gb RGB (2x8GB) Ddr4 3200mhz Cl16',
   E'Performance Superior: 16GB (2x8GB) DDR4 3200MHz CL16 para jogos, edição e multitarefas fluidas com Dual Channel.\nEstilo Gamer: Iluminação RGB vibrante com sincronização FURY Infrared, elevando a estética do seu PC.\nOtimização Fácil: Suporte Intel XMP 2.0 e compatibilidade AMD Ryzen para máxima performance sem ajustes complexos.',
   1199.20, '/images/products/c7ddef78b1ffad9e37d6c89902d31a59.webp',
   '["/images/products/c7ddef78b1ffad9e37d6c89902d31a59.webp", "/images/products/6da5809f11ffb1f366d27dc3e0242412.webp", "/images/products/d8c265c379c160ecfc8ea52e7855c168.webp"]'::jsonb,
   100, TRUE)

ON CONFLICT (id) DO NOTHING;

SELECT setval(
  pg_get_serial_sequence('products', 'id'),
  GREATEST(COALESCE((SELECT MAX(id) FROM products), 1), 1),
  EXISTS (SELECT 1 FROM products)
);