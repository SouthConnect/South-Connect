import { describe, it, expect } from 'vitest'
import { render } from '@testing-library/react'
import { Spinner } from './Spinner'

describe('Spinner', () => {
  it('defaults to the md size with a 2px border', () => {
    const { getByRole } = render(<Spinner />)
    const el = getByRole('status')
    expect(el.className).toContain('w-8')
    expect(el.className).toContain('h-8')
    expect(el.className).toContain('border-2')
  })

  it('uses a thicker border for the lg size, not a doubled-up class list', () => {
    const { getByRole } = render(<Spinner size="lg" />)
    const el = getByRole('status')
    expect(el.className).toContain('border-[3px]')
    expect(el.className).not.toContain('border-2')
  })

  it('always uses the single brand color + transparent-top construction', () => {
    const { getByRole } = render(<Spinner size="sm" />)
    const el = getByRole('status')
    expect(el.className).toContain('border-[#3b49df]')
    expect(el.className).toContain('border-t-transparent')
    expect(el.className).toContain('animate-spin')
  })

  it('lets a caller override the size via className without leaving both sizes applied', () => {
    const { getByRole } = render(<Spinner size="sm" className="w-20 h-20" />)
    const el = getByRole('status')
    expect(el.className).toContain('w-20')
    expect(el.className).not.toContain('w-4')
  })
})
