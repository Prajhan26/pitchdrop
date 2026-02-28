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

// Wire the deployed BondingCurve addresses for demo won ideas.
// Safe to run on every startup — only updates rows that still have null curveAddr.
async function wireDemoCurveAddresses() {
  const db = new PrismaClient()
  try {
    await db.idea.updateMany({
      where: { onchainId: 'demo-won-1', curveAddr: null },
      data:  { curveAddr: '0x75574c9a30345dc2affbde778efef41c18b1e351' },
    })
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
    await wireDemoCurveAddresses()
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
