# pitchdrop — Sovereign Perception Market Agent

## One-liner
A verifiable sovereign agent that runs open-ended perception markets — communities bet conviction on startup ideas before they're built, and the agent coordinates everything: scoring, resolving, rewarding, attesting.

## The Problem
Prediction markets exist. Crowdfunding exists. What doesn't exist is a trustless way for a crowd to express *conviction* on ideas before there's anything to fund — and have those signals be verifiable, permanent, and economically meaningful.

Today that requires a company in the middle. An operator who can lie about outcomes, rug the reward pool, or disappear.

## What We Built
**pitchdrop** is an ownerless perception market — a community-run arena where scouts (early believers) stake conviction on startup ideas. Ideas that cross the PMF threshold graduate into live conviction token markets. Scouts who voted early earn airdrop allocations. No company in the middle.

The sovereign agent is the brain:
- Runs entirely inside an EigenCloud TEE
- Evaluates ideas using a bull/bear PMF scoring model
- Posts cryptographically committed attestations to the SovereignAgent contract
- Calls `resolveIdea()` on-chain when the voting window closes
- Generates Merkle roots for airdrop distributions
- Mints soulbound reputation NFTs to winning scouts
- Routes protocol fees autonomously — no owner key, no multisig

## Why This Is a Sovereign Agent

The challenge asks: *prove the agent ran this code, used this data, can upgrade only via this process, and keeps data inside its container.*

pitchdrop's SovereignAgent:

| Property | How we implement it |
|----------|-------------------|
| **Code verifiability** | EigenCloud TEE attests the exact binary running the evaluator |
| **Data integrity** | All scoring inputs (votes, weights, timing) are sourced from on-chain events — tamper-proof by definition |
| **Upgrade process** | Upgrades require owner + operator signature — no unilateral changes |
| **State privacy** | Agent's private scoring model runs inside the TEE container, never exposed |
| **Ownerlessness** | Protocol fees route to BuildFund autonomously; no human can intercept |

This is not a chatbot wrapper. It's infrastructure for open innovation at scale — exactly what EigenCloud was built for.

## Architecture

```
Scouts → Web App (Next.js / Privy embedded wallets)
            ↓
     VotingEngine.sol (Base Sepolia)
            ↓  on-chain events
     Indexer (Fastify + Prisma)
            ↓  polls + aggregates
     SovereignAgent (EigenCloud TEE)
         ├── bull/bear evaluator (Claude + custom PMF model)
         ├── attestation poster → SovereignAgent.sol
         ├── Merkle generator → AirdropDistributor.sol
         └── reputation minter → ReputationRegistry.sol (soulbound ERC-721)
```

## Contracts on Base Sepolia

| Contract | Address |
|----------|---------|
| IdeaRegistry | `0x2ff1280134678EDf046244160cd1DdF5369E1Be3` |
| VotingEngine | `0x0C7AEB84E87797A0962104051c224dbc64FE558f` |
| ConvictionTokenFactory | `0x3255458cb1a180135FA5928cc1dE3b4b6da168Bc` |
| BondingCurveFactory | `0x29D11C4AB7dCa6f513BE84A644634911dF233E6b` |
| AirdropDistributor | `0x736dFE720001BD6D50Def269250f47a6c26C89eB` |
| ReputationRegistry | `0x0073b7C2873Bd2f07aBaaD0C790663D1c1Cd14b3` |
| BuildFund | `0x22aefD31f9B51036d971a8D8e1094547d118B087` |
| SovereignAgent | `0x83cE5Ff475742ff7B7DDe581c01369e4BA270Ad9` |

## Tech Stack
- **Chain:** Base L2 (Sepolia testnet)
- **Contracts:** Solidity 0.8.24, Foundry, OpenZeppelin v5
- **Agent runtime:** EigenCloud TEE, Node.js, viem
- **Scoring model:** Anthropic Claude (bull/bear evaluator)
- **Frontend:** Next.js 16 App Router, wagmi v3, Privy embedded wallets
- **Indexer:** Fastify, Prisma, PostgreSQL, getLogs polling
- **Auth:** Privy (email, Google, Twitter, or wallet — all get an embedded wallet)

## Sovereign Agent Flow (end to end)

1. Founder drops a pitch → `IdeaRegistry.registerIdea()` on Base
2. Scouts vote YES/NO with time-decay weights (3× early, 2× mid, 1× late)
3. 69-hour window closes → SovereignAgent evaluates, calls `resolveIdea()`
4. Won ideas: agent posts TEE attestation, generates Merkle tree, sets root on-chain
5. Scouts claim CONV tokens via `AirdropDistributor.claim()` with their Merkle proof
6. Won ideas graduate to a linear bonding curve — community trades conviction
7. Agent mints soulbound reputation NFTs to winning scouts — on-chain scout identity

## What Makes This Different from "AI Agent" Projects

Most hackathon AI agents are Claude wrappers with a webhook. pitchdrop's agent:

- Has **economic stakes** — it controls real fund flows (BuildFund, airdrop distribution)
- Has **on-chain identity** — `SovereignAgent.sol` stores its attestations permanently
- Is **multi-player** — serves thousands of scouts simultaneously, each with different conviction weights
- Has **verifiable computation** — every resolve decision is backed by a TEE attestation
- Has **protocol-level permanence** — even if the team disappears, the contracts keep running

This is what ownerless coordination looks like in practice.

## GitHub
https://github.com/Prajhan26/pitchdrop

## Demo
https://pitchdrop-web.vercel.app/
