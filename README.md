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

1. Clean Install dependencies:

   ```bash
   npm ci
   ```

   or

   ```bash
   npm install
   ```

2. Copy environment variables:

   ```bash
   cp .env.local.example .env.local
   ```

   Populate the values:

   - `NEXT_PUBLIC_CONTRACT_ADDRESS` - deployed `GroupSplit` contract on Base Sepolia.
   - `OLLAMA_API_KEY` - Ollama Cloud API key (used by `/api/ocr` and `/api/insights`).
   - `INVITE_SECRET` - random string for signing invite payloads (HMAC-SHA256).
   - `NEXT_PUBLIC_SUPABASE_URL` - Supabase project URL from **Project Settings → API**.
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY` - Supabase anon key from the same settings screen.
   - `IPINFO_TOKEN` - optional but recommended; enables IP-based country fallback (see *Geolocation* below).

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

### Supabase authentication

1. Create a Supabase project (or open an existing one) and copy the project URL and anon key into the new environment variables above.
2. In **Authentication -> Providers**, enable **Google** and paste an OAuth 2.0 Client ID/secret that you create in the Google Cloud Console (APIs & Services -> Credentials -> Create Credentials -> OAuth client ID, type: Web). Set the authorized redirect URI to `http://localhost:3000/auth/callback` now and add your production domain before deploying.
3. Open the Supabase SQL editor and run the statements below to prepare the metadata table the app expects:

   ```sql
   -- User table linked to auth.users
   CREATE TABLE public.users (
     id UUID PRIMARY KEY REFERENCES auth.users(id) NOT NULL,
     name TEXT NOT NULL,
     email TEXT NOT NULL UNIQUE
   );

   -- Trigger to insert user metadata into public.users after signup
   CREATE OR REPLACE FUNCTION public.create_new_user()
   RETURNS TRIGGER AS $$
   BEGIN
     INSERT INTO public.users (id, name, email)
     VALUES (
       NEW.id,
       NEW.raw_user_meta_data->>'full_name',
       NEW.email
     );
     RETURN NEW;
   END;
   $$ LANGUAGE plpgsql SECURITY DEFINER;

   -- Automatically run create_new_user() after a new auth.users insert
   CREATE TRIGGER on_auth_user_created
     AFTER INSERT ON auth.users
     FOR EACH ROW
     EXECUTE FUNCTION public.create_new_user();

   -- Enable Row-Level Security on public.users
   ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
   ```

4. Add Row Level Security policies that allow users to read and update their own row as needed for your feature set.
5. Supabase maintains an up-to-date Next.js SSR guide if you need deeper integration details: <https://supabase.com/docs/guides/auth/server-side/nextjs>.

### Geolocation

- When a receipt is uploaded the client first inspects `navigator.language` and `navigator.languages` to infer a region hint directly from the browser.
- If no reliable locale is found the app calls the edge route `/api/geolocation`, which prefers Vercel/Cloudflare hint headers and otherwise falls back to the IPInfo API when `IPINFO_TOKEN` is set.
- Create an IPInfo Lite token at <https://ipinfo.io/dashboard/lite> and place that value in the `IPINFO_TOKEN` environment variable so the fallback can resolve a country code.
- The resolved country metadata is forwarded with the OCR request so the LLM can adjust currency and tax normalization for your region.

## Key routes

- `/upload` — Upload receipt → OCR via Qwen3-VL → edit normalized data → create signed invite.
- `/join` — Verify invite token → interactive item selection → per-member totals → save locally.
- `/settle` — Connect wallet → ensure Base Sepolia → pay outstanding balances on-chain.
- `/dashboard` — Monthly/category summaries, AI insights (`/api/insights`), static deals.

API handlers (Edge runtime):

- `POST /api/sequentialOCR` — Validates payload, calls Ollama Cloud, enforces `ItemsEnvelope` and `Costs` schema.
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
