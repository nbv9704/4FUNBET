'use client'

export default function useApi() {
  const baseUrl = '/api'
  const getToken = () =>
    typeof window !== 'undefined' ? localStorage.getItem('token') : null

  const defaultHeaders = () => {
    const token = getToken()
    return {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    }
  }

  async function request(path, { method = 'GET', body } = {}) {
    const res = await fetch(baseUrl + path, {
      method,
      headers: defaultHeaders(),
      body: body ? JSON.stringify(body) : undefined,
    })
    const data = await res.json()
    if (!res.ok) throw new Error(data.error || res.statusText)
    return data
  }

  return {
    get: (path) => request(path, { method: 'GET' }),
    post: (path, body) => request(path, { method: 'POST', body }),
    patch: (path, body) => request(path, { method: 'PATCH', body }),
    del: (path) => request(path, { method: 'DELETE' }),
  }
}