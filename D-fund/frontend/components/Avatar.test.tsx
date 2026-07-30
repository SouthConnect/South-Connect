import { describe, it, expect, vi } from 'vitest'
import { render, fireEvent, screen } from '@testing-library/react'
import { Avatar } from './Avatar'

// next/image needs the Next.js runtime (loader, srcset generation) that
// doesn't exist under Vitest — swap it for a plain <img> that forwards the
// props this component actually relies on (src, onError).
vi.mock('next/image', () => ({
  default: (props: any) => {
    // eslint-disable-next-line @next/next/no-img-element
    return <img src={props.src} alt={props.alt ?? ''} onError={props.onError} />
  },
}))

// The component intentionally sets alt="" (decorative image), which gives
// the <img> ARIA role "presentation" instead of "img" — query by tag rather
// than getByRole('img').
const getImg = () => document.body.querySelector('img')

describe('Avatar', () => {
  it('renders the image when a src is provided', () => {
    render(<Avatar src="https://example.com/pic.jpg" name="Jane Doe" />)
    expect(getImg()).toHaveAttribute('src', 'https://example.com/pic.jpg')
  })

  it('falls back to the first initial when there is no src', () => {
    render(<Avatar name="Jane Doe" />)
    expect(getImg()).toBeNull()
    expect(screen.getByText('J')).toBeInTheDocument()
  })

  it('falls back to "?" when there is neither src nor name', () => {
    render(<Avatar />)
    expect(screen.getByText('?')).toBeInTheDocument()
  })

  it('falls back to the initial once the image fails to load, without needing a re-render from the parent', () => {
    render(<Avatar src="https://example.com/broken.jpg" name="Jane Doe" />)
    expect(getImg()).not.toBeNull()

    fireEvent.error(getImg()!)

    expect(getImg()).toBeNull()
    expect(screen.getByText('J')).toBeInTheDocument()
  })

  it('uses rounded-full by default and rounded-lg when square', () => {
    const { container, rerender } = render(<Avatar name="A" />)
    expect((container.firstChild as HTMLElement).className).toContain('rounded-full')

    rerender(<Avatar name="A" square />)
    expect((container.firstChild as HTMLElement).className).toContain('rounded-lg')
  })
})
