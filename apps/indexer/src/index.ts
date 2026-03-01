import Fastify from 'fastify'
import websocket from '@fastify/websocket'
import cors from '@fastify/cors'
import { PrismaClient } from '@prisma/client'
import { ideasRoutes } from './routes/ideas'
import { votesRoutes } from './routes/votes'
import { scoutsRoutes } from './routes/scouts'
import { airdropRoutes } from './routes/airdrop'
import { milestonesRoutes } from './routes/milestones'
import { startEventIndexer } from './jobs/eventIndexer'
import { startResolutionEngine } from './jobs/resolutionEngine'
import { startReputationMinter } from './jobs/reputationMinter'
import { startMerkleGenerator } from './jobs/merkleGenerator'

// ─── Startup helpers ──────────────────────────────────────────────────────────

// Seed demo ideas if the database is empty. Idempotent — skips existing rows.
async function seedDemoIfEmpty() {
  const db = new PrismaClient()
  try {
    const count = await db.idea.count()
    if (count > 0) return

    const NOW    = new Date()
    const PAST   = (h: number) => new Date(NOW.getTime() - h * 3_600_000)
    const FUTURE = (h: number) => new Date(NOW.getTime() + h * 3_600_000)

    const DEAD = '0x000000000000000000000000000000000000dEaD'

    const active = [
      { onchainId: 'demo-1', title: 'AI copilot that reviews smart contracts before you sign them', description: 'A browser extension that intercepts any wallet transaction, decompiles the contract being called, and gives you a plain-English risk summary before you click Approve. No more blind signing. Integrates with MetaMask, Coinbase Wallet, and Privy embedded wallets.', category: 'Security',    yesWeight: 8400, noWeight: 1200, publishedAt: PAST(40), closesAt: FUTURE(29) },
      { onchainId: 'demo-2', title: 'On-chain reputation passport for freelancers',                 description: 'A soulbound NFT that aggregates your work history across Upwork, Fiverr, GitHub, and on-chain DAOs into a single verifiable credential. Clients can instantly see your track record without trusting a centralized platform.',                                                              category: 'Identity',   yesWeight: 6200, noWeight: 900,  publishedAt: PAST(20), closesAt: FUTURE(49) },
      { onchainId: 'demo-3', title: 'Prediction market for VC funding rounds',                      description: 'Let the crowd bet on which startups will close their next funding round within 90 days. Verified outcome via public Crunchbase data. Early believers in the right founders earn a cut of the prize pool. Think Polymarket but for private market deal flow.',                          category: 'DeFi',       yesWeight: 4100, noWeight: 3800, publishedAt: PAST(10), closesAt: FUTURE(59) },
      { onchainId: 'demo-4', title: 'Decentralised Airbnb where hosts get paid instantly in USDC',  description: 'A peer-to-peer home rental protocol where payment is held in an escrow smart contract, released automatically on check-in confirmation. No platform taking 15% fees. Reviews stored on-chain so they can\'t be gamed or deleted.',                                                    category: 'Marketplace', yesWeight: 5500, noWeight: 2200, publishedAt: PAST(30), closesAt: FUTURE(39) },
    ]

    for (const idea of active) {
      await db.idea.create({
        data: {
          ...idea, status: 'active', isAnonymous: false, founderAddr: DEAD, pmfScore: null, curveAddr: null,
          votes: { create: [
            { voterAddr: '0xaaaa000000000000000000000000000000000001', direction: 'yes', weight: idea.yesWeight * 0.6,  tier: 1 },
            { voterAddr: '0xaaaa000000000000000000000000000000000002', direction: 'yes', weight: idea.yesWeight * 0.25, tier: 2 },
            { voterAddr: '0xaaaa000000000000000000000000000000000003', direction: 'yes', weight: idea.yesWeight * 0.15, tier: 3 },
            { voterAddr: '0xbbbb000000000000000000000000000000000001', direction: 'no',  weight: idea.noWeight,         tier: 2 },
          ]},
        },
      })
    }

    const won = [
      { onchainId: 'demo-won-1', title: 'Token-gated group chats that pay you to participate',           description: 'A messaging app where every group has a native token. Active members who drive engagement earn token rewards funded by new member admission fees. The more valuable the conversation, the more the token is worth. Discord meets friend.tech, built on Base.', category: 'Social',    yesWeight: 12000, noWeight: 2000, pmfScore: 86, publishedAt: PAST(80), closesAt: PAST(11), curveAddr: '0x75574c9a30345dc2affbde778efef41c18b1e351' },
      { onchainId: 'demo-won-2', title: 'GitHub for hardware — open source PCB designs with royalty splits', description: 'A platform where hardware engineers publish circuit board designs as NFTs. Anyone can manufacture and sell the product; a royalty is automatically paid to the original designer on every sale verified via NFC chip. Turns open hardware into a business model.',                        category: 'Hardware',  yesWeight: 9800,  noWeight: 1500, pmfScore: 79, publishedAt: PAST(90), closesAt: PAST(21), curveAddr: null },
    ]

    for (const idea of won) {
      await db.idea.create({
        data: {
          ...idea, status: 'won', isAnonymous: false, founderAddr: DEAD,
          votes: { create: [
            { voterAddr: '0xcccc000000000000000000000000000000000001', direction: 'yes', weight: idea.yesWeight * 0.5, tier: 1 },
            { voterAddr: '0xcccc000000000000000000000000000000000002', direction: 'yes', weight: idea.yesWeight * 0.3, tier: 2 },
            { voterAddr: '0xcccc000000000000000000000000000000000003', direction: 'yes', weight: idea.yesWeight * 0.2, tier: 3 },
            { voterAddr: '0xdddd000000000000000000000000000000000001', direction: 'no',  weight: idea.noWeight,        tier: 2 },
          ]},
        },
      })
    }

    const graveyard = [
      { onchainId: 'demo-rip-1', title: 'Crypto-native coffee subscription with NFT loyalty cards', description: 'Monthly coffee subscription where your loyalty card is an NFT that accrues points on-chain. Points can be traded or redeemed across any partner café. The crowd said no — market saturation and unclear crypto value-add.', category: 'Consumer', yesWeight: 1200, noWeight: 7800, pmfScore: 13, publishedAt: PAST(85), closesAt: PAST(16) },
    ]

    for (const idea of graveyard) {
      await db.idea.create({
        data: {
          ...idea, status: 'graveyard', isAnonymous: false, founderAddr: DEAD, curveAddr: null,
          votes: { create: [
            { voterAddr: '0xeeee000000000000000000000000000000000001', direction: 'yes', weight: idea.yesWeight,        tier: 3 },
            { voterAddr: '0xeeee000000000000000000000000000000000002', direction: 'no',  weight: idea.noWeight * 0.6,   tier: 1 },
            { voterAddr: '0xeeee000000000000000000000000000000000003', direction: 'no',  weight: idea.noWeight * 0.4,   tier: 2 },
          ]},
        },
      })
    }

    console.log('[seed] demo data seeded successfully')
  } catch (err) {
    console.error('[seed] failed — continuing without demo data:', err)
  } finally {
    await db.$disconnect()
  }
}

