import type { FastifyInstance } from 'fastify'
import { db } from '../db'

export async function scoutsRoutes(app: FastifyInstance) {
  // GET /scouts/:address — stats + vote history for a wallet
  app.get<{ Params: { address: string } }>('/scouts/:address', async (req, reply) => {
    const address = req.params.address.toLowerCase()

    const votes = await db.vote.findMany({
      where:   { voterAddr: { equals: address, mode: 'insensitive' } },
      include: {
        idea: {
          select: {
            id:        true,
            title:     true,
            status:    true,
            pmfScore:  true,
            closesAt:  true,
            yesWeight: true,
            noWeight:  true,
          },
        },
      },
      orderBy: { castedAt: 'desc' },
    })

    // ── Stats ───────────────────────────────────────────────────────────────

    const totalVotes    = votes.length
    const correctCalls  = votes.filter(
      v =>
        (v.direction === 'yes' && v.idea.status === 'won') ||
        (v.direction === 'no'  && v.idea.status === 'graveyard'),
    ).length
    const accuracy      = totalVotes > 0 ? correctCalls / totalVotes : 0
    const totalWeight   = votes.reduce((sum, v) => sum + v.weight, 0)
    const tier1Votes    = votes.filter(v => v.tier === 1).length
    const tier2Votes    = votes.filter(v => v.tier === 2).length
    const tier3Votes    = votes.filter(v => v.tier === 3).length
    const streakDays    = computeStreak(votes.map(v => v.castedAt))

    // Score grows with both accuracy and participation; maxes out at 100
    const participationFactor = Math.min(totalVotes / 20, 1)
    const reputationScore     = Math.round(accuracy * participationFactor * 100)

    // ── Upsert Reputation table (lazy write on profile view) ────────────────

    if (totalVotes > 0) {
      await db.reputation.upsert({
        where:  { walletAddr: address },
        create: {
          walletAddr:  address,
          score:       1 + reputationScore / 100,
          totalVotes,
          correctCalls,
          streakDays,
          lastVotedAt: votes[0]?.castedAt ?? null,
        },
        update: {
          score:       1 + reputationScore / 100,
          totalVotes,
          correctCalls,
          streakDays,
          lastVotedAt: votes[0]?.castedAt ?? null,
        },
      })
    }

    return {
      address,
      stats: {
        totalVotes,
        correctCalls,
        accuracy,
        totalWeight,
        streakDays,
        tier1Votes,
        tier2Votes,
        tier3Votes,
        reputationScore,
      },
      votes: votes.map(v => ({
        id:        v.id,
        direction: v.direction,
        weight:    v.weight,
        tier:      v.tier,
        castedAt:  v.castedAt,
        idea:      v.idea,
      })),
    }
  })
}

// ─── Streak computation ───────────────────────────────────────────────────────
// Counts consecutive calendar days (UTC) ending today or yesterday.

function computeStreak(dates: Date[]): number {
  if (dates.length === 0) return 0

  const uniqueDays = [
    ...new Set(dates.map(d => d.toISOString().slice(0, 10))),
  ].sort().reverse()

  const today     = new Date().toISOString().slice(0, 10)
  const yesterday = new Date(Date.now() - 86_400_000).toISOString().slice(0, 10)

  // Streak must be active (last vote today or yesterday)
  if (uniqueDays[0] !== today && uniqueDays[0] !== yesterday) return 0

  let streak = 1
  for (let i = 1; i < uniqueDays.length; i++) {
    const prev     = new Date(uniqueDays[i - 1] + 'T12:00:00Z')
    const curr     = new Date(uniqueDays[i]     + 'T12:00:00Z')
    const diffDays = Math.round((prev.getTime() - curr.getTime()) / 86_400_000)
    if (diffDays === 1) streak++
    else break
  }
  return streak
}
