import type { FastifyInstance } from 'fastify'
import { z } from 'zod'
import { db } from '../db'
import { IdeaSubmissionSchema } from '@pitchdrop/shared'

const QuerySchema = z.object({
  status: z.enum(['active', 'won', 'graveyard', 'all']).default('active'),
  page:   z.coerce.number().int().positive().default(1),
  limit:  z.coerce.number().int().min(1).max(100).default(20),
})

const VOTING_WINDOW_MS = 69 * 60 * 60 * 1000

export async function ideasRoutes(app: FastifyInstance) {
  // GET /ideas?status=active&page=1&limit=20
  app.get('/ideas', async (req, reply) => {
    const parsed = QuerySchema.safeParse(req.query)
    if (!parsed.success) {
      return reply.code(400).send({ error: parsed.error.flatten() })
    }

    const { status, page, limit } = parsed.data
    const where = status !== 'all' ? { status } : {}

    const [ideas, total] = await Promise.all([
      db.idea.findMany({
        where,
        orderBy: { publishedAt: 'desc' },
        take: limit,
        skip: (page - 1) * limit,
      }),
      db.idea.count({ where }),
    ])

    return { ideas, total, page, limit }
  })

  // GET /ideas/:id
  app.get<{ Params: { id: string } }>('/ideas/:id', async (req, reply) => {
    const idea = await db.idea.findUnique({
      where: { id: req.params.id },
      include: { votes: { orderBy: { castedAt: 'desc' }, take: 50 } },
    })
    if (!idea) return reply.code(404).send({ error: 'Idea not found' })
    return { idea }
  })

  // POST /ideas — submit a new idea (off-chain; founderAddr links to wallet)
  app.post('/ideas', async (req, reply) => {
    const body = req.body as Record<string, unknown>

    const parsed = IdeaSubmissionSchema.safeParse(body)
    if (!parsed.success) {
      return reply.code(400).send({ error: parsed.error.flatten() })
    }

    const founderAddr = typeof body.founderAddr === 'string' ? body.founderAddr : null
    // onchainId supplied when the contract tx has already been confirmed client-side
    const onchainId   = typeof body.onchainId === 'string' ? body.onchainId : `pending-${Date.now()}`

    const publishedAt = new Date()
    const closesAt    = new Date(publishedAt.getTime() + VOTING_WINDOW_MS)

    const idea = await db.idea.create({
      data: {
        onchainId,
        title:       parsed.data.title,
        description: parsed.data.description,
        category:    parsed.data.category,
        isAnonymous: parsed.data.isAnonymous,
        founderAddr,
        status:      'active',
        publishedAt,
        closesAt,
      },
    })

    return reply.code(201).send({ idea })
  })
}
