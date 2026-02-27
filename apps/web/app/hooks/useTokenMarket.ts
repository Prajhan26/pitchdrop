'use client'

import { useReadContract, useWriteContract, usePublicClient } from 'wagmi'
import { parseEther, formatEther } from 'viem'

// Minimal ABI — only what the UI needs
const BONDING_CURVE_ABI = [
  { type: 'function', name: 'buy', inputs: [{ name: 'minTokensOut', type: 'uint256' }], outputs: [], stateMutability: 'payable' },
  { type: 'function', name: 'getTokensForEth', inputs: [{ name: 'ethAmount', type: 'uint256' }], outputs: [{ name: '', type: 'uint256' }], stateMutability: 'view' },
  { type: 'function', name: 'getEthForTokens', inputs: [{ name: 'tokenAmount', type: 'uint256' }], outputs: [{ name: '', type: 'uint256' }], stateMutability: 'view' },
  { type: 'function', name: 'totalRaised', inputs: [], outputs: [{ name: '', type: 'uint256' }], stateMutability: 'view' },
  { type: 'function', name: 'graduated', inputs: [], outputs: [{ name: '', type: 'bool' }], stateMutability: 'view' },
  { type: 'function', name: 'GRADUATION_TARGET', inputs: [], outputs: [{ name: '', type: 'uint256' }], stateMutability: 'view' },
  { type: 'function', name: 'BUILD_FUND_BPS', inputs: [], outputs: [{ name: '', type: 'uint256' }], stateMutability: 'view' },
  { type: 'event', name: 'Bought', inputs: [{ name: 'buyer', type: 'address', indexed: true }, { name: 'ethIn', type: 'uint256', indexed: false }, { name: 'tokensOut', type: 'uint256', indexed: false }, { name: 'newTotalRaised', type: 'uint256', indexed: false }], anonymous: false },
  { type: 'event', name: 'Graduated', inputs: [{ name: 'totalRaised', type: 'uint256', indexed: false }, { name: 'buildFundShare', type: 'uint256', indexed: false }], anonymous: false },
  { type: 'error', name: 'AlreadyGraduated', inputs: [] },
  { type: 'error', name: 'SlippageExceeded', inputs: [] },
  { type: 'error', name: 'ZeroValue', inputs: [] },
] as const

export function useBondingCurve(curveAddress: `0x${string}` | undefined) {
  const { data: totalRaised }       = useReadContract({ address: curveAddress, abi: BONDING_CURVE_ABI, functionName: 'totalRaised',        query: { enabled: !!curveAddress, refetchInterval: 10_000 } })
  const { data: graduated }         = useReadContract({ address: curveAddress, abi: BONDING_CURVE_ABI, functionName: 'graduated',           query: { enabled: !!curveAddress } })
  const { data: graduationTarget }  = useReadContract({ address: curveAddress, abi: BONDING_CURVE_ABI, functionName: 'GRADUATION_TARGET',   query: { enabled: !!curveAddress } })

  return { totalRaised, graduated, graduationTarget }
}

export function useTokensForEth(curveAddress: `0x${string}` | undefined, ethAmount: string) {
  const wei = ethAmount && !isNaN(Number(ethAmount)) && Number(ethAmount) > 0
    ? parseEther(ethAmount as `${number}`)
    : undefined

  const { data: tokensOut, isLoading } = useReadContract({
    address:      curveAddress,
    abi:          BONDING_CURVE_ABI,
    functionName: 'getTokensForEth',
    args:         wei ? [wei] : undefined,
    query:        { enabled: !!curveAddress && !!wei },
  })

  return { tokensOut, isLoading }
}

type BuyTokensHook = {
  buy:         (ethAmount: string, slippagePct?: number) => Promise<`0x${string}` | undefined>
  isPending:   boolean
  error:       Error | null
  isAvailable: boolean
}

export function useBuyTokens(curveAddress: `0x${string}` | undefined): BuyTokensHook {
  const { writeContractAsync, isPending, error } = useWriteContract()
  const publicClient = usePublicClient()

  async function buy(ethAmount: string, slippagePct = 5): Promise<`0x${string}` | undefined> {
    if (!curveAddress || !publicClient) return undefined
    const value = parseEther(ethAmount as `${number}`)

    // Estimate tokens then apply slippage
    const estimated = await publicClient.readContract({ address: curveAddress, abi: BONDING_CURVE_ABI, functionName: 'getTokensForEth', args: [value] })
    const minTokensOut = (estimated * BigInt(100 - slippagePct)) / 100n

    return writeContractAsync({
      address: curveAddress,
      abi:     BONDING_CURVE_ABI,
      functionName: 'buy',
      args:    [minTokensOut],
      value,
    })
  }

  return { buy, isPending, error: error as Error | null, isAvailable: !!curveAddress }
}

export { formatEther }
