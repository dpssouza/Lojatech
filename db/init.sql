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

INSERT INTO products (name, description, price, image_url, stock) VALUES
('Teclado Mecânico', 'Teclado confortável para estudo e trabalho.', 189.90, 'https://images.unsplash.com/photo-1587829741301-dc798b83add3?auto=format&fit=crop&w=700&q=80', 12),
('Mouse sem Fio', 'Mouse sem fio para o dia a dia.', 79.90, 'https://images.unsplash.com/photo-1527814050087-3793815479db?auto=format&fit=crop&w=700&q=80', 20),
('Headset USB', 'Headset com microfone para aulas e reuniões.', 129.90, 'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?auto=format&fit=crop&w=700&q=80', 8),
('Webcam HD', 'Webcam para videoconferências.', 159.90, 'https://images.unsplash.com/photo-1587826080692-f439cd0b70da?auto=format&fit=crop&w=700&q=80', 10)
ON CONFLICT DO NOTHING;
