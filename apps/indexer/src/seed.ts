/**
 * Demo seed script — run once before recording the demo video.
 *
 * Usage (with Railway DB):
 *   DATABASE_URL="postgresql://..." pnpm --filter @pitchdrop/indexer seed
 *
 * Usage (local):
 *   pnpm --filter @pitchdrop/indexer seed
 */

import { PrismaClient } from '@prisma/client'

const db = new PrismaClient()

const NOW   = new Date()
const PAST  = (hoursAgo: number) => new Date(NOW.getTime() - hoursAgo * 60 * 60 * 1000)
const FUTURE = (hoursFrom: number) => new Date(NOW.getTime() + hoursFrom * 60 * 60 * 1000)

// ─── Pre-written demo ideas ────────────────────────────────────────────────────

const ACTIVE_IDEAS = [
  {
    onchainId:   'demo-1',
    title:       'AI copilot that reviews smart contracts before you sign them',
    description: 'A browser extension that intercepts any wallet transaction, decompiles the contract being called, and gives you a plain-English risk summary before you click Approve. No more blind signing. Integrates with MetaMask, Coinbase Wallet, and Privy embedded wallets.',
    category:    'Security',
    yesWeight:   8400,
    noWeight:    1200,
    publishedAt: PAST(40),
    closesAt:    FUTURE(29),
  },
  {
    onchainId:   'demo-2',
    title:       'On-chain reputation passport for freelancers',
    description: 'A soulbound NFT that aggregates your work history across Upwork, Fiverr, GitHub, and on-chain DAOs into a single verifiable credential. Clients can instantly see your track record without trusting a centralized platform. Scouts earn CONV tokens for backing winners early.',
    category:    'Identity',
    yesWeight:   6200,
    noWeight:    900,
    publishedAt: PAST(20),
    closesAt:    FUTURE(49),
  },
  {
    onchainId:   'demo-3',
    title:       'Prediction market for VC funding rounds',
    description: 'Let the crowd bet on which startups will close their next funding round within 90 days. Verified outcome via public Crunchbase data. Early believers in the right founders earn a cut of the prize pool. Think Polymarket but for private market deal flow.',
    category:    'DeFi',
    yesWeight:   4100,
    noWeight:    3800,
    publishedAt: PAST(10),
    closesAt:    FUTURE(59),
  },
  {
    onchainId:   'demo-4',
    title:       'Decentralised Airbnb where hosts get paid instantly in USDC',
    description: 'A peer-to-peer home rental protocol where payment is held in an escrow smart contract, released automatically on check-in confirmation. No platform taking 15% fees. Reviews stored on-chain so they can\'t be gamed or deleted. Base L2 for near-zero gas.',
    category:    'Marketplace',
    yesWeight:   5500,
    noWeight:    2200,
    publishedAt: PAST(30),
    closesAt:    FUTURE(39),
  },
]

const WON_IDEAS = [
  {
    onchainId:   'demo-won-1',
    title:       'Token-gated group chats that pay you to participate',
    description: 'A messaging app where every group has a native token. Active members who drive engagement earn token rewards funded by new member admission fees. The more valuable the conversation, the more the token is worth. Discord meets friend.tech, built on Base.',
    category:    'Social',
    yesWeight:   12000,
    noWeight:    2000,
    pmfScore:    86,
    publishedAt: PAST(80),
    closesAt:    PAST(11),
    curveAddr:   null, // will be set after real on-chain resolution
  },
  {
    onchainId:   'demo-won-2',
    title:       'GitHub for hardware — open source PCB designs with royalty splits',
    description: 'A platform where hardware engineers publish circuit board designs as NFTs. Anyone can manufacture and sell the product; a royalty is automatically paid to the original designer on every sale verified via NFC chip. Turns open hardware into a business model.',
    category:    'Hardware',
    yesWeight:   9800,
    noWeight:    1500,
    pmfScore:    79,
    publishedAt: PAST(90),
    closesAt:    PAST(21),
    curveAddr:   null,
  },
]

