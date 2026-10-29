#!/bin/sh
set -eu

# Executado apenas na inicialização de um volume PostgreSQL vazio.
# Os parâmetros são passados ao psql sem interpolação direta no SQL.
psql --username "$POSTGRES_USER" --dbname "$POSTGRES_DB" \
  --set=ON_ERROR_STOP=1 \
  --set=app_user="$APP_DB_USER" \
  --set=app_password="$APP_DB_PASSWORD" \
  --set=db_name="$POSTGRES_DB" \
  --file=/scripts/create-app-user.sql \
  --file=/scripts/migrations/001_admin_panel.sql \
  --file=/scripts/migrations/002_order_management.sql