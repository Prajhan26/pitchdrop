'use client'
import { useQuery } from '@tanstack/react-query'
import { api } from '../lib/api'

export function useAirdropEligibility(walletAddr: string | undefined) {
  return useQuery({
    queryKey:  ['airdrop', walletAddr],
    queryFn:   () => api.getAirdropEligibility(walletAddr!),
    enabled:   !!walletAddr,
    staleTime: 60_000,
  })
}
