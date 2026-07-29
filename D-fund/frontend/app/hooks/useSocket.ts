/**
 * The socket connection now lives in a React context (SocketProvider), not a
 * module-level mutable variable — see app/lib/SocketContext.tsx for the
 * implementation and the rationale. This file is kept as a stable import
 * path since @/app/hooks/useSocket is referenced from several chat/realtime
 * components.
 */
export { useSocket } from '@/app/lib/SocketContext'
