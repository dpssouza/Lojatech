BEGIN;

-- Pedidos existentes começam como pendentes.
ALTER TABLE public.orders
  ADD COLUMN IF NOT EXISTS status VARCHAR(20) NOT NULL DEFAULT 'pending';

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'orders_status_check') THEN
    ALTER TABLE public.orders
      ADD CONSTRAINT orders_status_check
      CHECK (status IN ('pending', 'processing', 'shipped', 'delivered', 'cancelled'));
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_orders_created_at ON public.orders (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_orders_status ON public.orders (status);
GRANT SELECT, INSERT, UPDATE ON TABLE public.orders TO :"app_user";
GRANT SELECT ON TABLE public.order_items TO :"app_user";
GRANT SELECT, UPDATE ON TABLE public.products TO :"app_user";

COMMIT;
