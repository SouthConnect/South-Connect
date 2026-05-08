'use client'

import { useEffect, useRef } from 'react'
import { io, Socket } from 'socket.io-client'
import { useAuth } from '@/app/lib/AuthContext'

let sharedSocket: Socket | null = null
let connectedUsers = 0

function getSocketUrl(): string {
  const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api/v1'
  return apiUrl.replace('/api/v1', '')
}

/**
 * Hook qui retourne un socket.io connecté au namespace /chat.
 * La connexion est partagée et ref-countée : le socket se déconnecte
 * uniquement quand tous les consommateurs sont démontés.
 *
 * L'authentification est assurée par le cookie HttpOnly access_token envoyé
 * automatiquement grâce à withCredentials: true — aucun token n'est lu
 * par JavaScript.
 */
export function useSocket(): Socket | null {
  const { user } = useAuth()
  const socketRef = useRef<Socket | null>(null)

  useEffect(() => {
    if (!user) return

    if (!sharedSocket || !sharedSocket.connected) {
      sharedSocket = io(`${getSocketUrl()}/chat`, {
        withCredentials: true, // sends the access_token HttpOnly cookie automatically
        transports: ['websocket', 'polling'],
        reconnection: true,
        reconnectionDelay: 1000,
        reconnectionAttempts: 5,
      })
    }

    socketRef.current = sharedSocket
    connectedUsers++

    return () => {
      connectedUsers--
      if (connectedUsers <= 0) {
        sharedSocket?.disconnect()
        sharedSocket = null
        connectedUsers = 0
      }
      socketRef.current = null
    }
  }, [user])

  return socketRef.current
}
