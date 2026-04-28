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

export const ACTIVITY_LABELS: Record<string, string> = {
  PAPER_SUBMISSION: "Paper Submission",
  REVIEWER_BIDDING: "Reviewer Bidding",
  REVIEW_SUBMISSION: "Review Submission",
  REVIEW_DISCUSSION: "Review Discussion",
  AUTHOR_NOTIFICATION: "Author Notification",
  CAMERA_READY_SUBMISSION: "Camera-ready",
  REGISTRATION: "Registration",
  EVENT_DAY: "Event Day",
}

export interface UpcomingActivityDeadline {
  activityType: string
  label: string
  daysLeft: number
  isUrgent: boolean
}

export const toUpcomingActivityDeadline = (
  activity?: ConferenceActivityDTO | null,
  now: Date = new Date(),
): UpcomingActivityDeadline | null => {
  if (!activity?.isEnabled || !activity.deadline) return null

  const deadline = new Date(activity.deadline)
  if (Number.isNaN(deadline.getTime()) || deadline <= now) return null

  const daysLeft = Math.ceil((deadline.getTime() - now.getTime()) / 86400000)
  return {
    activityType: activity.activityType,
    label: ACTIVITY_LABELS[activity.activityType] || activity.activityType,
    daysLeft,
    isUrgent: daysLeft <= 5,
  }
}

export const getUpcomingActivityDeadline = (
  activities: ConferenceActivityDTO[],
  now: Date = new Date(),
): UpcomingActivityDeadline | null => {
  const upcoming = activities
    .filter((a) => a.isEnabled && a.deadline)
    .map((a) => ({ ...a, d: new Date(a.deadline!) }))
    .filter((a) => !Number.isNaN(a.d.getTime()) && a.d > now)
    .sort((a, b) => a.d.getTime() - b.d.getTime())[0]

  if (!upcoming) return null

  const daysLeft = Math.ceil((upcoming.d.getTime() - now.getTime()) / 86400000)
  return {
    activityType: upcoming.activityType,
    label: ACTIVITY_LABELS[upcoming.activityType] || upcoming.activityType,
    daysLeft,
    isUrgent: daysLeft <= 5,
  }
}
