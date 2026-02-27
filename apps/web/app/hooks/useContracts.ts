'use client'

import { useWriteContract, usePublicClient } from 'wagmi'
import { keccak256, toBytes, parseEventLogs } from 'viem'
import { IDEA_REGISTRY_ABI, VOTING_ENGINE_ABI } from '@pitchdrop/shared'

// Pull addresses from env — undefined when contracts aren't deployed yet.
// The hooks degrade gracefully: if address is missing, the caller gets undefined
// back and can fall through to the off-chain path.
const REGISTRY_ADDRESS =
  (process.env.NEXT_PUBLIC_IDEA_REGISTRY_ADDRESS as `0x${string}`) || undefined

const ENGINE_ADDRESS =
  (process.env.NEXT_PUBLIC_VOTING_ENGINE_ADDRESS as `0x${string}`) || undefined

export { REGISTRY_ADDRESS, ENGINE_ADDRESS }

type RegisterIdeaHook = {
  registerIdea: (title: string) => Promise<string | undefined>
  isPending:    boolean
  error:        Error | null
  isAvailable:  boolean
}

type CastVoteOnChainHook = {
  castVote:    (onchainId: string, direction: 'yes' | 'no') => Promise<`0x${string}` | undefined>
  isPending:   boolean
  error:       Error | null
  isAvailable: boolean
}

// ── registerIdea ─────────────────────────────────────────────────────────────

export function useRegisterIdea(): RegisterIdeaHook {
  const { writeContractAsync, isPending, error } = useWriteContract()
  const publicClient = usePublicClient()

  async function registerIdea(title: string): Promise<string | undefined> {
    if (!REGISTRY_ADDRESS || !publicClient) return undefined

    const titleHash = keccak256(toBytes(title))

    const txHash = await writeContractAsync({
      address: REGISTRY_ADDRESS,
      abi:     IDEA_REGISTRY_ABI,
      functionName: 'registerIdea',
      args:    [titleHash],
    })

    // Wait for confirmation and parse the IdeaRegistered event to extract ideaId
    const receipt = await publicClient.waitForTransactionReceipt({ hash: txHash })
    const logs    = parseEventLogs({
      abi:       IDEA_REGISTRY_ABI,
      logs:      receipt.logs,
      eventName: 'IdeaRegistered',
    })

    const onchainId = logs[0]?.args.ideaId?.toString()
    return onchainId
  }

  return {
    registerIdea,
    isPending,
    error:       error as Error | null,
    isAvailable: !!REGISTRY_ADDRESS,
  }
}

// ── castVoteOnChain ───────────────────────────────────────────────────────────

export function useCastVoteOnChain(): CastVoteOnChainHook {
  const { writeContractAsync, isPending, error } = useWriteContract()

  async function castVote(
    onchainId: string,
    direction: 'yes' | 'no',
  ): Promise<`0x${string}` | undefined> {
    if (!ENGINE_ADDRESS) return undefined

    const txHash = await writeContractAsync({
      address: ENGINE_ADDRESS,
      abi:     VOTING_ENGINE_ABI,
      functionName: 'castVote',
      args:    [BigInt(onchainId), direction === 'yes'],
    })

    return txHash
  }

  return {
    castVote,
    isPending,
    error:       error as Error | null,
    isAvailable: !!ENGINE_ADDRESS,
  }
}
