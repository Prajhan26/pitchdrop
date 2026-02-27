# pitchdrop

> **The world's first perception market** — where the community bets on startup ideas before they're built, and being right early earns you a stake in what gets built next.

## Monorepo Structure

```
pitchdrop/
├── apps/
│   ├── web/          # Next.js 14 (App Router) — voting feed, submission, scout dashboard
│   ├── contracts/    # Foundry — 8 Solidity contracts on Base L2
│   ├── indexer/      # Fastify + Prisma + WebSocket — event indexer & tRPC API
│   └── agent/        # EigenCloud Sovereign Agent — AI evaluation, attestations, OFAC screening
├── packages/
│   ├── shared/       # TypeScript types, Zod schemas, ABI exports
│   ├── eslint-config/
│   └── typescript-config/
└── .github/
    └── workflows/    # CI/CD: test → lint → build → deploy
```

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | Next.js 14 (App Router), Tailwind CSS, shadcn/ui, Framer Motion |
| Auth & Wallets | Privy (embedded wallets + social login), wagmi v2 |
| Smart Contracts | Solidity ^0.8.24, Foundry, Base L2 (ERC-20, ERC-4337, ERC-8004) |
| Indexer | Fastify, Prisma, PostgreSQL (Railway), Upstash Redis |
| Verifiable Compute | EigenCloud (EigenCompute TEE + EigenAI + EigenDA) |
| Compliance | TRM Labs (OFAC screening inside TEE) |
| Geo-blocking | Cloudflare (US IP block + VPN detection) |
| Deployment | Vercel (web), Railway (indexer), EigenCloud (agent) |

## Smart Contracts (Base L2)

| Contract | Purpose |
|---|---|
| `IdeaRegistry.sol` | Idea storage, voting windows, resolution status |
| `VotingEngine.sol` | Weighted votes (reputation × time-decay), attestation events |
| `ConvictionToken.sol` | ERC-20 Conviction Instrument — one per winning idea (factory) |
| `BondingCurve.sol` | Price discovery, YES stake seeding, $69K graduation trigger |
| `BuildFund.sol` | 15% escrow, milestone-gated releases, immutable burn countdown |
| `AirdropDistributor.sol` | Merkle drop — tier-based YES voter allocations |
| `ReputationRegistry.sol` | Soulbound on-chain reputation scores (V2) |
| `SovereignAgent.sol` | ERC-8004 agent identity + fee routing |

## Development

```bash
# Install dependencies
pnpm install

# Run all apps in dev mode
pnpm dev

# Build all packages
pnpm build

# Run all tests
pnpm test

# Lint everything
pnpm lint
```

## Implementation Order

Follow the epic sequence in `epics.md`:

1. **Epic 1** — Foundation & User Identity (auth, wallets, geo-block)
2. **Epic 2** — Ideas & Voting Core Loop (feed, vote engine, 69-hour window)
3. **Epic 3** — Idea Submission (form, anonymous, AI preview, moderation)
4. **Epic 4** — Resolution & Reveal (resolution engine, PMF Score, attestations)
5. **Epic 5** — Airdrop & Streak Rewards (allocations, OFAC gate, claim)
6. **Epic 6** — Token Market & Build Fund (bonding curve, DEX graduation)
7. **Epic 7** — Scout & Reputation (leaderboard, reputation scoring)
8. **Epic 8** — Build Fund & Milestone Verification (Sovereign Agent evaluation)
