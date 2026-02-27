'use client'

import { useQuery } from '@tanstack/react-query'
import { api } from '../lib/api'

export function useScout(address: string | undefined) {
  return useQuery({
    queryKey:  ['scout', address],
    queryFn:   () => api.getScout(address!),
    enabled:   !!address,
    staleTime: 30_000,
  })
}
