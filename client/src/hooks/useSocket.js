// client/src/hooks/useSocket.js
import { useEffect, useRef } from 'react'
import { io } from 'socket.io-client'

export default function useSocket(userId, onNotification) {
  const socketRef = useRef(null)

  useEffect(() => {
    if (!userId) return
    const socket = io(process.env.NEXT_PUBLIC_SOCKET_URL || 'http://localhost:3001')
    socketRef.current = socket

    socket.on('connect', () => {
      socket.emit('register', userId)
    })

    socket.on('notification', (data) => {
      if (onNotification) onNotification(data)
    })

    return () => {
      socket.disconnect()
    }
  }, [userId])

  return socketRef.current
}
