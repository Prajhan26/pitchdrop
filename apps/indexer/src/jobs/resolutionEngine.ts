import {
  createPublicClient,
  createWalletClient,
  http,
  type Address,
  type PublicClient,
  type WalletClient,
} from 'viem'
import { privateKeyToAccount } from 'viem/accounts'
import { base, baseSepolia } from 'viem/chains'
import { db } from '../db'
import { IDEA_REGISTRY_ABI } from '@pitchdrop/shared'

// ─── Config ───────────────────────────────────────────────────────────────────

const CRON_INTERVAL_MS = 60_000 // check every 60 s

// ─── Entry point ──────────────────────────────────────────────────────────────

export async function startResolutionEngine(): Promise<void> {
  const registryAddr = process.env.IDEA_REGISTRY_ADDRESS as Address | undefined
  const rawKey       = process.env.RESOLVER_PRIVATE_KEY

  const isMainnet = process.env.CHAIN === 'base'
  const chain     = isMainnet ? base : baseSepolia
  const rpcUrl    = isMainnet
    ? (process.env.BASE_RPC_URL      ?? 'https://mainnet.base.org')
    : (process.env.BASE_SEPOLIA_RPC_URL ?? 'https://sepolia.base.org')

  // Build optional on-chain clients
  let publicClient:  PublicClient | undefined
  let walletClient:  WalletClient | undefined

  if (registryAddr && rawKey) {
    const account = privateKeyToAccount(rawKey as `0x${string}`)
    publicClient  = createPublicClient({ chain, transport: http(rpcUrl) }) as unknown as PublicClient
    walletClient  = createWalletClient({ account, chain, transport: http(rpcUrl) }) as unknown as WalletClient
    console.log(
      `[resolver] Started | resolver=${account.address} | registry=${registryAddr} | chain=${chain.name}`,
    )
  } else {
    console.log(
      '[resolver] IDEA_REGISTRY_ADDRESS / RESOLVER_PRIVATE_KEY not set — running in DB-only mode',
    )
  }

  async function run(): Promise<void> {
    try {
      const expired = await db.idea.findMany({
        where: { status: 'active', closesAt: { lte: new Date() } },
      })

      if (expired.length === 0) return
      console.log(`[resolver] ${expired.length} idea(s) to resolve`)

      for (const idea of expired) {
        await resolveOne({
          idea,
          registryAddr,
          publicClient,
          walletClient,
        })
      }
    } catch (err) {
      console.error('[resolver] run error:', err)
    }
  }

  await run()
  setInterval(run, CRON_INTERVAL_MS)
}

// ─── Core resolution logic ────────────────────────────────────────────────────

async function resolveOne(opts: {
  idea:         Awaited<ReturnType<typeof db.idea.findMany>>[number]
  registryAddr: Address | undefined
  publicClient: PublicClient | undefined
  walletClient: WalletClient | undefined
}): Promise<void> {
  const { idea, registryAddr, publicClient, walletClient } = opts

  const won      = idea.yesWeight > idea.noWeight
  const pmfScore = computePmfScore(idea.yesWeight, idea.noWeight)
  const status   = won ? 'won' : 'graveyard'

  // ── On-chain resolution (when contracts + key are configured) ──────────────
  const isOnchain =
    registryAddr &&
    publicClient &&
    walletClient &&
    idea.onchainId &&
    !idea.onchainId.startsWith('pending')

  if (isOnchain) {
    try {
      // Simulate first to surface any revert before spending gas
      const { request } = await publicClient!.simulateContract({
        account:      walletClient!.account,
        address:      registryAddr!,
        abi:          IDEA_REGISTRY_ABI,
        functionName: 'resolveIdea',
        args:         [BigInt(idea.onchainId), won, pmfScore],
      })

      const txHash = await walletClient!.writeContract(request)
      await publicClient!.waitForTransactionReceipt({ hash: txHash })

      console.log(
        `[resolver] resolveIdea  onchainId=${idea.onchainId} won=${won} pmfScore=${pmfScore} tx=${txHash}`,
      )
      // DB update handled below (event indexer will also catch IdeaResolved,
      // making both paths idempotent)
    } catch (err) {
      // Log but still update DB — avoids stuck ideas if tx fails
      console.error(`[resolver] on-chain resolveIdea failed (id=${idea.id}):`, err)
    }
  }

  // ── DB resolution (always — source of truth for the feed) ─────────────────
  try {
    await db.idea.update({
      where: { id: idea.id },
      data:  { status, pmfScore },
    })
    console.log(
      `[resolver] DB updated  id=${idea.id} status=${status} pmfScore=${pmfScore}`,
    )
  } catch (err) {
    console.error(`[resolver] DB update failed (id=${idea.id}):`, err)
  }
}

// ─── PMF score ────────────────────────────────────────────────────────────────
//
// Current formula: YES% of total weight × 100, rounded to nearest integer.
// Range: 0 (all NO) → 100 (all YES).
// The Sovereign Agent (Story 8) will replace this with a richer evaluation.

function computePmfScore(yesWeight: number, noWeight: number): number {
  const total = yesWeight + noWeight
  if (total === 0) return 0
  return Math.round((yesWeight / total) * 100)
}
