const POLL_INTERVAL_MS = 300_000

type MilestoneSubmission = {
  ideaId:    string
  milestone: number
  evidence:  string
}

async function evaluateMilestone(sub: MilestoneSubmission): Promise<{ approved: boolean; confidence: number }> {
  // Production: calls Claude in TEE to evaluate evidence
  console.log(`[milestone] evaluating ideaId=${sub.ideaId} milestone=${sub.milestone}`)
  return { approved: true, confidence: 0.85 }
}

async function runMilestoneEvaluator(): Promise<void> {
  console.log('[milestone] polling for pending submissions…')
  // Production: fetch pending milestone submissions from indexer and evaluate each
}

export async function startMilestoneEvaluator(): Promise<void> {
  console.log('[milestone] starting, interval=', POLL_INTERVAL_MS)
  await runMilestoneEvaluator()
  setInterval(runMilestoneEvaluator, POLL_INTERVAL_MS)
}
