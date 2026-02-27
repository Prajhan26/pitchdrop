import { z } from 'zod'

export const IdeaSubmissionSchema = z.object({
  title: z.string().min(10).max(120),
  description: z.string().min(50).max(2000),
  category: z.string().min(2).max(50),
  isAnonymous: z.boolean().default(false),
})

export const VoteSchema = z.object({
  ideaId: z.string(),
  direction: z.enum(['yes', 'no']),
})

export type IdeaSubmission = z.infer<typeof IdeaSubmissionSchema>
