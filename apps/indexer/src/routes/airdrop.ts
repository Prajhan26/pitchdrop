import type { FastifyInstance } from 'fastify'
import { db } from '../db'

const AIRDROP_SUPPLY = 300_000_000 // 30% of 1B tokens per idea

export async function airdropRoutes(app: FastifyInstance) {
  // GET /airdrop/:walletAddr
  app.get<{ Params: { walletAddr: string } }>('/airdrop/:walletAddr', async (req) => {
    const walletAddr = req.params.walletAddr.toLowerCase()

    const [wonIdeas, userVotes] = await Promise.all([
      db.idea.findMany({ where: { status: 'won' }, orderBy: { updatedAt: 'desc' } }),
      db.vote.findMany({
        where: {
          voterAddr: { equals: walletAddr, mode: 'insensitive' },
          direction: 'yes',
          idea:      { status: 'won' },
        },
        select: { ideaId: true, weight: true, tier: true },
      }),
    ])

    const voteMap = new Map(userVotes.map(v => [v.ideaId, v]))

    const ideas = wonIdeas.map(idea => {
      const vote      = voteMap.get(idea.id)
      const eligible  = !!vote
      const allocation = eligible && idea.yesWeight > 0
        ? Math.floor((vote!.weight / idea.yesWeight) * AIRDROP_SUPPLY)
        : 0
      return {
        ideaId:         idea.id,
        onchainId:      idea.onchainId,
        title:          idea.title,
        pmfScore:       idea.pmfScore,
        yesWeight:      idea.yesWeight,
        eligible,
        tier:           vote?.tier ?? null,
        userWeight:     vote?.weight ?? 0,
        allocation,
        claimed:        false,
        proofAvailable: false,
      }
    })

    return {
      walletAddr,
      totalAllocation: ideas.reduce((s, a) => s + a.allocation, 0),
      ideas,
    }
  })
}
