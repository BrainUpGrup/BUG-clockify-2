'use client';

import React, { useEffect, useRef, useState } from 'react';
import { usePathname } from 'next/navigation';
import { AlertTriangle, CheckCircle2, Info, X, XCircle } from 'lucide-react';
import {
  ConfirmEventDetail,
  ToastEventDetail,
  consumeAccessDenied,
} from '@/lib/feedback';

const TOAST_STYLES = {
  success: { icon: CheckCircle2, ring: 'border-emerald-300', iconColor: 'text-emerald-600' },
  error: { icon: XCircle, ring: 'border-red-300', iconColor: 'text-red-600' },
  warning: { icon: AlertTriangle, ring: 'border-amber-300', iconColor: 'text-amber-600' },
  info: { icon: Info, ring: 'border-[#D8CFF0]', iconColor: 'text-[#8E0E75]' },
} as const;

export function FeedbackProvider() {
  const pathname = usePathname();
  const [toasts, setToasts] = useState<ToastEventDetail[]>([]);
  const [confirmState, setConfirmState] = useState<ConfirmEventDetail | null>(null);
  const confirmBtnRef = useRef<HTMLButtonElement>(null);

  const dismiss = (id: number) => setToasts((prev) => prev.filter((t) => t.id !== id));

  useEffect(() => {
    const onToast = (e: Event) => {
      const detail = (e as CustomEvent<ToastEventDetail>).detail;
      setToasts((prev) => [...prev.slice(-3), detail]);
      const duration = detail.duration ?? (detail.actionLabel ? 6000 : 4000);
      window.setTimeout(() => dismiss(detail.id), duration);
    };
    const onConfirm = (e: Event) => setConfirmState((e as CustomEvent<ConfirmEventDetail>).detail);

    window.addEventListener('bug_toast', onToast);
    window.addEventListener('bug_confirm', onConfirm);
    return () => {
      window.removeEventListener('bug_toast', onToast);
      window.removeEventListener('bug_confirm', onConfirm);
    };
  }, []);

  // Mostrar el aviso de acceso denegado tras una redirección
  useEffect(() => {
    const msg = consumeAccessDenied();
    if (msg) {
      const id = Date.now();
      setToasts((prev) => [...prev, { id, message: msg, type: 'warning' }]);
      window.setTimeout(() => dismiss(id), 6000);
    }
  }, [pathname]);

  // Teclado en el diálogo de confirmación: Escape cancela, foco en el botón principal
  useEffect(() => {
    if (!confirmState) return;
    confirmBtnRef.current?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') closeConfirm(false);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [confirmState]);

  const closeConfirm = (value: boolean) => {
    confirmState?.resolve(value);
    setConfirmState(null);
  };

  return (
    <>
      {/* Toasts */}
      <div
        aria-live="polite"
        className="fixed bottom-4 left-1/2 -translate-x-1/2 z-[200] flex flex-col items-center gap-2 w-[min(92vw,440px)] pointer-events-none"
      >
        {toasts.map((t) => {
          const style = TOAST_STYLES[t.type || 'info'];
          const Icon = style.icon;
          return (
            <div
              key={t.id}
              role={t.type === 'error' ? 'alert' : 'status'}
              className={`pointer-events-auto w-full flex items-start gap-3 bg-white border-2 ${style.ring} rounded-xl shadow-xl px-4 py-3 animate-in fade-in slide-in-from-bottom-2 duration-200`}
            >
              <Icon className={`h-5 w-5 shrink-0 mt-0.5 ${style.iconColor}`} />
              <p className="flex-1 text-sm text-[#292929] leading-snug">{t.message}</p>
              {t.actionLabel && (
                <button
                  type="button"
                  onClick={() => {
                    t.onAction?.();
                    dismiss(t.id);
                  }}
                  className="shrink-0 text-sm font-bold text-[#8E0E75] hover:underline cursor-pointer"
                >
                  {t.actionLabel}
                </button>
              )}
              <button
                type="button"
                onClick={() => dismiss(t.id)}
                aria-label="Cerrar aviso"
                className="shrink-0 text-slate-400 hover:text-[#292929] cursor-pointer"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          );
        })}
      </div>

      {/* Diálogo de confirmación */}
      {confirmState && (
        <div
          className="fixed inset-0 z-[210] flex items-center justify-center bg-[#191654]/40 backdrop-blur-sm p-4"
          onMouseDown={(e) => {
            if (e.target === e.currentTarget) closeConfirm(false);
          }}
        >
          <div
            role="alertdialog"
            aria-modal="true"
            aria-labelledby="bug-confirm-title"
            className="w-full max-w-md bg-white rounded-2xl border-2 border-[#D8CFF0] shadow-2xl p-6 animate-in fade-in zoom-in-95 duration-150"
          >
            <div className="flex items-start gap-3">
              <div className={`h-10 w-10 rounded-full flex items-center justify-center shrink-0 ${confirmState.danger ? 'bg-red-50 text-red-600' : 'bg-[#F8F6FC] text-[#8E0E75]'}`}>
                <AlertTriangle className="h-5 w-5" />
              </div>
              <div className="min-w-0">
                <h2 id="bug-confirm-title" className="text-base font-bold text-[#292929]">
                  {confirmState.title}
                </h2>
                {confirmState.message && (
                  <p className="text-sm text-[#4A4A4A] mt-1 leading-relaxed">{confirmState.message}</p>
                )}
              </div>
            </div>
            <div className="flex justify-end gap-2 mt-6">
              <button
                type="button"
                onClick={() => closeConfirm(false)}
                className="px-4 py-2 rounded-lg border-2 border-[#D8CFF0] text-sm font-semibold text-[#4A4A4A] hover:bg-[#F8F6FC] cursor-pointer"
              >
                {confirmState.cancelLabel || 'Cancelar'}
              </button>
              <button
                ref={confirmBtnRef}
                type="button"
                onClick={() => closeConfirm(true)}
                className={`px-4 py-2 rounded-lg text-sm font-bold text-white cursor-pointer ${confirmState.danger ? 'bg-red-600 hover:bg-red-700' : 'bg-[#8E0E75] hover:bg-[#700B5C]'}`}
              >
                {confirmState.confirmLabel || 'Aceptar'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
