// client/src/components/DisabledHint.jsx
'use client';

import React from 'react';

/**
 * Wrap 1 nút bị disabled để hiển thị lý do (hover/focus).
 * Dùng thuộc tính `title` để nhẹ nhàng, không cần lib tooltip.
 *
 * Props:
 * - disabled: boolean
 * - reason?: string
 * - children: React element (ví dụ: <button disabled>...</button>)
 */
export default function DisabledHint({ disabled, reason, children }) {
  if (!disabled) return children;

  // Giữ nguyên giao diện child, chỉ bọc thêm title để hiện tooltip
  return (
    <span title={reason || 'Unavailable'} style={{ display: 'inline-block' }}>
      {children}
    </span>
  );
}
