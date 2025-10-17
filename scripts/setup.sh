#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT_DIR"

API_ENV="$ROOT_DIR/apps/api/.env"
API_ENV_EXAMPLE="$ROOT_DIR/apps/api/.env.example"

if [[ ! -f "$API_ENV" ]]; then
  if [[ -f "$API_ENV_EXAMPLE" ]]; then
    cp "$API_ENV_EXAMPLE" "$API_ENV"
    echo "[setup] Seeded apps/api/.env from example. Update secrets after setup."
  else
    echo "[setup] Error: missing apps/api/.env and no example template found."
    exit 1
  fi
fi

echo "[setup] Installing workspace dependencies"
npm install

echo "[setup] Pushing Prisma schema to SQLite"
npm --workspace apps/api exec prisma db push

echo "[setup] Generating Prisma client"
npm --workspace apps/api exec prisma generate

cat <<'EOM'

[setup] Complete.
Next steps:
  1. Fill in environment variables: cp env.example .env && cp apps/api/.env.example apps/api/.env
  2. Run `npm start` to launch API + web apps
EOM
