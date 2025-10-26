// client/src/components/TurnTimer.jsx
'use client';
import { useEffect, useState } from 'react';

export default function TurnTimer({ deadline, onExpire, className = '' }) {
  const [seconds, setSeconds] = useState(0);

  useEffect(() => {
    const tick = () => {
      const t = typeof deadline === 'string' ? new Date(deadline).getTime() : +deadline;
      const now = Date.now();
      const s = Math.max(0, Math.ceil((t - now) / 1000));
      setSeconds(s);
      if (s <= 0 && onExpire) onExpire();
    };
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [deadline, onExpire]);

  return <span className={className}>{seconds}s</span>;
}