const GRAVEYARD_IDEAS = [
  {
    onchainId:   'demo-rip-1',
    title:       'Crypto-native coffee subscription with NFT loyalty cards',
    description: 'Monthly coffee subscription where your loyalty card is an NFT that accrues points on-chain. Points can be traded or redeemed across any partner café. The crowd said no — market saturation and unclear crypto value-add.',
    category:    'Consumer',
    yesWeight:   1200,
    noWeight:    7800,
    pmfScore:    13,
    publishedAt: PAST(85),
    closesAt:    PAST(16),
  },
]

// ─── Runner ────────────────────────────────────────────────────────────────────

async function main() {
  console.log('🌱  Seeding demo data...\n')

  let created = 0

  // Active ideas
  for (const idea of ACTIVE_IDEAS) {
    const existing = await db.idea.findUnique({ where: { onchainId: idea.onchainId } })
    if (existing) { console.log(`  skip (exists): ${idea.title}`); continue }

    await db.idea.create({
      data: {
        ...idea,
        status:      'active',
        isAnonymous: false,
        founderAddr: '0x000000000000000000000000000000000000dEaD',
        votes: {
          create: [
            { voterAddr: '0xaaaa000000000000000000000000000000000001', direction: 'yes', weight: idea.yesWeight * 0.6, tier: 1 },
            { voterAddr: '0xaaaa000000000000000000000000000000000002', direction: 'yes', weight: idea.yesWeight * 0.25, tier: 2 },
            { voterAddr: '0xaaaa000000000000000000000000000000000003', direction: 'yes', weight: idea.yesWeight * 0.15, tier: 3 },
            { voterAddr: '0xbbbb000000000000000000000000000000000001', direction: 'no',  weight: idea.noWeight, tier: 2 },
          ],
        },
      },
    })
    console.log(`  ✅ active: ${idea.title}`)
    created++
  }

  // Won ideas
  for (const idea of WON_IDEAS) {
    const existing = await db.idea.findUnique({ where: { onchainId: idea.onchainId } })
    if (existing) { console.log(`  skip (exists): ${idea.title}`); continue }

    await db.idea.create({
      data: {
        ...idea,
        status:      'won',
        isAnonymous: false,
        founderAddr: '0x000000000000000000000000000000000000dEaD',
        votes: {
          create: [
            { voterAddr: '0xcccc000000000000000000000000000000000001', direction: 'yes', weight: idea.yesWeight * 0.5, tier: 1 },
            { voterAddr: '0xcccc000000000000000000000000000000000002', direction: 'yes', weight: idea.yesWeight * 0.3, tier: 2 },
            { voterAddr: '0xcccc000000000000000000000000000000000003', direction: 'yes', weight: idea.yesWeight * 0.2, tier: 3 },
            { voterAddr: '0xdddd000000000000000000000000000000000001', direction: 'no',  weight: idea.noWeight, tier: 2 },
          ],
        },
      },
    })
    console.log(`  🏆 won:    ${idea.title}`)
    created++
  }

  // Graveyard ideas
  for (const idea of GRAVEYARD_IDEAS) {
    const existing = await db.idea.findUnique({ where: { onchainId: idea.onchainId } })
    if (existing) { console.log(`  skip (exists): ${idea.title}`); continue }

    await db.idea.create({
      data: {
        ...idea,
        status:      'graveyard',
        isAnonymous: false,
        founderAddr: '0x000000000000000000000000000000000000dEaD',
        votes: {
          create: [
            { voterAddr: '0xeeee000000000000000000000000000000000001', direction: 'yes', weight: idea.yesWeight, tier: 3 },
            { voterAddr: '0xeeee000000000000000000000000000000000002', direction: 'no',  weight: idea.noWeight * 0.6, tier: 1 },
            { voterAddr: '0xeeee000000000000000000000000000000000003', direction: 'no',  weight: idea.noWeight * 0.4, tier: 2 },
          ],
        },
      },
    })
    console.log(`  ⚰️  rip:    ${idea.title}`)
    created++
  }

  console.log(`\n✅  Done — ${created} idea(s) seeded.`)
}

main()
  .catch((e) => { console.error(e); process.exit(1) })
  .finally(() => db.$disconnect())
