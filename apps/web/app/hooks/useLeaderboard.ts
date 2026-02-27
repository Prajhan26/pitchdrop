'use client'
import { useQuery } from '@tanstack/react-query'
import { api } from '../lib/api'

export function useLeaderboard() {
  return useQuery({
    queryKey:  ['leaderboard'],
    queryFn:   () => api.getLeaderboard(),
    staleTime: 60_000,
  })
}
