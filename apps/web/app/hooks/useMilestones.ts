'use client'
import { useMutation } from '@tanstack/react-query'
import { api } from '../lib/api'
import type { MilestoneSubmission } from '../lib/api'

export function useSubmitMilestone() {
  return useMutation({
    mutationFn: (body: MilestoneSubmission) => api.submitMilestone(body),
  })
}
