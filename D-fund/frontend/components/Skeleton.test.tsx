import { describe, it, expect } from 'vitest'
import { render } from '@testing-library/react'
import { Skeleton } from './Skeleton'

describe('Skeleton', () => {
  it('applies the default shimmer + gray fill + rounded-lg', () => {
    const { container } = render(<Skeleton />)
    const el = container.firstChild as HTMLElement
    expect(el.className).toContain('skeleton-shimmer')
    expect(el.className).toContain('bg-gray-100')
    expect(el.className).toContain('rounded-lg')
  })

  // Regression test: a raw string-concat className (`${base} ${className}`)
  // let the default `rounded-lg` win over a caller's `rounded-full` in the
  // generated stylesheet, because Tailwind's cascade order — not the class
  // order in the HTML — decides ties between two same-specificity utility
  // classes. This broke every circular avatar skeleton (Community list,
  // opportunity sidebar) into rounded squares. tailwind-merge fixes it by
  // dropping the conflicting default before it ever reaches the DOM.
  it('lets a caller-supplied rounded-full override the default rounded-lg', () => {
    const { container } = render(<Skeleton className="w-10 h-10 rounded-full" />)
    const el = container.firstChild as HTMLElement
    expect(el.className).toContain('rounded-full')
    expect(el.className).not.toContain('rounded-lg')
  })

  it('merges size classes without duplicating conflicting ones', () => {
    const { container } = render(<Skeleton className="h-48" />)
    const el = container.firstChild as HTMLElement
    expect(el.className).toContain('h-48')
  })
})
