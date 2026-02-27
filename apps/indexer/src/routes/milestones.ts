import type { FastifyInstance } from 'fastify'
import { z } from 'zod'

const SubmitSchema = z.object({
  ideaId:      z.string().min(1),
  milestoneId: z.number().int().min(0),
  evidence:    z.string().url().or(z.string().min(20)),
  submitter:   z.string().regex(/^0x[0-9a-fA-F]{40}$/),
})

export async function milestonesRoutes(app: FastifyInstance) {
  app.post('/milestones', async (req, reply) => {
    const parsed = SubmitSchema.safeParse(req.body)
    if (!parsed.success) return reply.status(400).send({ error: parsed.error.flatten() })

    const { ideaId, milestoneId, evidence, submitter } = parsed.data
    app.log.info({ ideaId, milestoneId, submitter }, '[milestones] submission received')

    // TODO: persist to DB when Milestone model is added; agent evaluator picks up async
    return reply.status(201).send({
      status:  'received',
      ideaId,
      milestoneId,
      message: 'Milestone submission queued for evaluation',
    })
  })

  app.get<{ Params: { ideaId: string } }>('/milestones/:ideaId', async (req) => {
    // Stub — returns empty list until Milestone model is in schema
    return { ideaId: req.params.ideaId, milestones: [] }
  })
}
