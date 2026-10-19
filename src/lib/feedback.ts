// Sistema de feedback propio de la app (sustituye a window.alert / window.confirm).
// Las funciones pueden llamarse desde cualquier componente o handler; el
// FeedbackProvider montado en el layout raíz se encarga de pintarlas.

export type ToastType = 'success' | 'error' | 'info' | 'warning';

export interface ToastOptions {
  type?: ToastType;
  /** Botón de acción opcional dentro del toast (ej. "Deshacer"). */
  actionLabel?: string;
  onAction?: () => void;
  /** Duración en ms (por defecto 4000; 6000 si lleva acción). */
  duration?: number;
}

export interface ConfirmOptions {
  title: string;
  message?: string;
  confirmLabel?: string;
  cancelLabel?: string;
  danger?: boolean;
}

export interface ToastEventDetail extends ToastOptions {
  id: number;
  message: string;
}

export interface ConfirmEventDetail extends ConfirmOptions {
  resolve: (value: boolean) => void;
}

let toastSeq = 0;

export function notify(message: string, options: ToastOptions = {}) {
  if (typeof window === 'undefined') return;
  const detail: ToastEventDetail = { id: ++toastSeq, message, ...options };
  window.dispatchEvent(new CustomEvent<ToastEventDetail>('bug_toast', { detail }));
}

export function confirmDialog(options: ConfirmOptions): Promise<boolean> {
  if (typeof window === 'undefined') return Promise.resolve(false);
  return new Promise((resolve) => {
    window.dispatchEvent(new CustomEvent<ConfirmEventDetail>('bug_confirm', { detail: { ...options, resolve } }));
  });
}

/**
 * Elimina con posibilidad de deshacer: aplica `remove` al instante y, si el
 * usuario pulsa "Deshacer" antes de que caduque el aviso, ejecuta `restore`.
 */
export function removeWithUndo(message: string, remove: () => void, restore: () => void) {
  remove();
  notify(message, { type: 'info', actionLabel: 'Deshacer', onAction: restore, duration: 6000 });
}

// Aviso de acceso denegado que sobrevive a una redirección (M1).
const DENIED_KEY = 'bug_access_denied_notice';

export function flagAccessDenied(message: string) {
  try {
    sessionStorage.setItem(DENIED_KEY, message);
  } catch {
    // sin almacenamiento: el aviso simplemente no se mostrará
  }
}

export function consumeAccessDenied(): string | null {
  try {
    const msg = sessionStorage.getItem(DENIED_KEY);
    if (msg) sessionStorage.removeItem(DENIED_KEY);
    return msg;
  } catch {
    return null;
  }
}

/** Traduce errores técnicos (Supabase, red) a un mensaje comprensible. */
export function friendlyError(action: string): string {
  return `No se ha podido ${action}. Revisa tu conexión e inténtalo de nuevo.`;
}
