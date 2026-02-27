'use client'

import { useWriteContract, useReadContract } from 'wagmi'

const AIRDROP_DISTRIBUTOR_ABI = [
  { type: 'function', name: 'claim', inputs: [{ name: 'ideaId', type: 'uint256' }, { name: 'token', type: 'address' }, { name: 'amount', type: 'uint256' }, { name: 'proof', type: 'bytes32[]' }], outputs: [], stateMutability: 'nonpayable' },
  { type: 'function', name: 'hasClaimed', inputs: [{ name: 'ideaId', type: 'uint256' }, { name: 'claimer', type: 'address' }], outputs: [{ name: '', type: 'bool' }], stateMutability: 'view' },
  { type: 'function', name: 'merkleRoots', inputs: [{ name: 'ideaId', type: 'uint256' }], outputs: [{ name: '', type: 'bytes32' }], stateMutability: 'view' },
  { type: 'error', name: 'AlreadyClaimed', inputs: [] },
  { type: 'error', name: 'InvalidProof', inputs: [] },
  { type: 'error', name: 'NoRootSet', inputs: [] },
] as const

const DISTRIBUTOR_ADDRESS = (process.env.NEXT_PUBLIC_AIRDROP_DISTRIBUTOR_ADDRESS as `0x${string}`) || undefined

export function useHasClaimed(ideaId: string, claimer: string | undefined) {
  return useReadContract({
    address:      DISTRIBUTOR_ADDRESS,
    abi:          AIRDROP_DISTRIBUTOR_ABI,
    functionName: 'hasClaimed',
    args:         ideaId && claimer ? [BigInt(ideaId), claimer as `0x${string}`] : undefined,
    query:        { enabled: !!DISTRIBUTOR_ADDRESS && !!claimer && !!ideaId },
  })
}

export function useMerkleRootSet(ideaId: string) {
  const { data: root } = useReadContract({
    address:      DISTRIBUTOR_ADDRESS,
    abi:          AIRDROP_DISTRIBUTOR_ABI,
    functionName: 'merkleRoots',
    args:         ideaId ? [BigInt(ideaId)] : undefined,
    query:        { enabled: !!DISTRIBUTOR_ADDRESS && !!ideaId },
  })
  // root is bytes32 — zero means not set
  return root && root !== '0x0000000000000000000000000000000000000000000000000000000000000000'
}

type ClaimHook = {
  claim:       (ideaId: string, tokenAddr: string, amount: bigint, proof: `0x${string}`[]) => Promise<`0x${string}` | undefined>
  isPending:   boolean
  error:       Error | null
  isAvailable: boolean
}

export function useAirdropClaim(): ClaimHook {
  const { writeContractAsync, isPending, error } = useWriteContract()

  async function claim(ideaId: string, tokenAddr: string, amount: bigint, proof: `0x${string}`[]): Promise<`0x${string}` | undefined> {
    if (!DISTRIBUTOR_ADDRESS) return undefined
    return writeContractAsync({
      address:      DISTRIBUTOR_ADDRESS,
      abi:          AIRDROP_DISTRIBUTOR_ABI,
      functionName: 'claim',
      args:         [BigInt(ideaId), tokenAddr as `0x${string}`, amount, proof],
    })
  }

  return { claim, isPending, error: error as Error | null, isAvailable: !!DISTRIBUTOR_ADDRESS }
}
