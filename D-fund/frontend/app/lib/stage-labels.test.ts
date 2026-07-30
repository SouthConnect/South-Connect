import { describe, it, expect } from 'vitest'
import { stageLabel, STAGE_LABELS, STAGE_COLORS } from './stage-labels'

describe('stageLabel', () => {
  it('returns the human-readable label for every known stage', () => {
    for (const [stage, label] of Object.entries(STAGE_LABELS)) {
      expect(stageLabel(stage)).toBe(label)
    }
  })

  it('falls back to the raw stage string for an unknown value', () => {
    expect(stageLabel('SOME_FUTURE_STAGE')).toBe('SOME_FUTURE_STAGE')
  })
})

describe('STAGE_LABELS / STAGE_COLORS', () => {
  it('define a color for every stage that has a label, and vice versa', () => {
    expect(Object.keys(STAGE_COLORS).sort()).toEqual(Object.keys(STAGE_LABELS).sort())
  })
})
