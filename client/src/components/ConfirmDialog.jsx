// client/src/components/ConfirmDialog.jsx
'use client';
import { useEffect, useRef, useCallback, useId } from 'react';
import { createPortal } from 'react-dom';

export default function ConfirmDialog({
  open,
  title = 'Confirm',
  description,
  confirmText = 'Confirm',
  cancelText = 'Cancel',
  onConfirm,
  onCancel,
  onOpenChange,        // (nextOpen:boolean) => void
  loading = false,
  variant,             // 'danger' | undefined
}) {
  const backdropRef = useRef(null);
  const panelRef = useRef(null);
  const lastActiveRef = useRef(null);

  // IDs cho a11y
  const titleId = useId();
  const descId  = useId();

  // Ghi nhớ phần tử hiện tại để trả focus khi đóng
  useEffect(() => {
    if (open) {
      lastActiveRef.current = document.activeElement instanceof HTMLElement
        ? document.activeElement
        : null;
    } else {
      // trả focus về opener khi đóng
      lastActiveRef.current?.focus?.();
      lastActiveRef.current = null;
    }
  }, [open]);

  // Khoá scroll nền khi mở
  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = prev; };
  }, [open]);

  // Focus phần tử đầu tiên khi mở
  useEffect(() => {
    if (!open) return;
    const t = setTimeout(() => {
      // ưu tiên nút confirm, sau đó tới nút cancel
      const focusables = backdropRef.current?.querySelectorAll(
        'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
      );
      if (focusables && focusables.length > 0) {
        (focusables[0] instanceof HTMLElement) && focusables[0].focus();
      } else {
        panelRef.current?.focus?.();
      }
    }, 0);
    return () => clearTimeout(t);
  }, [open]);

  // Trap focus + Esc
  const onKeyDown = useCallback((e) => {
    if (!open) return;

    if (e.key === 'Escape') {
      if (loading) return; // khi loading không cho đóng
      onCancel?.();
      onOpenChange?.(false);
      return;
    }

    if (e.key === 'Tab') {
      const list = backdropRef.current?.querySelectorAll(
        'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
      );
      const nodes = list ? Array.from(list) : [];
      if (!nodes.length) return;

      const first = nodes[0];
      const last = nodes[nodes.length - 1];

      // Nếu đang ở ngoài panel (hiếm), đẩy vào panel
      if (!backdropRef.current?.contains(document.activeElement)) {
        e.preventDefault();
        (first instanceof HTMLElement) && first.focus();
        return;
      }

      if (e.shiftKey) {
        if (document.activeElement === first) {
          e.preventDefault();
          (last instanceof HTMLElement) && last.focus();
        }
      } else {
        if (document.activeElement === last) {
          e.preventDefault();
          (first instanceof HTMLElement) && first.focus();
        }
      }
    }
  }, [open, loading, onCancel, onOpenChange]);

  if (!open) return null;

  return createPortal(
    <div
      ref={backdropRef}
      className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby={title ? titleId : undefined}
      aria-describedby={description ? descId : undefined}
      aria-busy={loading ? 'true' : 'false'}
      onKeyDown={onKeyDown}
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) {
          if (loading) return; // chặn đóng khi loading
          onCancel?.();
          onOpenChange?.(false);
        }
      }}
    >
      <div
        ref={panelRef}
        className="bg-white dark:bg-gray-900 dark:text-white w-full max-w-sm rounded-2xl p-4 shadow-lg outline-none"
        tabIndex={-1}
        onMouseDown={(e) => e.stopPropagation()}
      >
        <div className="text-lg font-semibold mb-2" id={titleId}>{title}</div>
        {description && (
          <div className="text-sm opacity-80 mb-4" id={descId}>
            {description}
          </div>
        )}

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
            className={`px-3 py-2 rounded-xl border shadow disabled:opacity-50 ${
              variant === 'danger' ? 'border-red-500 text-red-600' : ''
            }`}
            onClick={onConfirm}
            disabled={loading}
          >
            {loading ? '...' : confirmText}
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}
