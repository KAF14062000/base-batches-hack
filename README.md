# SplitBase (Base Batches Starter)

Upload a receipt → AI parses the bill → split items across your group → settle on-chain on Base Sepolia (testnet) → verify on Basescan.

This is a minimal, hackathon-friendly monorepo with a contract, an API, and a React web app.

---

## What’s Inside

- `contracts/` — Hardhat project with `GroupSplit.sol` and a deploy script
- `apps/api/` — Express + Prisma + SQLite service (OCR, groups, expenses, allocations, insights, deals)
- `apps/web/` — Vite + React (+ ethers v6 + chart.js) frontend (upload → allocate → settle)

---

## Repo Layout

```
base-batches-hack/
├─ README.md
├─ LICENSE
├─ env.example
├─ scripts/
│  ├─ setup.sh
│  └─ start.sh
├─ contracts/
│  ├─ contracts/GroupSplit.sol
│  ├─ scripts/deploy.js
│  ├─ hardhat.config.js
│  ├─ package.json
│  └─ .env.example
└─ apps/
   ├─ api/
   │  ├─ src/index.js
   │  ├─ src/llm.js
   │  ├─ src/prompts/{ocr,categorize,insights}.md
   │  ├─ prisma/schema.prisma
   │  ├─ package.json
   │  └─ .env.example
   └─ web/
      ├─ index.html
      ├─ vite.config.js
      ├─ package.json
      └─ src/
         ├─ App.jsx
         ├─ state/AppContext.jsx
         ├─ components/AppShell.jsx
         ├─ pages/{Upload,Group,Expense,Dashboard,Deals}Page.jsx
         ├─ abi/GroupSplit.json
         └─ config.js
```

---

## Quick Start

- Prereqs: Node 20+, Git, a browser wallet (MetaMask/Coinbase Wallet), Base Sepolia test ETH

1) One-time setup from repo root

```
npm run setup
```

This seeds `apps/api/.env` if missing, installs workspace deps, and prepares Prisma (SQLite).

2) Start API + Web together (dev)

```
npm start
```

By default, the API listens on `http://localhost:4000` and the web app on `http://localhost:5173`.

3) Configure the contract address for the web app

- Set the deployed address in `apps/web/src/config.js`:
  - `export const CONTRACT_ADDRESS = "0xYOUR_CONTRACT";`

---

## Environment

- Root (optional): copy `env.example` → `.env` for shared values like Ollama
- API: copy `apps/api/.env.example` → `apps/api/.env`

Required keys

- `apps/api/.env`:
  - `DATABASE_URL=file:./prisma/dev.sqlite`
  - `PORT=4000`
  - `APP_BASE_URL=http://localhost:5173`
  - `OLLAMA_API_KEY=<your_ollama_token>`
  - `OLLAMA_API_BASE=https://ollama.com/api`
  - `SMTP_*` (optional for email invites)

Web configuration

- The web app reads `VITE_API_BASE_URL` (optional). Defaults to `http://localhost:4000` for local dev.

---

## Contracts (Base Sepolia)

1) Deploy

```
cd contracts
cp .env.example .env
npm install
npm run build
npm run deploy:base-sepolia
```

- Put your test private key in `contracts/.env` (`DEPLOYER_KEY`), and RPC in `RPC_URL`.
- Copy the printed contract address and paste it into `apps/web/src/config.js`.

2) What the contract does

- `createSplit(memo, people[], shares[])` → emits `SplitCreated`
- `settle(id, to)` (payable) → transfers ETH and emits `Settled`

Source: contracts/contracts/GroupSplit.sol

---

## API (Express + Prisma)

- Start in dev (from repo root): `npm start` or `npm run dev`
- Schema: apps/api/prisma/schema.prisma
- Prompts: apps/api/src/prompts

Endpoints

- `GET /health` — health check
- `POST /ocr` — base64 or multipart image → normalized receipt JSON
- `POST /expenses` — create expense with items
- `GET /expenses/:id` — fetch expense + items + group
- `PATCH /expenses/:id` — update expense (e.g., `splitId`)
- `POST /expenses/:id/allocate` — save item allocations per group member
- `GET /groups/:id` — group with members and recent expenses
- `POST /groups` — create group (optional members)
- `POST /groups/:id/invite` — create invite (optionally emails via SMTP)
- `GET /users/:id/dashboard` — aggregates for charts
- `GET /users/:id/insights` — 30-day summary + tips (qwen3-vl)
- `GET /deals` — curated deals, filtered by recent categories

Quick check

```
curl -s http://localhost:4000/health
```

Notes

- The API uses the official `ollama` SDK directly in apps/api/src/index.js. A reusable helper also exists in apps/api/src/llm.js.

---

## Web (Vite + React)

- Dev server: `npm --workspace apps/web run dev`
- API base: `VITE_API_BASE_URL` (optional; default `http://localhost:4000`)
- Contract address: apps/web/src/config.js

User flows

- Upload: `/upload` → send image to `/ocr`, edit, save to `/expenses`
- Group: `/group/:groupId` → members, expenses, invites
- Expense: `/expense/:expenseId` → allocate items per member, save, settle
- Dashboard: `/dashboard` → charts via `/users/:id/dashboard`
- Deals: `/deals` → curated offers by recent categories

On-chain settlement

- Requires a browser wallet and Base Sepolia test ETH. The UI calls `settle(id, to)` on the configured contract address with an ETH value.

---

## Demo Links (fill before submission)

- Live App: https://<your-url>
- Contract (Base Sepolia): 0x...
- Basescan: https://sepolia.basescan.org/address/0x...
- Sample Tx: https://sepolia.basescan.org/tx/0x...
- Video (≥ 1 min): https://...

---

## Troubleshooting

- Wallet/network: use MetaMask/Coinbase Wallet and switch to Base Sepolia (84532)
- Missing env: ensure `apps/api/.env` exists (see example)
- Prisma: rerun `npm run setup` or `npm --workspace apps/api exec prisma db push`
- Contract calls: confirm `apps/web/src/config.js` has the deployed address

---

## License

MIT — see LICENSE

