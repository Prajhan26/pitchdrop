import { z } from 'zod'

const INDEXER_URL       = process.env.INDEXER_URL ?? 'http://localhost:3001'
const POLL_INTERVAL_MS  = 60_000

const IdeaSchema = z.object({
  id:          z.string(),
  title:       z.string(),
  description: z.string(),
  category:    z.string(),
  status:      z.string(),
  yesWeight:   z.number(),
  noWeight:    z.number(),
})
type Idea = z.infer<typeof IdeaSchema>

async function generateBullBear(idea: Idea): Promise<{ bull: string; bear: string; score: number }> {
  // Production: calls Anthropic Claude API inside EigenCloud TEE
  // const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })
  // const msg = await client.messages.create({ model: 'claude-opus-4-6', ... })
  const total     = idea.yesWeight + idea.noWeight
  const sentiment = total > 0 ? idea.yesWeight / total : 0.5
  return {
    bull:  `${Math.round(sentiment * 100)}% weighted conviction in "${idea.category}" — strong early signal.`,
    bear:  `${Math.round((1 - sentiment) * 100)}% skepticism — market validation still needed.`,
    score: Math.round(sentiment * 100),
  }
}

async function fetchActiveIdeas(): Promise<Idea[]> {
  try {
    const res  = await fetch(`${INDEXER_URL}/ideas?status=active&limit=50`)
    if (!res.ok) return []
    const data = await res.json() as { ideas: unknown[] }
    return data.ideas.flatMap(i => { try { return [IdeaSchema.parse(i)] } catch { return [] } })
  } catch { return [] }
}

async function runEvaluation(): Promise<void> {
  const ideas = await fetchActiveIdeas()
  console.log(`[bullBear] evaluating ${ideas.length} active ideas`)
  for (const idea of ideas) {
    try {
      const r = await generateBullBear(idea)
      console.log(`[bullBear] idea=${idea.id} score=${r.score}`)
    } catch (err) { console.error(`[bullBear] failed idea=${idea.id}`, err) }
  }
}

export async function startBullBearEvaluator(): Promise<void> {
  console.log('[bullBear] starting, interval=', POLL_INTERVAL_MS)
  await runEvaluation()
  setInterval(runEvaluation, POLL_INTERVAL_MS)
}
