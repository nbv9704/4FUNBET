'use client'

export default function Loading({ text = 'Đang tải...' }) {
  return (
    <div className="p-8 text-center">
      {text}
    </div>
  );
}