\set ON_ERROR_STOP on
CREATE ROLE :"app_user" LOGIN PASSWORD :'app_password';
GRANT CONNECT ON DATABASE :"db_name" TO :"app_user";
GRANT USAGE ON SCHEMA public TO :"app_user";

-- Permissões mínimas para as operações implementadas pela API.
GRANT SELECT, UPDATE ON TABLE products TO :"app_user";
GRANT SELECT, INSERT ON TABLE orders TO :"app_user";
GRANT INSERT ON TABLE order_items TO :"app_user";
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO :"app_user";