// Wire demo content — curve addresses + bull/bear analysis for all demo ideas.
// Runs every startup, only updates fields that are still null.
async function wireDemoContent() {
  const db = new PrismaClient()
  try {
    const DEMO_CONTENT: Record<string, { bullCase: string; bearCase: string; curveAddr?: string }> = {
      'demo-1': {
        bullCase: 'Browser extensions are a proven distribution wedge. Blind signing is a universal pain point — every crypto user has felt it. High retention product with built-in virality: you share it before every transaction.',
        bearCase: 'Requires constant maintenance as contracts evolve. False positives will cause users to disable it. Wallet providers may build this natively and cut off the extension.',
      },
      'demo-2': {
        bullCase: 'Soulbound credentials are inevitable — this is LinkedIn for web3. Massive TAM across all remote work. Network effects lock in early movers permanently.',
        bearCase: 'Aggregating across Web2 + Web3 platforms is deeply complex. Privacy concerns are real. Employers may resist adopting a new credential standard.',
      },
      'demo-3': {
        bullCase: 'Polymarket proved massive liquidity exists for real-world outcomes. VC deal flow is verifiable via Crunchbase. Unique alpha source that attracts serious money.',
        bearCase: 'Close vote split signals market skepticism. Information asymmetry favours insiders. Regulatory risk as a securities-adjacent product is significant.',
      },
      'demo-4': {
        bullCase: 'Airbnb takes 15–20% in fees — massive disintermediation opportunity. Escrow smart contracts solve the trust problem elegantly without a middleman.',
        bearCase: 'Legal liability for physical property disputes is hard to avoid. Identity verification off-chain is still required. Airbnb has a massive moat in trust and brand.',
      },
      'demo-won-1': {
        bullCase: 'friend.tech proved people pay to be in rooms with people they respect. Native token creates powerful incentive alignment between hosts and members.',
        bearCase: 'Most groups go stale — retention is the core risk. Token mechanics can create pump-and-dump dynamics that destroy the community they were meant to incentivise.',
        curveAddr: '0x75574c9a30345dc2affbde778efef41c18b1e351',
      },
      'demo-won-2': {
        bullCase: 'Open-source hardware is exploding. NFC royalty verification is an elegant primitive. The creator economy for hardware engineers is completely wide open.',
        bearCase: 'Manufacturing rights enforcement across jurisdictions is an unsolved legal problem. The market of hardware engineers who publish designs is still small.',
      },
      'demo-rip-1': {
        bullCase: 'Loyalty programs are stale and ripe for disruption. NFT ownership creates a secondary market for loyalty points that traditional schemes cannot offer.',
        bearCase: 'Coffee is a low-margin hyperlocal business. Crypto adds friction without solving a real consumer problem. The crowd saw no compelling wedge.',
      },
    }

    for (const [onchainId, content] of Object.entries(DEMO_CONTENT)) {
      await db.idea.updateMany({
        where: { onchainId, bullCase: null },
        data:  { bullCase: content.bullCase, bearCase: content.bearCase },
      })
      if (content.curveAddr) {
        await db.idea.updateMany({
          where: { onchainId, curveAddr: null },
          data:  { curveAddr: content.curveAddr },
        })
      }
    }
  } finally {
    await db.$disconnect()
  }
}

