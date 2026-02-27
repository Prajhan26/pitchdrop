import type { Address } from 'viem'

export type IdeaStatus = 'pending' | 'active' | 'won' | 'graveyard'
export type VoteDirection = 'yes' | 'no'
export type AirdropTier = 1 | 2 | 3
export type VotingPhase = 'early' | 'mid' | 'late' | 'overtime'

export interface Idea {
  id: string
  onchainId: string
  title: string
  description: string
  category: string
  isAnonymous: boolean
  founderAddr?: Address
  status: IdeaStatus
  publishedAt?: Date
  closesAt?: Date
  yesWeight: number
  noWeight: number
  pmfScore?: number
}

export interface Vote {
  ideaId: string
  voterAddr: Address
  direction: VoteDirection
  weight: number
  tier?: AirdropTier
  castedAt: Date
}

export interface ReputationScore {
  walletAddr: Address
  score: number
  totalVotes: number
  correctCalls: number
  streakDays: number
}

export function getVotingPhase(hoursElapsed: number): VotingPhase {
  if (hoursElapsed <= 12) return 'early'
  if (hoursElapsed <= 55) return 'mid'
  if (hoursElapsed <= 69) return 'late'
  return 'overtime'
}

export function getAirdropTier(hoursElapsed: number): AirdropTier {
  if (hoursElapsed <= 12) return 1
  if (hoursElapsed <= 36) return 2
  return 3
}
