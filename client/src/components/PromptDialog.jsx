// client/src/components/PromptDialog.jsx
'use client';
import { useEffect, useRef, useState, useCallback } from 'react';
import { createPortal } from 'react-dom';

export default function PromptDialog({
  open,
  title = 'Input',
  description,
  placeholder = '',
  initialValue = '',
  confirmText = 'OK',
  cancelText = 'Cancel',
  required = false,
  validate,                 // (value) => string | null
  onConfirm,
  onCancel,
  onOpenChange,             // NEW: (nextOpen:boolean)=>void
  loading = false,
}) {
  const [value, setValue] = useState(initialValue || '');
  const [error, setError] = useState('');
  const backdropRef = useRef(null);
  const inputRef = useRef(null);

  // Auto-reset + thông báo state ra ngoài
  useEffect(() => {
    if (open) {
      setValue(initialValue || '');
      setError('');
      setTimeout(() => inputRef.current?.focus(), 0);
    }
    onOpenChange?.(!!open);
  }, [open, initialValue, onOpenChange]);

  // Khoá scroll nền
  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = prev; };
  }, [open]);

  const computeError = useCallback((v) => {
    if (required && !v) return 'Vui lòng nhập _id trước.';
    if (validate) {
      const msg = validate(v);
      if (msg) return msg;
    }
    return '';
  }, [required, validate]);

  const trySubmit = useCallback(() => {
    const msg = computeError(value);
    if (msg) { setError(msg); return; }
    onConfirm?.(value);
  }, [computeError, onConfirm, value]);

  // Trap focus + Esc + Enter
  const onKeyDown = useCallback((e) => {
    if (!open) return;
    if (e.key === 'Escape') {
      onCancel?.();
      onOpenChange?.(false);
    }
    if (e.key === 'Enter') {
      e.preventDefault();
      if (!computeError(value) && !loading) trySubmit();
    }
    if (e.key === 'Tab') {
      const list = backdropRef.current?.querySelectorAll(
        'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
      );
      if (!list?.length) return;
      const first = list[0];
      const last = list[list.length - 1];
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault(); last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault(); first.focus();
      }
    }
  }, [open, computeError, trySubmit, value, loading, onCancel, onOpenChange]);

  if (!open) return null;

  return createPortal(
    <div
      ref={backdropRef}
      className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4"
      role="dialog"
      aria-modal="true"
      aria-label={title}
      onKeyDown={onKeyDown}
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) {
          onCancel?.();
          onOpenChange?.(false);
        }
      }}
    >
      <div
        className="bg-white dark:bg-gray-900 dark:text-white w-full max-w-md rounded-2xl p-4 shadow-lg outline-none"
        onMouseDown={(e) => e.stopPropagation()}
      >
        <div className="text-lg font-semibold mb-1">{title}</div>
        {description && <div className="text-sm opacity-80 mb-3">{description}</div>}

        <input
          ref={inputRef}
          autoFocus
          disabled={loading}
          className="w-full border rounded-xl px-3 py-2 mb-2 bg-transparent disabled:opacity-60"
          placeholder={placeholder}
          value={value}
          onChange={(e) => {
            const v = e.target.value;
            setValue(v);
            setError(computeError(v));
          }}
        />

        {error && <div className="text-xs text-red-500 mb-2">{error}</div>}

        <div className="flex justify-end gap-2">
          <button
            type="button"
            className="px-3 py-2 rounded-xl border"
            onClick={() => { onCancel?.(); onOpenChange?.(false); }}
            disabled={loading}
          >
            {cancelText}
          </button>
          <button
            type="button"
            className="px-3 py-2 rounded-xl border shadow disabled:opacity-50"
            onClick={trySubmit}
            disabled={loading || !!computeError(value)}
          >
            {loading ? '...' : confirmText}
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}
