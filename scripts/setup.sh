#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT_DIR"

echo "➤ Installing Node dependencies"
npm install

if [[ -f ".env.local" ]]; then
  echo "✓ .env.local already exists"
elif [[ -f ".env.local.example" ]]; then
  cp .env.local.example .env.local
  echo "✓ Created .env.local from .env.local.example — update the values before running the app"
else
  echo "⚠️  Missing .env.local.example — create .env.local with OLLAMA_API_KEY, INVITE_SECRET, NEXT_PUBLIC_CONTRACT_ADDRESS" >&2
fi

echo "Setup complete. Next steps:"
echo "  1. Fill in .env.local with your Ollama key, invite secret, and contract address."
echo "  2. (Optional) Deploy contracts/GroupSplit.sol and update NEXT_PUBLIC_CONTRACT_ADDRESS."
