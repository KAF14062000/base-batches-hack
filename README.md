# base-batches-hack

**SplitBase** — a beginner-friendly onchain app for the Base Batches hackathon.
Upload/enter a bill → create a “split” → friends settle with one tap on **Base Sepolia (testnet)** → verify on **Basescan**.

> This starter is intentionally minimal so a new team can ship in days, not weeks. You can layer on Basenames, Base Account (passkeys + sponsored tx), and Mini Apps later.

---

## ✨ What’s included

* **`contracts/`** — Hardhat project with a tiny `GroupSplit.sol` contract + deploy script
* **`apps/web/`** — Vite + React (+ ethers v6) web app to call the contract (connect → create split → settle)

---

## 📌 Demo Links (fill these before submission)

* **Live App:** `https://<your-vercel-or-netlify-url>`
* **Contract (Base Sepolia):** `0x...`
* **Basescan:** deployment `https://sepolia.basescan.org/address/0x...`
* **Sample Tx:** `https://sepolia.basescan.org/tx/0x...`
* **Video (≥ 1 min):** `https://…`

---

## 🧠 What you’ll learn (mini-glossary)

* **Base Sepolia:** a free test network—perfect for demos
* **Wallet:** your onchain account in the browser (MetaMask, Coinbase Wallet)
* **RPC:** endpoint used to send transactions to the network
* **Contract ABI:** JSON that describes a contract’s functions/events (used by the frontend)
* **Events:** onchain logs that make demos verifiable on Basescan

---

## 🏗️ Architecture (high level)

```
Browser (Vite + React + ethers)
   └── Connect wallet → switch/add Base Sepolia
   └── Call contract methods (createSplit / settle)

Smart Contract (GroupSplit.sol on Base Sepolia)
   ├── createSplit(memo, people[], shares[]) -> emits SplitCreated
   └── settle(id, to) payable -> transfer ETH + emits Settled

Basescan (Explorer)
   └── Shows deployment, transactions, and emitted events for judges to verify
```

---

## 📁 Repo Layout

```
base-batches-hack/
├─ README.md
├─ LICENSE
├─ .gitignore
├─ contracts/                # Hardhat
│  ├─ contracts/GroupSplit.sol
│  ├─ scripts/deploy.js
│  ├─ hardhat.config.js
│  ├─ package.json
│  └─ .env.example
└─ apps/
   └─ web/                   # Vite + React + ethers
      ├─ index.html
      ├─ vite.config.js
      ├─ package.json
      └─ src/
         ├─ App.jsx
         ├─ main.jsx
         ├─ config.js        # put your contract address here
         └─ abi/GroupSplit.json
```

---

## ⚡ Quick Start

### 0) Prereqs

* Node.js **20+**, Git
* Browser wallet (MetaMask or Coinbase Wallet)
* **Free** test ETH on **Base Sepolia (chainId 84532)** — grab from any faucet

### 1) Deploy the contract (Base Sepolia)

```bash
cd contracts
cp .env.example .env
# Put your TEST private key (hex) into .env (DEPLOYER_KEY)
npm install
npm run build
npm run deploy:base-sepolia
```

Copy the printed **contract address** and keep it handy.

### 2) Run the web app locally

```bash
cd ../apps/web
npm install
# Set the contract address in src/config.js:
# export const CONTRACT_ADDRESS = "0xYOUR_DEPLOYED_ADDRESS";
npm run dev
```

Open the shown URL → **Connect Wallet** → if needed, click **Switch to Base Sepolia**.
Now test:

* **Create Split** — enter `memo`, comma-separated `people` (addresses), and matching `shares` (e.g., `50,50`) → **Create Split**
* **Settle** — enter `splitId`, `to` address, and a small `amountEth` (e.g., `0.001`) → **Send Payment**

### 3) Verify on Basescan

After each tx, click the tx hash in your wallet to open it on **Basescan**.
Add those links to this README under **Demo Links** before you submit.

---

## 🧪 What the contract does (simple)

