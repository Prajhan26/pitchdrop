import type { FastifyInstance } from 'fastify'
import { z } from 'zod'
import { db } from '../db'
import { getVotingPhase, getAirdropTier } from '@pitchdrop/shared'

const VoteBodySchema = z.object({
  ideaId:    z.string(),
  voterAddr: z.string().regex(/^0x[0-9a-fA-F]{40}$/, 'Invalid address'),
  direction: z.enum(['yes', 'no']),
  // Optional: tx hash once contract is deployed
  txHash:    z.string().optional(),
})

export async function votesRoutes(app: FastifyInstance) {
  // POST /votes — record a vote (validates window, dedupes, updates weights)
  app.post('/votes', async (req, reply) => {
    const parsed = VoteBodySchema.safeParse(req.body)
    if (!parsed.success) {
      return reply.code(400).send({ error: parsed.error.flatten() })
    }

    const { ideaId, voterAddr, direction, txHash } = parsed.data

    // Fetch idea
    const idea = await db.idea.findUnique({ where: { id: ideaId } })
    if (!idea)                   return reply.code(404).send({ error: 'Idea not found' })
    if (idea.status !== 'active') return reply.code(400).send({ error: 'Idea not active' })
    if (idea.closesAt && new Date() > idea.closesAt) {
      return reply.code(400).send({ error: 'Voting window closed' })
    }

    // Deduplicate
    const existing = await db.vote.findUnique({
      where: { ideaId_voterAddr: { ideaId, voterAddr } },
    })
    if (existing) return reply.code(409).send({ error: 'Already voted' })

    // Compute weight + tier from elapsed time (mirrors VotingEngine.sol)
    const publishedAt   = idea.publishedAt ?? new Date()
    const hoursElapsed  = (Date.now() - publishedAt.getTime()) / (1000 * 60 * 60)
    const phase         = getVotingPhase(hoursElapsed)
    const tier          = getAirdropTier(hoursElapsed)
    const weight        = phase === 'early' ? 3 : phase === 'late' || phase === 'overtime' ? 1 : 2

    // Write vote + update idea weights atomically
    const [vote] = await db.$transaction([
      db.vote.create({
        data: { ideaId, voterAddr, direction, weight, tier },
      }),
      db.idea.update({
        where: { id: ideaId },
        data:  {
          yesWeight: direction === 'yes' ? { increment: weight } : undefined,
          noWeight:  direction === 'no'  ? { increment: weight } : undefined,
        },
      }),
    ])

    return reply.code(201).send({ vote, tier, weight, txHash: txHash ?? null })
  })

  // GET /votes/:ideaId/:voterAddr — check if a wallet has voted on an idea
  app.get<{ Params: { ideaId: string; voterAddr: string } }>(
    '/votes/:ideaId/:voterAddr',
    async (req, reply) => {
      const { ideaId, voterAddr } = req.params
      const vote = await db.vote.findUnique({
        where: { ideaId_voterAddr: { ideaId, voterAddr } },
      })
      if (!vote) return reply.code(404).send({ voted: false })
      return { voted: true, vote }
    },
  )
}
