// client/src/hooks/useApi.js
'use client'

import { toast } from 'react-hot-toast'
import { mapError } from '@/utils/errorMap'

const REDIRECT_FLAG = 'auth:redirected'

export default function useApi() {
  const baseUrl = '/api'
  const getToken = () =>
    typeof window !== 'undefined' ? localStorage.getItem('token') : null

  const defaultHeaders = () => {
    const token = getToken()
    return {
      'Content-Type': 'application/json',
      'x-client-now': String(Date.now()),
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    }
  }

  function safeRedirectToLoginOnce() {
    if (typeof window === 'undefined') return
    const { pathname, search } = window.location
    const isOnLogin = pathname.startsWith('/login')
    if (isOnLogin) return

    const flagged = sessionStorage.getItem(REDIRECT_FLAG)
    if (flagged) return

    try { sessionStorage.setItem(REDIRECT_FLAG, '1') } catch {}
    try { localStorage.removeItem('token') } catch {}

    const next = encodeURIComponent(pathname + search)
    // replace để không để user quay lại trang lỗi
    window.location.replace(`/login?next=${next}`)
  }

  function notifyError(payloadLike) {
    const mapped = mapError({ __payload: payloadLike })
    if (mapped?.message) toast.error(mapped.message)
  }

  async function request(path, { method = 'GET', body } = {}) {
    let res
    try {
      res = await fetch(baseUrl + path, {
        method,
        headers: defaultHeaders(),
        body: body ? JSON.stringify(body) : undefined,
        cache: 'no-store',
      })
    } catch {
      const payload = { code: 'INTERNAL_ERROR', message: 'Network error' }
      notifyError(payload)
      const err = new Error('Network error')
      err.__payload = payload
      throw err
    }

    // cố gắng parse JSON (kể cả khi !res.ok)
    let data = null
    try { data = await res.json() } catch {}

    // 🔒 Auth hết hạn / không hợp lệ → logout + redirect 1 lần (tránh lặp)
    if (res.status === 401 || res.status === 403) {
      const payload =
        data && (data.code || data.message)
          ? data
          : { code: 'AUTH_EXPIRED', message: 'Session expired. Please log in again.' }

      // dedup toast
      toast.dismiss('auth-expired')
      toast.error(payload.message, { id: 'auth-expired' })

      safeRedirectToLoginOnce()

      const err = new Error(payload.message)
      err.__payload = payload
      throw err
    }

    if (!res.ok) {
      const payload =
        data && (data.code || data.message)
          ? data
          : { code: 'INTERNAL_ERROR', message: res.statusText }

      notifyError(payload)

      const err = new Error(payload?.message || 'Request failed')
      err.__payload = payload
      throw err
    }

    return data
  }

  return {
    get: (path) => request(path, { method: 'GET' }),
    post: (path, body) => request(path, { method: 'POST', body }),
    patch: (path, body) => request(path, { method: 'PATCH', body }),
    del: (path) => request(path, { method: 'DELETE' }),
  }
}
