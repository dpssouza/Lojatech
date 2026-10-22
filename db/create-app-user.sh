#!/bin/sh
set -eu

# Executado apenas na inicialização de um volume PostgreSQL vazio.
# As variáveis são passadas como parâmetros do psql; os valores não são
# interpolados diretamente em SQL pelo shell.
psql --username "$POSTGRES_USER" --dbname "$POSTGRES_DB" \
  --set=ON_ERROR_STOP=1 \
  --set=app_user="$APP_DB_USER" \
  --set=app_password="$APP_DB_PASSWORD" \
  --set=db_name="$POSTGRES_DB" \
  --file=/scripts/create-app-user.sql
