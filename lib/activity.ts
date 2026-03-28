import type { ConferenceActivityDTO } from "@/types/conference"

export const isActivityOpen = (activity?: ConferenceActivityDTO | null): boolean => {
  if (!activity) return false
  if (!activity.isEnabled) return false
  if (!activity.deadline) return false

  const deadlineDate = new Date(activity.deadline)
  if (Number.isNaN(deadlineDate.getTime())) return false

  const now = new Date()
  return now <= deadlineDate
}

