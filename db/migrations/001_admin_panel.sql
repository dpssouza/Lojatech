BEGIN;

-- Adiciona suporte a múltiplas imagens sem apagar dados existentes.
ALTER TABLE public.products
    ADD COLUMN IF NOT EXISTS image_urls JSONB
    NOT NULL DEFAULT '[]'::jsonb;

-- Cria a tabela utilizada para persistir as sessões administrativas.
CREATE TABLE IF NOT EXISTS public.session (
    sid VARCHAR NOT NULL PRIMARY KEY,
    sess JSON NOT NULL,
    expire TIMESTAMP(6) NOT NULL
);

CREATE INDEX IF NOT EXISTS "IDX_session_expire"
    ON public.session (expire);

-- Permissões da aplicação. O usuário é informado pelo psql.
GRANT SELECT, INSERT, UPDATE
    ON TABLE public.products TO :"app_user";

GRANT SELECT, INSERT, UPDATE, DELETE
    ON TABLE public.session TO :"app_user";

GRANT USAGE, SELECT
    ON ALL SEQUENCES IN SCHEMA public TO :"app_user";

COMMIT;