```solidity
// create a split and emit an event judges can see
function createSplit(string memo, address[] people, uint256[] shares) returns (uint256 id)

// send ETH to a recipient and emit a Settled event
function settle(uint256 id, address to) payable
```

**Events**

* `SplitCreated(id, creator, memo, people, shares)`
* `Settled(id, payer, to, amount)`

This “events-first” design makes your demo easy to verify.

---

## 🌐 Deploy the web app (for judges)

### Vercel (quickest)

* In the Vercel dashboard → **Add New Project** → Import `apps/web` folder from your GitHub repo
* Build command: default (`vite`)
* Make sure `src/config.js` has your contract address
* Deploy → paste the live URL in **Demo Links**

### Netlify (alternative)

* New site from Git → pick `apps/web`
* Build: `npm run build`, Publish directory: `dist/`

---

## 🎥 Video script (90–120 seconds)

1. **Intro** — “SplitBase: split and settle bills on Base testnet.”
2. **Demo** — connect → create split → settle → open Basescan links.
3. **Problem** — group bill splits are awkward and slow.
4. **Solution** — one-tap settlement with onchain proof.
5. **Architecture** — React + ethers + `GroupSplit` on Base Sepolia.

Record your screen + voice; keep it punchy.

---

## ✅ Submission Checklist

* Public **live app URL**
* **Open-source** repository (this project)
* **Video** (≥ 1 min) covering Intro → Demo → Problem → Solution → Architecture
* **Proof on Base Sepolia**: deployment + ≥1 test transaction (Basescan links in README)
* (Nice-to-have) Call out support or plans for **Basenames** / **Base Account (passkeys, sponsored tx)**

---

## 🧩 Configuration Details

### contracts/.env

```
DEPLOYER_KEY=your_test_private_key_hex_here
RPC_URL=https://sepolia.base.org
BASESCAN_API_KEY=optional_if_you_want_verify
```

### apps/web/src/config.js

```js
export const CONTRACT_ADDRESS = "0x...";  // paste from your deployment
export const CHAIN_ID = 84532;            // Base Sepolia
export const RPC_URL = "https://sepolia.base.org"; // used for reads if needed
```

---

## 🛠️ Local GitHub publish (optional helper)

```bash
# From repo root
git init -b main
git add .
git commit -m "chore: initial commit (Base Batches starter)"
gh repo create base-batches-hack --public --source=. --remote=origin --push
```

---

## 🧱 Learn by doing (short study plan)

* **Day 1:** Deploy the contract; read your deployment on Basescan
* **Day 2:** Wire the frontend; create a split; check the `SplitCreated` event
* **Day 3:** Run 5–10 tiny `settle` payments among team wallets; collect links
* **Day 4:** Deploy the web app; fix copy; shoot the demo video
* **Day 5+:** Optional upgrades (below)

---

## 🔭 Extension Ideas (post-MVP)

* **Basenames:** allow `name.base` in the “people/recipient” field (resolve to addresses)
* **Base Account:** passkey sign-in + **sponsored tx** for gasless UX
* **OCR:** parse bill images to prefill people/shares (e.g., Tesseract.js)
* **Mini App:** package a lightweight mini app for distribution

---

## 🧰 Troubleshooting

* **No wallet detected** → install MetaMask or Coinbase Wallet
* **Wrong network** → click “Switch to Base Sepolia” in the app
* **Insufficient funds** → get more Base Sepolia test ETH; keep amounts tiny (0.0005–0.002)
* **Contract call fails** → confirm `CONTRACT_ADDRESS` and that you deployed this exact `GroupSplit.sol`
* **Array mismatch** → `people.length` must equal `shares.length`

---

## 🔒 Security & Hygiene

* Use **test** keys only; never real/mainnet secrets
* `.env` is git-ignored; don’t commit it
* If you ever commit a secret, **rotate it immediately**

---

## 📜 License

MIT — see `LICENSE`.

---

### Credits

Built as a learning-friendly starter to help new teams ship a working Base demo fast.
