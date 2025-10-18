## Base Splitwise — Edge-native group settles for Base Sepolia

This repository contains a single Next.js (App Router) application that runs all server logic on the Edge runtime. The product flow:

- Upload a receipt and normalize the data using **Ollama Cloud** (`qwen3-vl:235b-cloud`).
- Statlessly sign invite payloads with Web Crypto (HMAC-SHA256) and share lightweight links.
- Let invitees self-select the items they consumed and compute per-member totals locally.
- Settle outstanding balances on **Base Sepolia** through a minimal `GroupSplit` contract using **ethers v6**.
- Surface monthly/category summaries, AI-generated insights, and static personalized deals from local history.

### Tech summary

- Next.js 15 App Router · Edge route handlers (`runtime = 'edge'`).
- TypeScript-first codebase with Tailwind CSS, shadcn/ui (Button/Input/Textarea/Card/Badge/Table/Tabs/Sheet/Dialog/Toast).
- Local-only persistence via `localStorage`; invites are signed with `INVITE_SECRET` using Web Crypto.
- No Node-only APIs in the Edge paths.

## Setup

1. Install dependencies:

   ```bash
   npm install
   ```

2. Copy environment variables:

   ```bash
   cp .env.local.example .env.local
   ```

   Populate the values:

   - `NEXT_PUBLIC_CONTRACT_ADDRESS` — deployed `GroupSplit` contract on Base Sepolia.
   - `OLLAMA_API_KEY` — Ollama Cloud API key (used by `/api/ocr` and `/api/insights`).
   - `INVITE_SECRET` — random string for signing invite payloads (HMAC-SHA256).

   > If you previously stored credentials in `.env`, rename it to `.env.local`.

3. (Optional) Deploy the contract once locally using Hardhat:

   ```bash
   cd contracts
   npm install
   npx hardhat compile
   npx hardhat run scripts/deploy.ts --network baseSepolia
   ```

   Copy the printed address into `NEXT_PUBLIC_CONTRACT_ADDRESS`.

4. Run the development server:

   ```bash
   npm run dev
   ```

   Visit `http://localhost:3000` to access the landing page.

## Key routes

- `/upload` — Upload receipt → OCR via Qwen3-VL → edit normalized data → create signed invite.
- `/join` — Verify invite token → interactive item selection → per-member totals → save locally.
- `/settle` — Connect wallet → ensure Base Sepolia → pay outstanding balances on-chain.
- `/dashboard` — Monthly/category summaries, AI insights (`/api/insights`), static deals.

API handlers (Edge runtime):

- `POST /api/ocr` — Validates payload, calls Ollama Cloud, enforces `OCRDoc` schema.
- `POST /api/invite/create` — Signs `{ group, expense }` with `INVITE_SECRET`, returns invite URL.
- `GET /api/invite/verify` — Verifies and returns the invite snapshot.
- `POST /api/insights` — Sends history to Qwen3-VL and validates strict `{ findings, tips }`.

## Notes

- Route handlers and invite signing rely on Web Crypto — no Node-specific APIs are used.
- The invite token is a base64url-encoded payload + signature. Rotate `INVITE_SECRET` to invalidate outstanding tokens.
- Local history lives in `localStorage`; removing browser data clears expenses.
- `settle` calls interpret the share value as ETH. Adjust the amount field before sending if you need a conversion.
- Tailwind + shadcn/ui components are wired through `components.json`; run `npx shadcn@latest add …` to extend.

## Scripts

- `npm run dev` — start Next.js locally.
- `npm run build` — production build (Edge).
- `npm run lint` — lint with ESLint.

Happy hacking on Base 🧾⚡️
