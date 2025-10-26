'use client'

import { useEffect, useMemo, useRef } from 'react'
import { io } from 'socket.io-client'
import { SOCKET_EVENTS as EVENTS } from '@/constants/socketEvents'

let socketSingleton = null
let activeUserId = null
let subscriberCount = 0

function getToken() {
  if (typeof window === 'undefined') return null
  try { return localStorage.getItem('token') } catch { return null }
}

function ensureSocket(userId) {
  const baseUrl = process.env.NEXT_PUBLIC_SOCKET_URL || 'http://localhost:3001'
  const token = getToken()

  if (socketSingleton && activeUserId && String(activeUserId) === String(userId)) {
    return socketSingleton
  }

  if (socketSingleton) {
    try { socketSingleton.removeAllListeners() } catch {}
    try { socketSingleton.disconnect() } catch {}
    socketSingleton = null
  }

  socketSingleton = io(baseUrl, {
    autoConnect: !!userId,
    transports: ['websocket'],
    auth: token ? { token } : {},
  })
  activeUserId = userId || null

  if (userId) {
    socketSingleton.on('connect', () => {
      socketSingleton.emit(EVENTS.REGISTER, String(userId))
    })
  }

  return socketSingleton
}

/**
 * useSocket(userId, handlersOrCb)
 * - Back-compat: (notif) => void
 * - New:
 *    { onConnect, onDisconnect, onError, onNotification, events: { [evt]: fn } }
 */
export default function useSocket(userId, handlersOrCb) {
  const handlersRef = useRef(handlersOrCb)
  handlersRef.current = handlersOrCb

  const isBackCompatCb = typeof handlersOrCb === 'function'
  const handlers = useMemo(() => {
    if (isBackCompatCb) return { onNotification: handlersOrCb }
    return handlersOrCb || {}
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isBackCompatCb])

  const socket = useMemo(() => {
    if (!userId) return null
    return ensureSocket(userId)
  }, [userId])

  useEffect(() => {
    if (!socket || !userId) return

    subscriberCount += 1

    const { onConnect, onDisconnect, onError, onNotification, events } = handlers
    const offFns = []

    if (onConnect) {
      const h = () => onConnect(socket)
      socket.on('connect', h)
      offFns.push(() => socket.off('connect', h))
    }

    if (onDisconnect) {
      const h = (reason) => onDisconnect(reason)
      socket.on('disconnect', h)
      offFns.push(() => socket.off('disconnect', h))
    }

    if (onError) {
      const h = (err) => onError(err)
      socket.on('error', h)
      socket.on('connect_error', h)
      offFns.push(() => socket.off('error', h))
      offFns.push(() => socket.off('connect_error', h))
    }

    if (onNotification) {
      const h = (notif) => onNotification(notif)
      socket.on(EVENTS.NOTIFICATION, h)
      offFns.push(() => socket.off(EVENTS.NOTIFICATION, h))
    }

    if (events && typeof events === 'object') {
      Object.entries(events).forEach(([evt, fn]) => {
        if (typeof fn === 'function') {
          socket.on(evt, fn)
          offFns.push(() => socket.off(evt, fn))
        }
      })
    }

    return () => {
      offFns.forEach(off => { try { off() } catch {} })
      subscriberCount = Math.max(0, subscriberCount - 1)
      if (subscriberCount === 0 && socketSingleton) {
        try { socketSingleton.removeAllListeners() } catch {}
        try { socketSingleton.disconnect() } catch {}
        socketSingleton = null
        activeUserId = null
      }
    }
  }, [socket, userId, handlers])

  return useMemo(() => {
    if (!socket) return null

    const joinPvpRoom = (roomId) => { if (roomId) socket.emit(EVENTS.PVP.JOIN_CHANNEL, String(roomId)) }
    const leavePvpRoom = (roomId) => { if (roomId) socket.emit(EVENTS.PVP.LEAVE_CHANNEL, String(roomId)) }
    const $$emit = (event, payload) => socket.emit(event, payload)

    if (!socket.joinPvpRoom) Object.defineProperty(socket, 'joinPvpRoom', { value: joinPvpRoom, enumerable: false })
    if (!socket.leavePvpRoom) Object.defineProperty(socket, 'leavePvpRoom', { value: leavePvpRoom, enumerable: false })
    if (!socket.$$emit) Object.defineProperty(socket, '$$emit', { value: $$emit, enumerable: false })

    return socket
  }, [socket])
}
