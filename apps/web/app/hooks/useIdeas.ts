'use client'

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { api, type ApiIdea } from '../lib/api'

export function useIdeas(status = 'active') {
  return useQuery({
    queryKey: ['ideas', status],
    queryFn: () => api.getIdeas(status),
    refetchInterval: 30_000,
    staleTime: 10_000,
  })
}

export function useIdea(id: string) {
  return useQuery({
    queryKey: ['idea', id],
    queryFn: () => api.getIdea(id),
    enabled: !!id,
    refetchInterval: 15_000,
  })
}

export function useVoterRecord(ideaId: string, voterAddr: string | undefined) {
  return useQuery({
    queryKey: ['vote', ideaId, voterAddr],
    queryFn: () => api.getVote(ideaId, voterAddr!),
    enabled: !!voterAddr && !!ideaId,
  })
}

export function useCastVote() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: api.castVote,
    onSuccess: (_data, variables) => {
      // Invalidate the idea + feed so they refresh with new weights
      queryClient.invalidateQueries({ queryKey: ['ideas'] })
      queryClient.invalidateQueries({ queryKey: ['idea', variables.ideaId] })
      queryClient.invalidateQueries({
        queryKey: ['vote', variables.ideaId, variables.voterAddr],
      })
    },
  })
}

// Pure helper — NOT a hook. Formats ms remaining into a human-readable string.
export function formatCountdown(closesAt: string | null): string {
  const ms = closesAt ? new Date(closesAt).getTime() - Date.now() : 0
  if (ms <= 0) return 'closed'
  const h = Math.floor(ms / 3_600_000)
  const m = Math.floor((ms % 3_600_000) / 60_000)
  if (h >= 1) return `${h}h ${m}m left`
  const s = Math.floor((ms % 60_000) / 1_000)
  return `${m}m ${s}s left`
}

// Compute voting phase label + multiplier from publishedAt
export function getPhaseInfo(publishedAt: string | null): {
  label: string
  multiplier: string
  color: string
} {
  if (!publishedAt) return { label: 'unknown', multiplier: '1x', color: '#666' }
  const hoursElapsed = (Date.now() - new Date(publishedAt).getTime()) / 3_600_000
  if (hoursElapsed <= 12) return { label: 'EARLY',    multiplier: '3x', color: '#10b981' }
  if (hoursElapsed <= 55) return { label: 'MID',      multiplier: '2x', color: '#f59e0b' }
  if (hoursElapsed <= 69) return { label: 'LATE',     multiplier: '1x', color: '#f97316' }
  return                         { label: 'OVERTIME', multiplier: '1x', color: '#ef4444' }
}

export type { ApiIdea }
