#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT_DIR"

if [[ ! -d "node_modules" ]]; then
  echo "Dependencies missing. Run scripts/setup.sh first." >&2
  exit 1
fi

if [[ ! -f ".env.local" ]]; then
  echo "⚠️  .env.local not found. Copy .env.local.example and populate the values before starting." >&2
fi

echo "Starting Next.js development server on http://localhost:3000"
exec npm run dev
