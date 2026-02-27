import { keccak256, toBytes, encodeAbiParameters, parseAbiParameters } from 'viem'
import { z } from 'zod'

const INDEXER_URL      = process.env.INDEXER_URL ?? 'http://localhost:3001'
const POLL_INTERVAL_MS = 120_000

const IdeaSchema = z.object({
  id:        z.string(),
  yesWeight: z.number(),
  noWeight:  z.number(),
  status:    z.string(),
})

function computeRef(ideaId: string, yesWeight: number, noWeight: number, ts: number): `0x${string}` {
  const enc = encodeAbiParameters(
    parseAbiParameters('string, uint256, uint256, uint256'),
    [ideaId, BigInt(Math.round(yesWeight * 1e9)), BigInt(Math.round(noWeight * 1e9)), BigInt(ts)]
  )
  return keccak256(toBytes(enc))
}

async function fetchWonIdeas() {
  try {
    const res  = await fetch(`${INDEXER_URL}/ideas?status=won&limit=100`)
    if (!res.ok) return []
    const data = await res.json() as { ideas: unknown[] }
    return data.ideas.flatMap(i => { try { return [IdeaSchema.parse(i)] } catch { return [] } })
  } catch { return [] }
}

async function runAttestationWorker(): Promise<void> {
  const ideas = await fetchWonIdeas()
  console.log(`[attestation] attesting ${ideas.length} won ideas`)
  for (const idea of ideas) {
    try {
      const ts  = Math.floor(Date.now() / 1000)
      const ref = computeRef(idea.id, idea.yesWeight, idea.noWeight, ts)
      console.log(`[attestation] idea=${idea.id} ref=${ref.slice(0, 18)}…`)
      // Production: submit blob to EigenDA, then call SovereignAgent.postAttestation on-chain
    } catch (err) { console.error(`[attestation] failed idea=${idea.id}`, err) }
  }
}

export async function startAttestationWorker(): Promise<void> {
  console.log('[attestation] starting, interval=', POLL_INTERVAL_MS)
  await runAttestationWorker()
  setInterval(runAttestationWorker, POLL_INTERVAL_MS)
}
