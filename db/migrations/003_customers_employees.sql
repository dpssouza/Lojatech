BEGIN;

-- LojaTech: estrutura inicial para clientes, endereços, funcionários e auditoria.
-- Esta migração não apaga nem recria produtos, pedidos ou itens existentes.
-- Execute com psql e a variável app_user definida para o usuário da aplicação.

CREATE TABLE IF NOT EXISTS public.customers (
    id BIGSERIAL PRIMARY KEY,
    full_name VARCHAR(120) NOT NULL,
    email VARCHAR(180) NOT NULL,
    password_hash TEXT NOT NULL,
    phone VARCHAR(30),
    status VARCHAR(20) NOT NULL DEFAULT 'active',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT customers_status_check CHECK (status IN ('active', 'inactive'))
);

-- E-mail único sem diferenciar maiúsculas/minúsculas.
CREATE UNIQUE INDEX IF NOT EXISTS customers_email_lower_unique
    ON public.customers (LOWER(email));

CREATE TABLE IF NOT EXISTS public.customer_addresses (
    id BIGSERIAL PRIMARY KEY,
    customer_id BIGINT NOT NULL REFERENCES public.customers(id) ON DELETE CASCADE,
    recipient_name VARCHAR(120) NOT NULL,
    postal_code VARCHAR(12) NOT NULL,
    street VARCHAR(180) NOT NULL,
    street_number VARCHAR(30) NOT NULL,
    complement VARCHAR(120),
    neighborhood VARCHAR(120) NOT NULL,
    city VARCHAR(120) NOT NULL,
    state CHAR(2) NOT NULL,
    is_default BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS customer_addresses_customer_id_idx
    ON public.customer_addresses (customer_id);

-- Perfis iniciais: administrator, sales e inventory.
-- Nenhuma conta de funcionário é criada automaticamente por esta migração.
CREATE TABLE IF NOT EXISTS public.employees (
    id BIGSERIAL PRIMARY KEY,
    full_name VARCHAR(120) NOT NULL,
    email VARCHAR(180) NOT NULL,
    password_hash TEXT NOT NULL,
    role VARCHAR(20) NOT NULL,
    status VARCHAR(20) NOT NULL DEFAULT 'active',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT employees_role_check CHECK (role IN ('administrator', 'sales', 'inventory')),
    CONSTRAINT employees_status_check CHECK (status IN ('active', 'inactive'))
);

CREATE UNIQUE INDEX IF NOT EXISTS employees_email_lower_unique
    ON public.employees (LOWER(email));

-- O campo é opcional para preservar pedidos anteriores sem conta de cliente.
ALTER TABLE public.orders
    ADD COLUMN IF NOT EXISTS customer_id BIGINT;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM pg_constraint
        WHERE conname = 'orders_customer_id_fkey'
          AND conrelid = 'public.orders'::regclass
    ) THEN
        ALTER TABLE public.orders
            ADD CONSTRAINT orders_customer_id_fkey
            FOREIGN KEY (customer_id)
            REFERENCES public.customers(id)
            ON DELETE SET NULL;
    END IF;
END $$;

CREATE INDEX IF NOT EXISTS orders_customer_id_created_at_idx
    ON public.orders (customer_id, created_at DESC);

-- Auditoria para operações administrativas importantes.
CREATE TABLE IF NOT EXISTS public.audit_logs (
    id BIGSERIAL PRIMARY KEY,
    employee_id BIGINT REFERENCES public.employees(id) ON DELETE SET NULL,
    action VARCHAR(80) NOT NULL,
    entity_type VARCHAR(80) NOT NULL,
    entity_id VARCHAR(80),
    details JSONB NOT NULL DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS audit_logs_created_at_idx
    ON public.audit_logs (created_at DESC);
CREATE INDEX IF NOT EXISTS audit_logs_employee_id_created_at_idx
    ON public.audit_logs (employee_id, created_at DESC);

-- Permissões mínimas para o usuário da aplicação.
GRANT SELECT, INSERT, UPDATE ON TABLE public.customers TO :"app_user";
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.customer_addresses TO :"app_user";
GRANT SELECT, INSERT, UPDATE ON TABLE public.employees TO :"app_user";
GRANT SELECT, INSERT ON TABLE public.audit_logs TO :"app_user";
GRANT SELECT, INSERT, UPDATE ON TABLE public.orders TO :"app_user";
GRANT USAGE, SELECT ON SEQUENCE public.customers_id_seq TO :"app_user";
GRANT USAGE, SELECT ON SEQUENCE public.customer_addresses_id_seq TO :"app_user";
GRANT USAGE, SELECT ON SEQUENCE public.employees_id_seq TO :"app_user";
GRANT USAGE, SELECT ON SEQUENCE public.audit_logs_id_seq TO :"app_user";

COMMIT;
