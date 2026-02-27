const BASE_URL = process.env.NEXT_PUBLIC_INDEXER_URL ?? 'http://localhost:3001'

export type ApiIdea = {
  id: string
  onchainId: string
  title: string
  description: string
  category: string
  isAnonymous: boolean
  founderAddr: string | null
  status: 'active' | 'won' | 'graveyard' | 'pending'
  publishedAt: string | null
  closesAt: string | null
  yesWeight: number
  noWeight: number
  pmfScore: number | null
  createdAt: string
  updatedAt: string
  votes?: ApiVote[]
}

export type ApiVote = {
  id: string
  ideaId: string
  voterAddr: string
  direction: 'yes' | 'no'
  weight: number
  tier: number | null
  castedAt: string
}

export type IdeasResponse = {
  ideas: ApiIdea[]
  total: number
  page: number
  limit: number
}

async function apiFetch<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${BASE_URL}${path}`, {
    headers: { 'Content-Type': 'application/json' },
    ...init,
  })
  if (!res.ok) {
    const body = await res.json().catch(() => ({}))
    throw new Error(body.error ?? `HTTP ${res.status}`)
  }
  return res.json() as Promise<T>
}

export const api = {
  getIdeas: (status = 'active', page = 1, limit = 20) =>
    apiFetch<IdeasResponse>(`/ideas?status=${status}&page=${page}&limit=${limit}`),

  getIdea: (id: string) =>
    apiFetch<{ idea: ApiIdea }>(`/ideas/${id}`),

  createIdea: (body: {
    title: string
    description: string
    category: string
    isAnonymous: boolean
    founderAddr?: string
    onchainId?: string
  }) =>
    apiFetch<{ idea: ApiIdea }>('/ideas', { method: 'POST', body: JSON.stringify(body) }),

  castVote: (body: {
    ideaId: string
    voterAddr: string
    direction: 'yes' | 'no'
    txHash?: `0x${string}`
  }) =>
    apiFetch<{ vote: ApiVote; tier: number; weight: number }>('/votes', {
      method: 'POST',
      body: JSON.stringify(body),
    }),

  getVote: (ideaId: string, voterAddr: string) =>
    apiFetch<{ voted: boolean; vote?: ApiVote }>(`/votes/${ideaId}/${voterAddr}`),
}
