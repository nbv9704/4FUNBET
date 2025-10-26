// client/src/components/ServerCountdown.jsx
'use client';
import { useEffect, useMemo, useState } from 'react';

/**
 * Đếm ngược theo mốc thời gian từ server:
 *  - serverNow: timestamp (ms) lúc payload được gửi
 *  - target:    timestamp (ms) mốc cần đếm tới (từ server)
 * Component tự hiệu chỉnh lệch đồng hồ client/server.
 */
export default function ServerCountdown({ serverNow, target, className = '' }) {
  const [now, setNow] = useState(Date.now());

  // lệch giữa đồng hồ client và server tại thời điểm render
  const skew = useMemo(() => {
    if (!serverNow) return 0;
    return Date.now() - Number(serverNow);
  }, [serverNow]);

  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 250);
    return () => clearInterval(id);
  }, []);

  const remainMs = Math.max(0, Number(target || 0) - (now - skew));
  const remainS = Math.ceil(remainMs / 1000);

  return <span className={className}>{remainS}s</span>;
}
