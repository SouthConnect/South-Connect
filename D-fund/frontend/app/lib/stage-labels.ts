export const STAGE_LABELS: Record<string, string> = {
  DRAFT: 'Draft',
  SUBMITTED: 'Submitted',
  OWNER_REVIEW: 'In Review',
  SUCCESS: 'Accepted',
  ARCHIVED: 'Archived',
}

export const STAGE_COLORS: Record<string, string> = {
  DRAFT: 'bg-gray-100 text-gray-600',
  SUBMITTED: 'bg-blue-50 text-blue-600',
  OWNER_REVIEW: 'bg-yellow-50 text-yellow-700',
  SUCCESS: 'bg-green-50 text-green-700',
  ARCHIVED: 'bg-red-50 text-red-600',
}

export function stageLabel(stage: string): string {
  return STAGE_LABELS[stage] ?? stage
}

export function stageColor(stage: string): string {
  return STAGE_COLORS[stage] ?? 'bg-gray-100 text-gray-600'
}
