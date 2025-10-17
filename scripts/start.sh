#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT_DIR"

missing_env=false
for file in ".env" "apps/api/.env"; do
  if [[ ! -f "$file" ]]; then
    printf '[start] Warning: missing %s\n' "$file"
    missing_env=true
  fi
done

if [[ "$missing_env" = true ]]; then
  echo "[start] Create the missing env files (see env.example) before continuing."
fi

echo "[start] Launching API and web workspaces (parallel)"
npm run dev
