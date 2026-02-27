import Fastify from 'fastify'
import websocket from '@fastify/websocket'
import cors from '@fastify/cors'
import { ideasRoutes } from './routes/ideas'
import { votesRoutes } from './routes/votes'

const app = Fastify({ logger: true })

app.register(cors, { origin: process.env.CORS_ORIGIN || '*' })
app.register(websocket)

app.get('/health', async () => ({ status: 'ok', service: 'pitchdrop-indexer' }))

app.register(ideasRoutes)
app.register(votesRoutes)

const start = async () => {
  try {
    await app.listen({ port: Number(process.env.PORT) || 3001, host: '0.0.0.0' })
  } catch (err) {
    app.log.error(err)
    process.exit(1)
  }
}

start()
