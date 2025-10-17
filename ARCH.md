# SplitBase System Diagram

```mermaid
flowchart TD
    subgraph Client["apps/web (Vite + React)"]
        Upload[Upload / Dashboard / Deals Routes]
        Wallet[Wallet (ethers v6)]
    end

    subgraph API["apps/api (Express + Prisma)"]
        OCR[POST /ocr<br/>qwen3-vl OCR + parse]
        Groups[Groups & Expenses CRUD]
        Allocations[POST /expenses/:id/allocate]
        Insights[GET /users/:id/insights]
        Deals[GET /deals]
        Prisma[(SQLite via Prisma Client)]
    end

    subgraph LLM["Ollama Cloud"]
        Model["qwen3-vl:235b-cloud"]
    end

    subgraph Chain["Base Sepolia"]
        Contract[GroupSplit.sol]
    end

    Upload -->|REST JSON| OCR
    Upload -->|REST JSON| Groups
    Upload -->|REST JSON| Allocations
    Upload -->|REST JSON| Deals
    Upload -->|Navigate| Insights
    Wallet -->|settle() tx| Contract

    OCR -->|chat() w/ schema| Model
    Insights -->|chat() JSON tips| Model

    Groups --> Prisma
    Allocations --> Prisma
    Insights --> Prisma

    Prisma -->|aggregates| Insights
    Prisma -->|expense data| Upload

    Contract -. emit events .-> Wallet
```
