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

// ─── ABI ──────────────────────────────────────────────────────────────────────

const REPUTATION_REGISTRY_ABI = [
  { type: 'function', name: 'tokenOfWallet', inputs: [{ name: 'wallet', type: 'address' }], outputs: [{ name: '', type: 'uint256' }], stateMutability: 'view' },
  { type: 'function', name: 'mint', inputs: [{ name: 'wallet', type: 'address' }, { name: 'score', type: 'uint8' }, { name: 'totalVotes', type: 'uint32' }, { name: 'correctCalls', type: 'uint32' }, { name: 'streakDays', type: 'uint32' }], outputs: [{ name: 'tokenId', type: 'uint256' }], stateMutability: 'nonpayable' },
  { type: 'function', name: 'updateReputation', inputs: [{ name: 'wallet', type: 'address' }, { name: 'score', type: 'uint8' }, { name: 'totalVotes', type: 'uint32' }, { name: 'correctCalls', type: 'uint32' }, { name: 'streakDays', type: 'uint32' }], outputs: [], stateMutability: 'nonpayable' },
  { type: 'error', name: 'AlreadyMinted', inputs: [] },
  { type: 'error', name: 'NotYetMinted', inputs: [] },
  { type: 'error', name: 'Soulbound', inputs: [] },
] as const

// ─── Config ───────────────────────────────────────────────────────────────────

const CRON_INTERVAL_MS = 10 * 60 * 1000 // 10 minutes

// ─── Entry point ──────────────────────────────────────────────────────────────

export async function startReputationMinter(): Promise<void> {
  const registryAddr = process.env.REPUTATION_REGISTRY_ADDRESS as Address | undefined
  const rawKey       = process.env.REPUTATION_MINTER_PRIVATE_KEY

  if (!registryAddr || !rawKey) {
    console.warn(
      '[reputationMinter] REPUTATION_REGISTRY_ADDRESS / REPUTATION_MINTER_PRIVATE_KEY not set — skipping',
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
    `[reputationMinter] Started | minter=${account.address} | registry=${registryAddr} | chain=${chain.name}`,
  )

  async function run(): Promise<void> {
    try {
      const rows = await db.reputation.findMany()

      if (rows.length === 0) return
      console.log(`[reputationMinter] Processing ${rows.length} reputation row(s)`)

      for (const row of rows) {
        await mintOrUpdate({
          row,
          registryAddr: registryAddr!,
          publicClient,
          walletClient,
        })
      }
    } catch (err) {
      console.error('[reputationMinter] run error:', err)
    }
  }

  await run()
  setInterval(run, CRON_INTERVAL_MS)
}

// ─── Per-wallet logic ─────────────────────────────────────────────────────────

async function mintOrUpdate(opts: {
  row:           Awaited<ReturnType<typeof db.reputation.findMany>>[number]
  registryAddr:  Address
  publicClient:  PublicClient
  walletClient:  WalletClient
}): Promise<void> {
  const { row, registryAddr, publicClient, walletClient } = opts

  // Clamp values to on-chain types
  const score        = Math.max(0, Math.min(100, Math.round(row.score))) as number
  const totalVotes   = Math.max(0, Math.min(0xffffffff, row.totalVotes))
  const correctCalls = Math.max(0, Math.min(0xffffffff, row.correctCalls))
  const streakDays   = Math.max(0, Math.min(0xffffffff, row.streakDays))

  const wallet = row.walletAddr as Address

  try {
    // Check whether a token already exists for this wallet
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const tokenId = await publicClient.readContract({
      address:      registryAddr,
      abi:          REPUTATION_REGISTRY_ABI,
      functionName: 'tokenOfWallet',
      args:         [wallet],
    } as any) as bigint

    const alreadyMinted = tokenId !== 0n

    if (alreadyMinted) {
      // Update existing token
      const { request } = await publicClient.simulateContract({
        account:      walletClient.account,
        address:      registryAddr,
        abi:          REPUTATION_REGISTRY_ABI,
        functionName: 'updateReputation',
        args:         [wallet, score, totalVotes, correctCalls, streakDays],
      })
      const txHash = await walletClient.writeContract(request)
      await publicClient.waitForTransactionReceipt({ hash: txHash })
      console.log(
        `[reputationMinter] updateReputation wallet=${wallet} score=${score} tx=${txHash}`,
      )
    } else {
      // Mint new token
      const { request } = await publicClient.simulateContract({
        account:      walletClient.account,
        address:      registryAddr,
        abi:          REPUTATION_REGISTRY_ABI,
        functionName: 'mint',
        args:         [wallet, score, totalVotes, correctCalls, streakDays],
      })
      const txHash = await walletClient.writeContract(request)
      await publicClient.waitForTransactionReceipt({ hash: txHash })
      console.log(
        `[reputationMinter] mint wallet=${wallet} score=${score} tx=${txHash}`,
      )
    }
  } catch (err) {
    console.error(`[reputationMinter] failed for wallet=${wallet}:`, err)
  }
}
