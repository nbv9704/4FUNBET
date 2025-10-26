// client/src/components/VerifyFairnessModal.jsx
'use client';
import { useEffect, useRef, useState, useCallback } from 'react';
import useApi from '@/hooks/useApi';

export default function VerifyFairnessModal({ roomId, open, onClose, onOpenChange }) {
  const { get } = useApi();

  // Giữ ref ổn định cho get() để tránh loop useEffect
  const getRef = useRef(get);
  useEffect(() => { getRef.current = get; }, [get]);

  const [loading, setLoading] = useState(false);
  const [data, setData] = useState(null);
  const [error, setError] = useState('');
  const backdropRef = useRef(null);

  useEffect(() => { onOpenChange?.(!!open); }, [open, onOpenChange]);

  // Khoá scroll nền
  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = prev; };
  }, [open]);

  // Load dữ liệu khi mở
  useEffect(() => {
    if (!open) return;
    let cancelled = false;

    (async () => {
      try {
        setLoading(true);
        setError('');
        const res = await getRef.current(`/pvp/${roomId}/verify`);
        if (!cancelled) setData(res || null);
      } catch (e) {
        if (!cancelled) {
          setError(e?.message || 'Fetch verify data failed');
          setData(null);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => { cancelled = true; };
  }, [open, roomId]);

  // Trap focus + Esc
  const onKeyDown = useCallback((e) => {
    if (!open) return;
    if (e.key === 'Escape') {
      onClose?.();
      onOpenChange?.(false);
    }
    if (e.key === 'Tab') {
      const list = backdropRef.current?.querySelectorAll(
        'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
      );
      if (!list || !list.length) return;
      const first = list[0];
      const last = list[list.length - 1];
      if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
      else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
    }
  }, [open, onClose, onOpenChange]);

  async function copyJsonInline(payload) {
    try {
      const text = typeof payload === 'string' ? payload : JSON.stringify(payload ?? {}, null, 2);
      await navigator.clipboard.writeText(text);
      const el = document.getElementById('copy-json-inline-btn');
      if (el) {
        const old = el.innerText;
        el.innerText = 'Copied!';
        setTimeout(() => { el.innerText = old; }, 1200);
      }
    } catch {}
  }

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50" role="dialog" aria-modal="true" aria-label="Verify Fairness">
      <div
        ref={backdropRef}
        className="absolute inset-0 bg-black/50"
        onMouseDown={(e) => { if (e.target === e.currentTarget) { onClose?.(); onOpenChange?.(false); } }}
        onKeyDown={onKeyDown}
        tabIndex={-1}
      >
        <div
          className="absolute inset-0 flex items-center justify-center p-3"
          onMouseDown={(e) => e.stopPropagation()}
        >
          <div className="bg-white dark:bg-gray-900 dark:text-white rounded-2xl w-full max-w-2xl p-4 shadow-lg outline-none">
            {/* Header */}
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold">Verify Fairness</h2>
              <button className="px-2 py-1 rounded border" onClick={() => { onClose?.(); onOpenChange?.(false); }}>
                Close
              </button>
            </div>

            {loading && <div className="mt-4 text-sm">Loading…</div>}
            {error && <div className="mt-4 text-sm text-red-600">{error}</div>}

            {!loading && !error && data && (
              <div className="mt-4 space-y-3 text-sm">
                <div>Game: <b>{data.game}</b></div>

                <div className="break-all">
                  Server Seed Hash (commit): <code className="bg-gray-100 dark:bg-white/10 px-1 rounded">{data.serverSeedHash}</code>
                </div>
                {data.serverSeedReveal && (
                  <div className="break-all">
                    Server Seed (reveal): <code className="bg-gray-100 dark:bg-white/10 px-1 rounded">{data.serverSeedReveal}</code>
                  </div>
                )}
                <div className="break-all">
                  Client Seed: <code className="bg-gray-100 dark:bg-white/10 px-1 rounded">{data.clientSeed}</code>
                </div>
                {typeof data.nonceStart === 'number' && (
                  <div>Nonce start: <code className="bg-gray-100 dark:bg-white/10 px-1 rounded">{data.nonceStart}</code></div>
                )}

                {/* Raw JSON + single Copy button */}
                <div className="mt-3 border rounded p-2">
                  <div className="flex items-center justify-between mb-2">
                    <div className="font-semibold">Verification payload (raw)</div>
                    <button
                      id="copy-json-inline-btn"
                      onClick={() => copyJsonInline(data)}
                      className="px-2 py-1 text-xs rounded border shadow"
                      title="Copy JSON to clipboard"
                    >
                      Copy JSON
                    </button>
                  </div>
                  <pre className="text-xs bg-black/5 dark:bg-white/10 rounded p-3 overflow-auto">
{JSON.stringify(data, null, 2)}
                  </pre>
                </div>
              </div>
            )}

          </div>
        </div>
      </div>
    </div>
  );
}
