import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import ConfirmModal from './ConfirmModal'

describe('ConfirmModal', () => {
  it('renders nothing when closed', () => {
    const { container } = render(
      <ConfirmModal open={false} title="t" description="d" onConfirm={vi.fn()} onCancel={vi.fn()} />,
    )
    expect(container).toBeEmptyDOMElement()
  })

  it('renders title, description and default labels when open', () => {
    render(<ConfirmModal open title="Delete opportunity?" description="This cannot be undone." onConfirm={vi.fn()} onCancel={vi.fn()} />)
    expect(screen.getByText('Delete opportunity?')).toBeInTheDocument()
    expect(screen.getByText('This cannot be undone.')).toBeInTheDocument()
    expect(screen.getByText('Confirm')).toBeInTheDocument()
    expect(screen.getByText('Cancel')).toBeInTheDocument()
  })

  it('calls onConfirm when the confirm button is clicked', () => {
    const onConfirm = vi.fn()
    render(<ConfirmModal open title="t" description="d" onConfirm={onConfirm} onCancel={vi.fn()} />)
    fireEvent.click(screen.getByText('Confirm'))
    expect(onConfirm).toHaveBeenCalledOnce()
  })

  it('calls onCancel when the cancel button, the close icon, or the backdrop is clicked', () => {
    const onCancel = vi.fn()
    const { container } = render(<ConfirmModal open title="t" description="d" onConfirm={vi.fn()} onCancel={onCancel} />)

    fireEvent.click(screen.getByText('Cancel'))
    expect(onCancel).toHaveBeenCalledTimes(1)

    fireEvent.click(container.firstChild as HTMLElement) // backdrop
    expect(onCancel).toHaveBeenCalledTimes(2)
  })

  it('does not call onCancel when clicking inside the dialog body (backdrop click stopPropagation)', () => {
    const onCancel = vi.fn()
    render(<ConfirmModal open title="Delete?" description="d" onConfirm={vi.fn()} onCancel={onCancel} />)
    fireEvent.click(screen.getByText('Delete?'))
    expect(onCancel).not.toHaveBeenCalled()
  })

  it('calls onCancel on Escape while open, and stops listening once closed', () => {
    const onCancel = vi.fn()
    const { rerender } = render(<ConfirmModal open title="t" description="d" onConfirm={vi.fn()} onCancel={onCancel} />)

    fireEvent.keyDown(window, { key: 'Escape' })
    expect(onCancel).toHaveBeenCalledTimes(1)

    rerender(<ConfirmModal open={false} title="t" description="d" onConfirm={vi.fn()} onCancel={onCancel} />)
    fireEvent.keyDown(window, { key: 'Escape' })
    expect(onCancel).toHaveBeenCalledTimes(1) // unchanged — listener was removed
  })

  it('uses custom confirm/cancel labels when provided', () => {
    render(
      <ConfirmModal
        open
        title="t"
        description="d"
        confirmLabel="Supprimer"
        cancelLabel="Annuler"
        onConfirm={vi.fn()}
        onCancel={vi.fn()}
      />,
    )
    expect(screen.getByText('Supprimer')).toBeInTheDocument()
    expect(screen.getByText('Annuler')).toBeInTheDocument()
  })
})
