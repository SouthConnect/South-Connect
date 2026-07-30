import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import AuthGuard from './AuthGuard'
import { useAuth } from '@/app/lib/AuthContext'
import { usePathname } from 'next/navigation'

vi.mock('@/app/lib/AuthContext', () => ({
  useAuth: vi.fn(),
}))
vi.mock('next/navigation', () => ({
  usePathname: vi.fn(),
}))

const mockedUseAuth = vi.mocked(useAuth)
const mockedUsePathname = vi.mocked(usePathname)

beforeEach(() => {
  mockedUsePathname.mockReturnValue('/dashboard')
})

describe('AuthGuard', () => {
  it('shows the default skeleton while auth is resolving, not the children or sign-in prompt', () => {
    mockedUseAuth.mockReturnValue({ user: null, loading: true } as any)
    render(
      <AuthGuard>
        <p>Secret content</p>
      </AuthGuard>,
    )
    expect(screen.queryByText('Secret content')).not.toBeInTheDocument()
    expect(screen.queryByText('Connexion requise')).not.toBeInTheDocument()
  })

  it('uses a caller-provided skeleton instead of the default one when given', () => {
    mockedUseAuth.mockReturnValue({ user: null, loading: true } as any)
    render(
      <AuthGuard skeleton={<p>Custom skeleton</p>}>
        <p>Secret content</p>
      </AuthGuard>,
    )
    expect(screen.getByText('Custom skeleton')).toBeInTheDocument()
    expect(screen.queryByText('Secret content')).not.toBeInTheDocument()
  })

  it('shows the sign-in prompt with a redirect back to the current page when not authenticated', () => {
    mockedUseAuth.mockReturnValue({ user: null, loading: false } as any)
    mockedUsePathname.mockReturnValue('/my-opportunities')
    render(
      <AuthGuard>
        <p>Secret content</p>
      </AuthGuard>,
    )
    expect(screen.getByText('Connexion requise')).toBeInTheDocument()
    expect(screen.queryByText('Secret content')).not.toBeInTheDocument()
    expect(screen.getByText('Se connecter').closest('a')).toHaveAttribute(
      'href',
      '/login?redirect=%2Fmy-opportunities',
    )
  })

  it('shows the custom message on the sign-in prompt when provided', () => {
    mockedUseAuth.mockReturnValue({ user: null, loading: false } as any)
    render(
      <AuthGuard message="Connectez-vous pour postuler.">
        <p>Secret content</p>
      </AuthGuard>,
    )
    expect(screen.getByText('Connectez-vous pour postuler.')).toBeInTheDocument()
  })

  it('renders the children once authenticated', () => {
    mockedUseAuth.mockReturnValue({ user: { id: 'u1' }, loading: false } as any)
    render(
      <AuthGuard>
        <p>Secret content</p>
      </AuthGuard>,
    )
    expect(screen.getByText('Secret content')).toBeInTheDocument()
    expect(screen.queryByText('Connexion requise')).not.toBeInTheDocument()
  })
})
