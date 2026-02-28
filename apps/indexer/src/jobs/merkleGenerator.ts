import {
  createPublicClient,
  createWalletClient,
  http,
  keccak256,
  encodePacked,
  type Address,
  type PublicClient,
  type WalletClient,
} from 'viem'
import { privateKeyToAccount } from 'viem/accounts'
import { base, baseSepolia } from 'viem/chains'
import type { Idea, Vote } from '@prisma/client'
import { db } from '../db'

type IdeaWithVotes = Idea & { votes: Vote[] }

// ─── ABI ──────────────────────────────────────────────────────────────────────

const AIRDROP_DISTRIBUTOR_ABI = [
  { type: 'function', name: 'setMerkleRoot', inputs: [{ name: 'ideaId', type: 'uint256' }, { name: 'root', type: 'bytes32' }], outputs: [], stateMutability: 'nonpayable' },
  { type: 'function', name: 'merkleRoots', inputs: [{ name: 'ideaId', type: 'uint256' }], outputs: [{ name: '', type: 'bytes32' }], stateMutability: 'view' },
] as const

// ─── Config ───────────────────────────────────────────────────────────────────

const CRON_INTERVAL_MS = 5 * 60 * 1000 // 5 minutes
const TOTAL_TOKENS     = 300_000_000n   // token units before 1e18 scaling

// ─── Minimal Merkle tree ──────────────────────────────────────────────────────

function makeLeaf(addr: string, amount: bigint): `0x${string}` {
  return keccak256(encodePacked(['address', 'uint256'], [addr as `0x${string}`, amount]))
}

function hashPair(a: `0x${string}`, b: `0x${string}`): `0x${string}` {
  return a < b
    ? keccak256(encodePacked(['bytes32', 'bytes32'], [a, b]))
    : keccak256(encodePacked(['bytes32', 'bytes32'], [b, a]))
}

function buildMerkleRoot(leaves: `0x${string}`[]): `0x${string}` {
  const ZERO = '0x0000000000000000000000000000000000000000000000000000000000000000' as `0x${string}`
  if (leaves.length === 0) return ZERO
  const first = leaves[0]
  if (leaves.length === 1) return first ?? ZERO
  let level: `0x${string}`[] = [...leaves].sort() as `0x${string}`[]
  while (level.length > 1) {
    const next: `0x${string}`[] = []
    for (let i = 0; i < level.length; i += 2) {
      const a = level[i] as `0x${string}`
      if (i + 1 < level.length) {
        const b = level[i + 1] as `0x${string}`
        next.push(hashPair(a, b))
      } else {
        next.push(a)
      }
    }
    level = next
  }
  return (level[0] as `0x${string}`) ?? ZERO
}

// ─── Entry point ──────────────────────────────────────────────────────────────

export async function startMerkleGenerator(): Promise<void> {
  const distributorAddr = process.env.AIRDROP_DISTRIBUTOR_ADDRESS as Address | undefined
  const rawKey          = process.env.AIRDROP_OWNER_PRIVATE_KEY

  if (!distributorAddr || !rawKey) {
    console.warn(
      '[merkleGenerator] AIRDROP_DISTRIBUTOR_ADDRESS / AIRDROP_OWNER_PRIVATE_KEY not set — skipping',
    )
    return
  }

  const isMainnet = process.env.CHAIN === 'base'
  const chain     = isMainnet ? base : baseSepolia
  const rpcUrl    = isMainnet
    ? (process.env.BASE_RPC_URL      ?? 'https://mainnet.base.org')
    : (process.env.BASE_SEPOLIA_RPC_URL ?? 'https://sepolia.base.org')

  const account      = privateKeyToAccount(rawKey as `0x${string}`)
  const publicClient = createPublicClient({ chain, transport: http(rpcUrl) }) as unknown as PublicClient
  const walletClient = createWalletClient({ account, chain, transport: http(rpcUrl) }) as unknown as WalletClient

  console.log(
    `[merkleGenerator] Started | owner=${account.address} | distributor=${distributorAddr} | chain=${chain.name}`,
  )

  async function run(): Promise<void> {
    try {
      // Find won ideas that have an on-chain ID
      const wonIdeas = await db.idea.findMany({
        where: {
          status:    'won',
          onchainId: { not: null },
        },
        include: { votes: true },
      })

      if (wonIdeas.length === 0) return
      console.log(`[merkleGenerator] Processing ${wonIdeas.length} won idea(s)`)

      for (const idea of wonIdeas) {
        await generateRoot({
          idea,
          distributorAddr: distributorAddr!,
          publicClient,
          walletClient,
        })
      }
    } catch (err) {
      console.error('[merkleGenerator] run error:', err)
    }
  }

  await run()
  setInterval(run, CRON_INTERVAL_MS)
}

// ─── Per-idea logic ───────────────────────────────────────────────────────────

async function generateRoot(opts: {
  idea:            IdeaWithVotes
  distributorAddr: Address
  publicClient:    PublicClient
  walletClient:    WalletClient
}): Promise<void> {
  const { idea, distributorAddr, publicClient, walletClient } = opts

  const yesVotes = idea.votes.filter((v) => v.direction === 'yes')
  if (yesVotes.length === 0) {
    console.log(`[merkleGenerator] idea=${idea.id} has no YES votes — skipping`)
    return
  }

  // Build allocation map: voter → token amount (in wei, 1e18 per token unit)
  const leaves: `0x${string}`[] = []
  for (const vote of yesVotes) {
    const share      = idea.yesWeight > 0 ? vote.weight / idea.yesWeight : 0
    const tokenUnits = BigInt(Math.floor(share * Number(TOTAL_TOKENS)))
    const amount     = tokenUnits * BigInt(1e18)
    if (amount === 0n) continue
    leaves.push(makeLeaf(vote.voterAddr, amount))
  }

  if (leaves.length === 0) {
    console.log(`[merkleGenerator] idea=${idea.id} produced zero allocations — skipping`)
    return
  }

  const newRoot   = buildMerkleRoot(leaves)
  const onchainId = BigInt(idea.onchainId!)

  // Check if the root is already set on-chain
  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const existingRoot = await publicClient.readContract({
      address:      distributorAddr,
      abi:          AIRDROP_DISTRIBUTOR_ABI,
      functionName: 'merkleRoots',
      args:         [onchainId],
    } as any) as `0x${string}`

    const ZERO_ROOT = '0x0000000000000000000000000000000000000000000000000000000000000000'
    if (existingRoot !== ZERO_ROOT) {
      console.log(`[merkleGenerator] idea onchainId=${idea.onchainId} root already set — skipping`)
      return
    }

    const { request } = await publicClient.simulateContract({
      account:      walletClient.account,
      address:      distributorAddr,
      abi:          AIRDROP_DISTRIBUTOR_ABI,
      functionName: 'setMerkleRoot',
      args:         [onchainId, newRoot],
    })

    const txHash = await walletClient.writeContract(request)
    await publicClient.waitForTransactionReceipt({ hash: txHash })
    console.log(
      `[merkleGenerator] setMerkleRoot onchainId=${idea.onchainId} root=${newRoot} tx=${txHash}`,
    )
  } catch (err) {
    console.error(`[merkleGenerator] failed for idea=${idea.id}:`, err)
  }
}
