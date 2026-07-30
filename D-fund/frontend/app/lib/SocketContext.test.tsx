import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor, act } from '@testing-library/react'
import { EventEmitter } from 'node:events'
import { SocketProvider, useSocket } from './SocketContext'
import { useAuth } from '@/app/lib/AuthContext'
import { qk } from '@/app/lib/queryKeys'
import { toast } from 'sonner'
import { createTestQueryClient, withQueryClient } from '@/app/lib/test-utils'

/**
 * Fake Socket.IO client: two independent EventEmitters, one for the Socket
 * (`s`) and one for its Manager (`s.io`) — mirrors the real library, where
 * `reconnect`/`reconnect_attempt`/etc. are Manager-only events. A mock that
 * merged both into one emitter would hide the exact bug this file's
 * production code documents fixing (see SocketContext.tsx's doc comment).
 */
function withSocketIoOff(emitter: EventEmitter): EventEmitter {
  // socket.io-client's .off(event) with no listener removes every listener
  // for that event; Node's native EventEmitter.off requires one. Patch it so
  // the fake matches the real API SocketContext.tsx actually calls.
  const originalOff = emitter.off.bind(emitter)
  emitter.off = ((event?: string, listener?: (...args: unknown[]) => void) => {
    if (event === undefined) return emitter.removeAllListeners()
    if (listener === undefined) return emitter.removeAllListeners(event)
    return originalOff(event, listener)
  }) as typeof emitter.off
  return emitter
}

function makeFakeSocket() {
  const socket = withSocketIoOff(new EventEmitter()) as EventEmitter & {
    io: EventEmitter
    disconnect: ReturnType<typeof vi.fn>
  }
  socket.io = withSocketIoOff(new EventEmitter())
  socket.disconnect = vi.fn()
  return socket
}

let lastSocket: ReturnType<typeof makeFakeSocket> | null = null
const ioFactory = vi.fn((..._args: unknown[]) => {
  lastSocket = makeFakeSocket()
  return lastSocket
})

vi.mock('socket.io-client', () => ({
  io: (...args: unknown[]) => ioFactory(...args),
}))
vi.mock('@/app/lib/AuthContext', () => ({ useAuth: vi.fn() }))
vi.mock('sonner', () => ({ toast: { error: vi.fn(), dismiss: vi.fn() } }))

const mockedUseAuth = vi.mocked(useAuth)

function SocketProbe() {
  const socket = useSocket()
  return <p data-testid="socket-state">{socket ? 'connected' : 'null'}</p>
}

function renderProvider(queryClient = createTestQueryClient()) {
  const Wrapper = withQueryClient(queryClient)
  const utils = render(
    <Wrapper>
      <SocketProvider>
        <SocketProbe />
      </SocketProvider>
    </Wrapper>,
  )
  return { ...utils, queryClient }
}

beforeEach(() => {
  ioFactory.mockClear()
  lastSocket = null
})

describe('SocketProvider — connection lifecycle', () => {
  it('does not connect when there is no user', () => {
    mockedUseAuth.mockReturnValue({ user: null, refreshUser: vi.fn() } as any)
    renderProvider()
    expect(ioFactory).not.toHaveBeenCalled()
    expect(screen.getByTestId('socket-state')).toHaveTextContent('null')
  })

  it('connects to the /chat namespace once a user is present', () => {
    mockedUseAuth.mockReturnValue({ user: { id: 'u1' }, refreshUser: vi.fn() } as any)
    renderProvider()
    expect(ioFactory).toHaveBeenCalledOnce()
    expect(ioFactory.mock.calls[0][0]).toContain('/chat')
    expect(screen.getByTestId('socket-state')).toHaveTextContent('connected')
  })

  it('tears down the socket (disconnect + listener removal) on unmount', () => {
    mockedUseAuth.mockReturnValue({ user: { id: 'u1' }, refreshUser: vi.fn() } as any)
    const { unmount } = renderProvider()
    const socket = lastSocket!
    expect(socket.listenerCount('tokenExpired')).toBeGreaterThan(0)

    unmount()

    expect(socket.disconnect).toHaveBeenCalledOnce()
    expect(socket.listenerCount('tokenExpired')).toBe(0)
    expect(socket.io.listenerCount('reconnect')).toBe(0)
  })

  it('reconnects a fresh socket when the logged-in user changes', () => {
    mockedUseAuth.mockReturnValue({ user: { id: 'u1' }, refreshUser: vi.fn() } as any)
    const queryClient = createTestQueryClient()
    const Wrapper = withQueryClient(queryClient)
    const { rerender } = render(
      <Wrapper>
        <SocketProvider>
          <SocketProbe />
        </SocketProvider>
      </Wrapper>,
    )
    const firstSocket = lastSocket!

    mockedUseAuth.mockReturnValue({ user: { id: 'u2' }, refreshUser: vi.fn() } as any)
    rerender(
      <Wrapper>
        <SocketProvider>
          <SocketProbe />
        </SocketProvider>
      </Wrapper>,
    )

    expect(firstSocket.disconnect).toHaveBeenCalledOnce()
    expect(ioFactory).toHaveBeenCalledTimes(2)
    expect(lastSocket).not.toBe(firstSocket)
  })
})

describe('SocketProvider — event wiring', () => {
  it('silently refreshes auth when the server marks the token expired', () => {
    const refreshUser = vi.fn()
    mockedUseAuth.mockReturnValue({ user: { id: 'u1' }, refreshUser } as any)
    renderProvider()

    act(() => lastSocket!.emit('tokenExpired'))
    expect(refreshUser).toHaveBeenCalledOnce()
  })

  it('refreshes auth on a server-initiated disconnect, not on a network blip', () => {
    const refreshUser = vi.fn()
    mockedUseAuth.mockReturnValue({ user: { id: 'u1' }, refreshUser } as any)
    renderProvider()

    act(() => lastSocket!.emit('disconnect', 'transport close'))
    expect(refreshUser).not.toHaveBeenCalled()

    act(() => lastSocket!.emit('disconnect', 'io server disconnect'))
    expect(refreshUser).toHaveBeenCalledOnce()
  })

  it('listens for reconnect on the Manager (socket.io), not on the socket itself — regression for the dead-code bug this file fixed', () => {
    mockedUseAuth.mockReturnValue({ user: { id: 'u1' }, refreshUser: vi.fn() } as any)
    const queryClient = createTestQueryClient()
    const invalidateSpy = vi.spyOn(queryClient, 'invalidateQueries')
    renderProvider(queryClient)

    // Emitting 'reconnect' on the socket itself must NOT trigger the handler —
    // Socket.IO never actually does this in production; a mock/test that let
    // it work here would mask the real bug.
    act(() => lastSocket!.emit('reconnect'))
    expect(invalidateSpy).not.toHaveBeenCalled()

    act(() => lastSocket!.io.emit('reconnect'))
    expect(toast.dismiss).toHaveBeenCalledWith('socket-error')
    expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: qk.privateDiscussions('u1') })
    expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: qk.notifications('u1') })
    expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: qk.notificationsCount('u1') })
  })

  it('shows a persistent toast on a connection error', () => {
    mockedUseAuth.mockReturnValue({ user: { id: 'u1' }, refreshUser: vi.fn() } as any)
    renderProvider()

    act(() => lastSocket!.emit('connect_error'))
    expect(toast.error).toHaveBeenCalledWith(
      'Connexion temps réel perdue. Tentative de reconnexion…',
      expect.objectContaining({ id: 'socket-error' }),
    )
  })
})
