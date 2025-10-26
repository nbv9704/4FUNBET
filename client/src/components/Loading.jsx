// client/src/components/Loading.jsx
'use client'

export default function Loading({ text = 'Đang tải…' }) {
  return (
    <div className="p-8 text-center">
      <span>{text}</span>  // Bỏ suppressHydrationWarning
    </div>
  )
}