const app = Fastify({ logger: true })

app.register(cors, { origin: process.env.CORS_ORIGIN || '*' })
app.register(websocket)

app.get('/', async () => ({ status: 'ok', service: 'pitchdrop-indexer' }))
app.get('/health', async () => ({ status: 'ok', service: 'pitchdrop-indexer' }))

app.register(ideasRoutes)
app.register(votesRoutes)
app.register(scoutsRoutes)
app.register(airdropRoutes)
app.register(milestonesRoutes)

const start = async () => {
  try {
    await seedDemoIfEmpty()
    await wireDemoContent()
    await app.listen({ port: Number(process.env.PORT) || 3001, host: '0.0.0.0' })
    // Start the on-chain event indexer after the HTTP server is up.
    // No-ops gracefully if contract addresses are not set.
    startEventIndexer().catch((err) => {
      app.log.error({ err }, '[indexer] eventIndexer crashed')
    })
    startResolutionEngine().catch((err) => {
      app.log.error({ err }, '[resolver] resolutionEngine crashed')
    })
    startReputationMinter().catch((err) => {
      app.log.error({ err }, '[reputationMinter] crashed')
    })
    startMerkleGenerator().catch((err) => {
      app.log.error({ err }, '[merkleGenerator] crashed')
    })
  } catch (err) {
    app.log.error(err)
    process.exit(1)
  }
}

start()
