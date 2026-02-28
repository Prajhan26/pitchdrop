import type { FastifyInstance } from 'fastify'
import { keccak256, encodePacked } from 'viem'
import { db } from '../db'

const AIRDROP_SUPPLY = 300_000_000 // 30% of 1B tokens per idea

// ─── Minimal OZ-compatible Merkle tree ────────────────────────────────────────

function makeLeaf(addr: string, amount: bigint): `0x${string}` {
  return keccak256(encodePacked(['address', 'uint256'], [addr as `0x${string}`, amount]))
}

function hashPair(a: `0x${string}`, b: `0x${string}`): `0x${string}` {
  return a < b
    ? keccak256(encodePacked(['bytes32', 'bytes32'], [a, b]))
    : keccak256(encodePacked(['bytes32', 'bytes32'], [b, a]))
}

/**
 * Build a proof for targetLeaf within the sorted-pair Merkle tree.
 * Must use the same algorithm as merkleGenerator.ts to produce proofs
 * that verify against the on-chain root.
 */
function buildMerkleProof(leaves: `0x${string}`[], targetLeaf: `0x${string}`): `0x${string}`[] {
  if (leaves.length === 0) return []
  let level = [...leaves].sort() as `0x${string}`[]
  let idx   = level.indexOf(targetLeaf)
  if (idx === -1) return []

  const proof: `0x${string}`[] = []

  while (level.length > 1) {
    const next: `0x${string}`[] = []
    for (let i = 0; i < level.length; i += 2) {
      const a = level[i] as `0x${string}`
      if (i + 1 < level.length) {
        const b = level[i + 1] as `0x${string}`
        next.push(hashPair(a, b))
        if (idx === i)     proof.push(b)
        else if (idx === i + 1) proof.push(a)
      } else {
        next.push(a) // odd node passes through
      }
    }
    idx   = Math.floor(idx / 2)
    level = next
  }

  return proof
}

// ─── Route ────────────────────────────────────────────────────────────────────

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

    // For eligible ideas, fetch all YES votes to reconstruct the full Merkle tree
    const eligibleIdeaIds = wonIdeas
      .filter(idea => voteMap.has(idea.id))
      .map(idea => idea.id)

    const allVotesForEligible = eligibleIdeaIds.length > 0
      ? await db.vote.findMany({
          where: { ideaId: { in: eligibleIdeaIds }, direction: 'yes' },
          select: { ideaId: true, voterAddr: true, weight: true },
        })
      : []

    // Group by ideaId for fast lookup
    const votesByIdea = new Map<string, typeof allVotesForEligible>()
    for (const v of allVotesForEligible) {
      const list = votesByIdea.get(v.ideaId) ?? []
      list.push(v)
      votesByIdea.set(v.ideaId, list)
    }

    const ideas = wonIdeas.map(idea => {
      const vote      = voteMap.get(idea.id)
      const eligible  = !!vote
      const allocation = eligible && idea.yesWeight > 0
        ? Math.floor((vote!.weight / idea.yesWeight) * AIRDROP_SUPPLY)
        : 0

      // Compute Merkle proof for this wallet
      let proof: string[] = []
      if (eligible && idea.yesWeight > 0) {
        const ideaVotes = votesByIdea.get(idea.id) ?? []
        const leaves: `0x${string}`[] = []

        for (const v of ideaVotes) {
          const share      = idea.yesWeight > 0 ? v.weight / idea.yesWeight : 0
          const tokenUnits = BigInt(Math.floor(share * AIRDROP_SUPPLY))
          const amount     = tokenUnits * BigInt(1e18)
          if (amount === 0n) continue
          leaves.push(makeLeaf(v.voterAddr, amount))
        }

        const walletShare      = idea.yesWeight > 0 ? vote!.weight / idea.yesWeight : 0
        const walletTokenUnits = BigInt(Math.floor(walletShare * AIRDROP_SUPPLY))
        const walletAmount     = walletTokenUnits * BigInt(1e18)

        if (walletAmount > 0n) {
          const targetLeaf = makeLeaf(walletAddr, walletAmount)
          proof = buildMerkleProof(leaves, targetLeaf)
        }
      }

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
        tokenAddr:      idea.tokenAddr ?? null,
        claimed:        false,
        proofAvailable: proof.length > 0,
        proof,
      }
    })

    return {
      walletAddr,
      totalAllocation: ideas.reduce((s, a) => s + a.allocation, 0),
      ideas,
    }
  })
}
