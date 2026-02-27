import { startBullBearEvaluator } from './evaluators/bullBear.js'
import { startAttestationWorker } from './evaluators/attestation.js'
import { startMilestoneEvaluator } from './evaluators/milestone.js'

async function main() {
  console.log('[agent] pitchdrop Sovereign Agent v1.0.0')
  console.log('[agent] env:', process.env.NODE_ENV ?? 'development')

  await startBullBearEvaluator()
  await startAttestationWorker()
  await startMilestoneEvaluator()

  process.on('SIGTERM', () => {
    console.log('[agent] shutting down')
    process.exit(0)
  })
}

main().catch((err) => {
  console.error('[agent] fatal:', err)
  process.exit(1)
})
