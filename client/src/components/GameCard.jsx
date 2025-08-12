'use client'

import { useTheme } from 'next-themes'
import { useEffect, useState } from 'react'

export default function GameCard({ mode }) {
  const { theme } = useTheme()
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  if (!mounted) {
    // Chờ đến khi client mount mới render để tránh mismatch
    return <div className="w-56 h-65 rounded-2xl border-2 bg-white" />
  }

  return (
    <div
      className={`w-56 h-65 rounded-2xl shadow-md hover:shadow-xl transition-all duration-300 cursor-pointer overflow-hidden border-2 
        ${theme === 'dark' ? 'bg-gray-900 border-gray-700' : 'bg-white border-gray-900'}`}
    >
      <div
        className="h-40 bg-center bg-cover rounded-t-2xl"
        style={{ backgroundImage: `url(/cards/${mode}.png)` }}
      />
      <div className={`border-t-2 ${theme === 'dark' ? 'border-gray-700' : 'border-gray-300'}`}>
        <div
          className={`h-10 flex items-center justify-center text-l font-semibold capitalize transition-colors duration-300 
            ${theme === 'dark' ? 'text-white' : 'text-black'}`}
        >
          {mode}
        </div>
      </div>
    </div>
  )
}
