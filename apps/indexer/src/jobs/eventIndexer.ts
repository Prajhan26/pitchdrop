import { createPublicClient, http, parseAbiItem, type Address } from 'viem'
import { base, baseSepolia } from 'viem/chains'
import { db } from '../db'

// ─── Config ───────────────────────────────────────────────────────────────────

const POLL_MS    = 2_000   // 2 s — matches Base block time
const BATCH_SIZE = 2_000n  // max blocks per getLogs call (well within node limits)

// ─── Event signatures ─────────────────────────────────────────────────────────

const IDEA_REGISTERED = parseAbiItem(
  'event IdeaRegistered(uint256 indexed ideaId, address indexed founder, bytes32 titleHash, uint64 closesAt)',
)

const VOTE_CAST = parseAbiItem(
  'event VoteCast(uint256 indexed ideaId, address indexed voter, bool direction, uint256 weight, uint8 tier)',
)

const VOTING_WINDOW_MS = 69 * 60 * 60 * 1000

// ─── Entry point ──────────────────────────────────────────────────────────────

export async function startEventIndexer(): Promise<void> {
  const registryAddr = process.env.IDEA_REGISTRY_ADDRESS as Address | undefined
  const engineAddr   = process.env.VOTING_ENGINE_ADDRESS as Address | undefined

  if (!registryAddr || !engineAddr) {
    console.log(
      '[indexer] IDEA_REGISTRY_ADDRESS / VOTING_ENGINE_ADDRESS not set — event indexer disabled',
    )
    return
  }

  const isMainnet = process.env.CHAIN === 'base'
  const chain     = isMainnet ? base : baseSepolia
  const rpcUrl    = isMainnet
    ? (process.env.BASE_RPC_URL     ?? 'https://mainnet.base.org')
    : (process.env.BASE_SEPOLIA_RPC_URL ?? 'https://sepolia.base.org')

  const client = createPublicClient({ chain, transport: http(rpcUrl) })

  // Start block: use INDEX_FROM_BLOCK env if set, else fall back to 0
  const startBlock: bigint = process.env.INDEX_FROM_BLOCK
    ? BigInt(process.env.INDEX_FROM_BLOCK)
    : 0n

  console.log(
    `[indexer] Starting on ${chain.name} | registry=${registryAddr} | engine=${engineAddr} | startBlock=${startBlock}`,
  )

  let running = false

  async function poll(): Promise<void> {
    if (running) return // skip if previous poll is still in flight
    running = true

    try {
      // Load (or initialise) the cursor row
      const state = await db.indexerState.upsert({
        where:  { id: 'singleton' },
        create: { id: 'singleton', lastBlock: startBlock },
        update: {},
      })

      const latestBlock = await client.getBlockNumber()
      const fromBlock   = state.lastBlock + 1n

      if (fromBlock > latestBlock) return // fully caught up

      const toBlock = fromBlock + BATCH_SIZE - 1n < latestBlock
        ? fromBlock + BATCH_SIZE - 1n
        : latestBlock

      // Fetch both event types in parallel
      const [ideaLogs, voteLogs] = await Promise.all([
        client.getLogs({ address: registryAddr, event: IDEA_REGISTERED, fromBlock, toBlock }),
        client.getLogs({ address: engineAddr,   event: VOTE_CAST,       fromBlock, toBlock }),
      ])

      if (ideaLogs.length > 0 || voteLogs.length > 0) {
        console.log(
          `[indexer] blocks ${fromBlock}–${toBlock}: ${ideaLogs.length} IdeaRegistered, ${voteLogs.length} VoteCast`,
        )
      }

      for (const log of ideaLogs) {
        if (log.args.ideaId !== undefined) {
          await handleIdeaRegistered({
            ideaId:    log.args.ideaId,
            founder:   log.args.founder!,
            titleHash: log.args.titleHash!,
            closesAt:  log.args.closesAt!,
          })
        }
      }

      for (const log of voteLogs) {
        if (log.args.ideaId !== undefined) {
          await handleVoteCast({
            ideaId:    log.args.ideaId,
            voter:     log.args.voter!,
            direction: log.args.direction!,
            weight:    log.args.weight!,
            tier:      log.args.tier!,
          })
        }
      }

      // Advance the cursor
      await db.indexerState.update({
        where: { id: 'singleton' },
        data:  { lastBlock: toBlock },
      })
    } catch (err) {
      console.error('[indexer] poll error:', err)
    } finally {
      running = false
    }
  }

  // Catch up immediately, then keep polling
  await poll()
  setInterval(poll, POLL_MS)
}

// ─── Handlers ─────────────────────────────────────────────────────────────────

async function handleIdeaRegistered(args: {
  ideaId:    bigint
  founder:   Address
  titleHash: `0x${string}`
  closesAt:  bigint
}): Promise<void> {
  const { ideaId, founder, titleHash, closesAt } = args
  const onchainId   = ideaId.toString()
  const closesAtMs  = new Date(Number(closesAt) * 1000)
  const publishedAt = new Date(closesAtMs.getTime() - VOTING_WINDOW_MS)

  try {
    await db.idea.upsert({
      where:  { onchainId },
      create: {
        // Title is off-chain; use placeholder if idea wasn't submitted via UI
        onchainId,
        title:       `[on-chain: ${titleHash.slice(0, 10)}]`,
        description: '',
        category:    'Unknown',
        isAnonymous: false,
        founderAddr: founder,
        status:      'active',
        publishedAt,
        closesAt:    closesAtMs,
      },
      // If the modal already wrote the row (with rich title/description),
      // trust the chain for ownership + timing data only.
      update: {
        founderAddr: founder,
        publishedAt,
        closesAt:    closesAtMs,
        status:      'active',
      },
    })
    console.log(`[indexer] IdeaRegistered  onchainId=${onchainId} founder=${founder}`)
  } catch (err) {
    console.error(`[indexer] handleIdeaRegistered error (onchainId=${onchainId}):`, err)
  }
}

async function handleVoteCast(args: {
  ideaId:    bigint
  voter:     Address
  direction: boolean
  weight:    bigint
  tier:      number
}): Promise<void> {
  const { ideaId, voter, direction, weight, tier } = args
  const onchainId  = ideaId.toString()
  const dirStr     = direction ? 'yes' : 'no'
  // Weight is stored in DB as a plain number (1 | 2 | 3); divide by 1e18.
  const weightNum  = Number(weight) / 1e18

  try {
    const idea = await db.idea.findUnique({ where: { onchainId } })
    if (!idea) {
      console.warn(`[indexer] VoteCast: idea onchainId=${onchainId} not in DB — skipping`)
      return
    }

    // Idempotent: skip if vote already recorded (on-chain re-org safety)
    const existing = await db.vote.findUnique({
      where: { ideaId_voterAddr: { ideaId: idea.id, voterAddr: voter } },
    })
    if (existing) return

    await db.$transaction([
      db.vote.create({
        data: { ideaId: idea.id, voterAddr: voter, direction: dirStr, weight: weightNum, tier },
      }),
      db.idea.update({
        where: { id: idea.id },
        data: {
          yesWeight: dirStr === 'yes' ? { increment: weightNum } : undefined,
          noWeight:  dirStr === 'no'  ? { increment: weightNum } : undefined,
        },
      }),
    ])
    console.log(
      `[indexer] VoteCast  onchainId=${onchainId} voter=${voter} dir=${dirStr} weight=${weightNum} tier=${tier}`,
    )
  } catch (err) {
    console.error(`[indexer] handleVoteCast error (onchainId=${onchainId}):`, err)
  }
}
