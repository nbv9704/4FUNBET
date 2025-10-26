// client/src/components/RequireAuth.jsx
'use client'

import { useEffect, useState } from 'react'
import { usePathname, useRouter } from 'next/navigation'
import Loading from '@/components/Loading'
import { useUser } from '@/context/UserContext'

/**
 * Bảo vệ trang yêu cầu đăng nhập.
 *
 * Luồng mới (chống hydration mismatch & loop):
 * - Không đọc localStorage trong render.
 * - Sau khi mount: đọc token → nếu không có, redirect /login?next=...
 * - Nếu có token: gọi fetchUser; xong thì:
 *    + có user -> render
 *    + không có -> redirect /login
 */
export default function RequireAuth(Component) {
  return function GuardedPage(props) {
    const router = useRouter()
    const pathname = usePathname()
    const { user, fetchUser } = useUser()

    // Trạng thái kiểm tra đã xong chưa
    const [checked, setChecked] = useState(false)
    // Kết quả kiểm tra token (null: chưa biết; true/false: đã biết)
    const [hasToken, setHasToken] = useState(null)

    useEffect(() => {
      // Chỉ chạy ở client
      let cancelled = false

      const run = async () => {
        // 1) Đọc token sau mount
        let token = null
        try {
          token = localStorage.getItem('token')
        } catch {
          token = null
        }
        if (cancelled) return

        const tokenExists = !!token
        setHasToken(tokenExists)

        // 2) Nếu KHÔNG có token → redirect login (+ next)
        if (!tokenExists) {
          const next = encodeURIComponent(pathname || '/')
          router.replace(`/login?next=${next}`)
          setChecked(true)
          return
        }

        // 3) Có token → đảm bảo fetch user một lần
        try {
          if (!user) {
            await fetchUser()
          }
        } finally {
          if (!cancelled) setChecked(true)
        }
      }

      run()
      return () => { cancelled = true }
    }, [pathname, router, fetchUser, user])

    // Chưa kiểm tra xong: dùng 1 text duy nhất để tránh mismatch
    if (!checked || hasToken === null) {
      return <Loading text="Đang xác thực phiên đăng nhập…" />
    }

    // Đã kiểm tra: không có token hoặc không lấy được user → redirect (effect đã xử lý)
    if (!hasToken || !user) {
      return <Loading text="Đang xác thực phiên đăng nhập…" />
    }

    // OK
    return <Component {...props} />
  }
}