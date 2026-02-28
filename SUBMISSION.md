# pitchdrop — Sovereign Perception Market

## One-liner
A trustless arena where communities vote conviction on startup ideas before they're built.
The winning idea's token launches instantly. A Sovereign Agent running in EigenCloud TEE
resolves every outcome — no admin key, no company in the middle.

---

## The Problem

Prediction markets exist. Crowdfunding exists. What doesn't exist is a trustless way for a
crowd to express *conviction* on ideas before there's anything to fund — and have those
signals be verifiable, permanent, and economically meaningful.

Today that requires a company in the middle. An operator who can lie about outcomes,
rug the reward pool, or disappear.

---

## What We Built

**pitchdrop** is an ownerless perception market built on Base L2.

**The flow:**
1. Founders drop ideas. Community scouts vote YES/NO in a 69-hour window.
2. Time-decay weights reward early conviction: 3× in the first 12h, 2× mid, 1× late.
3. An idea that crosses **69% YES** wins. Its CONV token launches immediately for trading.
4. The bonding curve raises ETH. On graduation, liquidity migrates to Aerodrome DEX,
   15% goes to the BuildFund, and early voters receive vested CONV airdrops.
5. The builder submits milestone evidence → Sovereign Agent verifies → BuildFund releases.
6. No human can override any step. The EigenCloud TEE is the only authority.

---

## How We Use EigenCloud

The **Sovereign Agent** (`SovereignAgent.sol` — deployed, verified on Base Sepolia) runs
inside an EigenCloud Trusted Execution Environment. This gives three guarantees:

| Guarantee | What it means for pitchdrop |
|-----------|----------------------------|
| **Tamper-proof execution** | The bull/bear PMF scoring and vote resolution run inside hardware-isolated memory. Even the pitchdrop team cannot alter the outcome after a vote closes. |
| **Verifiable attestation** | Every resolved idea gets a `keccak256` hash of its full result (vote weights, timestamp, PMF score) stored on-chain as `eigenDaRef`. In production this blob is posted to EigenDA — Ethereum-grade data availability, not a centralized server. |
| **Trustless fund release** | When a builder submits milestone evidence, Claude AI inside the TEE evaluates it and triggers `BuildFund.release()`. No multisig, no human approval. |

### Agent modules (all implemented):
- **BullBear Evaluator** — generates PMF conviction score (0–100) for every active idea
- **Attestation Worker** — hashes won-idea results → EigenDA ref → `postAttestation()` on-chain
- **Milestone Evaluator** — Claude AI reviews builder evidence, approves/rejects fund release
- **OFAC Screener** — TRM Labs API screens every wallet on vote + airdrop claim (live on indexer)

The `SovereignAgent.sol` contract is deployed and ready to receive attestations.
The TEE execution is the production deployment step — the full architecture is wired.

---

## Live Demo

| | |
|-|-|
| **Frontend** | https://pitchdrop-web.vercel.app |
| **Indexer API** | https://pitchdropindexer-production.up.railway.app/health |
| **Agent page** | https://pitchdrop-web.vercel.app/agent |
| **Token market** | https://pitchdrop-web.vercel.app/token/demo-won-1?curve=0x75574c9a30345dc2affbde778efef41c18b1e351 |
| **GitHub** | https://github.com/Prajhan26/pitchdrop |

---

## Contracts — Base Sepolia (all verified)

| Contract | Address |
|----------|---------|
| SovereignAgent | [`0x83cE5Ff475742ff7B7DDe581c01369e4BA270Ad9`](https://sepolia.basescan.org/address/0x83cE5Ff475742ff7B7DDe581c01369e4BA270Ad9) |
| IdeaRegistry | [`0x2ff1280134678EDf046244160cd1DdF5369E1Be3`](https://sepolia.basescan.org/address/0x2ff1280134678EDf046244160cd1DdF5369E1Be3) |
| VotingEngine | [`0x0C7AEB84E87797A0962104051c224dbc64FE558f`](https://sepolia.basescan.org/address/0x0C7AEB84E87797A0962104051c224dbc64FE558f) |
| BondingCurveFactory | [`0x29D11C4AB7dCa6f513BE84A644634911dF233E6b`](https://sepolia.basescan.org/address/0x29D11C4AB7dCa6f513BE84A644634911dF233E6b) |
| BondingCurve (demo) | [`0x75574c9a30345dc2affbde778efef41c18b1e351`](https://sepolia.basescan.org/address/0x75574c9a30345dc2affbde778efef41c18b1e351) |
| ConvictionToken (CHAT) | [`0xfd5b4efff88175d427aee1d8ca88bc58a692520e`](https://sepolia.basescan.org/address/0xfd5b4efff88175d427aee1d8ca88bc58a692520e) |
| AirdropDistributor | [`0x736dFE720001BD6D50Def269250f47a6c26C89eB`](https://sepolia.basescan.org/address/0x736dFE720001BD6D50Def269250f47a6c26C89eB) |
| BuildFund | [`0x22aefD31f9B51036d971a8D8e1094547d118B087`](https://sepolia.basescan.org/address/0x22aefD31f9B51036d971a8D8e1094547d118B087) |
| ReputationRegistry | [`0x0073b7C2873Bd2f07aBaaD0C790663D1c1Cd14b3`](https://sepolia.basescan.org/address/0x0073b7C2873Bd2f07aBaaD0C790663D1c1Cd14b3) |

---

## Architecture

```
Scouts
  │  Next.js App Router · Privy embedded wallets · wagmi v3
  │
  ▼
VotingEngine.sol  ←→  IdeaRegistry.sol          (Base Sepolia)
  │
  │  on-chain events (getLogs polling)
  ▼
Indexer  (Fastify · Prisma · PostgreSQL · Railway)
  │  REST API + WebSocket
  ▼
Sovereign Agent  (EigenCloud TEE)
  ├── BullBear Evaluator    →  PMF score per idea
  ├── Attestation Worker    →  EigenDA blob → SovereignAgent.postAttestation()
  ├── Milestone Evaluator   →  Claude AI → BuildFund.release()
  └── OFAC Screener         →  TRM Labs → block sanctioned wallets
```

---

## Tech Stack

| Layer | Stack |
|-------|-------|
| Chain | Base L2 (Sepolia testnet) |
| Contracts | Solidity 0.8.24, Foundry, OpenZeppelin v5 |
| Agent | EigenCloud TEE, Node.js/TypeScript, viem |
| AI | Anthropic Claude claude-sonnet-4-6 (bull/bear + milestone eval) |
| Frontend | Next.js 15 App Router, React 19, wagmi v3, viem v2 |
| Auth/Wallets | Privy embedded wallets (email, Google, Twitter, or wallet) |
| Indexer | Fastify v4, Prisma v5, PostgreSQL |
| Infra | Vercel (web), Railway (indexer + DB) |

---

## What Makes This Different

Most hackathon "AI agents" are Claude with a webhook. pitchdrop's agent:

- **Controls real fund flows** — BuildFund and AirdropDistributor only accept calls from the verified TEE operator address
- **Has on-chain identity** — `SovereignAgent.sol` stores every attestation permanently, forever
- **Is multi-player** — scouts compete with real economic stakes, not simulated scores
- **Has verifiable computation** — every resolution is backed by a hash-committed attestation
- **Has no off switch** — even if the team disappears, the contracts and agent keep running

This is what trustless coordination looks like in practice.
