import Fastify from 'fastify'
import websocket from '@fastify/websocket'
import cors from '@fastify/cors'
import { ideasRoutes } from './routes/ideas'
import { votesRoutes } from './routes/votes'
import { startEventIndexer } from './jobs/eventIndexer'
import { startResolutionEngine } from './jobs/resolutionEngine'

const app = Fastify({ logger: true })

app.register(cors, { origin: process.env.CORS_ORIGIN || '*' })
app.register(websocket)

app.get('/health', async () => ({ status: 'ok', service: 'pitchdrop-indexer' }))

app.register(ideasRoutes)
app.register(votesRoutes)

const start = async () => {
  try {
    await app.listen({ port: Number(process.env.PORT) || 3001, host: '0.0.0.0' })
    // Start the on-chain event indexer after the HTTP server is up.
    // No-ops gracefully if contract addresses are not set.
    startEventIndexer().catch((err) => {
      app.log.error({ err }, '[indexer] eventIndexer crashed')
    })
    startResolutionEngine().catch((err) => {
      app.log.error({ err }, '[resolver] resolutionEngine crashed')
    })
  } catch (err) {
    app.log.error(err)
    process.exit(1)
  }
}

start()
