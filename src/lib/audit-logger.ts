import { AuditLog, AuditSeverity } from '@/types/database';

export interface AuditEventPayload {
  userId?: string | null;
  userEmail?: string;
  userRole?: string;
  action: string;
  entityType: string;
  entityId?: string | null;
  details?: Record<string, any>;
  ipAddress?: string | null;
  severity?: AuditSeverity;
}

const LOCAL_STORAGE_KEY_AUDIT = 'bug_clockify_audit_logs';

/**
 * Registra un evento de auditoría forense e inmutable a través de la API autenticada
 * `POST /api/audit/logs` (sin llamadas directas a Supabase desde el navegador).
 */
export async function recordAuditEvent(payload: AuditEventPayload): Promise<boolean> {
  const sanitizedEmail = payload.userEmail || 'sistema@brainupgrup.com';
  const sanitizedRole = payload.userRole || 'system';
  const sanitizedSeverity: AuditSeverity = payload.severity || 'info';

  const newLogEntry: AuditLog = {
    id: typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : `log_${Date.now()}`,
    user_id: payload.userId || null,
    user_email: sanitizedEmail,
    user_role: sanitizedRole,
    action: payload.action,
    entity_type: payload.entityType,
    entity_id: payload.entityId || null,
    details: payload.details || {},
    ip_address: payload.ipAddress || null,
    severity: sanitizedSeverity,
    created_at: new Date().toISOString(),
  };

  // 1. Guardar en almacenamiento local para resiliencia y modo desconectado
  if (typeof window !== 'undefined') {
    try {
      const existing = localStorage.getItem(LOCAL_STORAGE_KEY_AUDIT);
      const list: AuditLog[] = existing ? JSON.parse(existing) : [];
      list.unshift(newLogEntry);
      localStorage.setItem(LOCAL_STORAGE_KEY_AUDIT, JSON.stringify(list.slice(0, 500)));
    } catch {
      // Ignorar fallos de cuota de localStorage
    }
  }

  // 2. Persistir en el servidor vía API Route autenticada (evita suplantación de identidad/rol)
  if (typeof window !== 'undefined') {
    try {
      const res = await fetch('/api/audit/logs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: payload.action,
          entityType: payload.entityType,
          entityId: payload.entityId || null,
          details: payload.details || {},
          severity: sanitizedSeverity,
        }),
      });
      return res.ok;
    } catch (err) {
      console.warn('Aviso: Registro de auditoría guardado en caché local (servidor no disponible):', err);
      return false;
    }
  }

  return true;
}

/**
 * Obtiene los eventos de auditoría desde la API autenticada `GET /api/audit/logs`
 * (exclusivo Coordinación / Admin) con fallback local en caso de desconexión.
 */
export async function getAuditLogs(limit = 100): Promise<AuditLog[]> {
  if (typeof window !== 'undefined') {
    try {
      const res = await fetch(`/api/audit/logs?limit=${encodeURIComponent(String(limit))}`, {
        cache: 'no-store',
      });
      if (res.ok) {
        const json = await res.json();
        if (json?.success && Array.isArray(json.logs) && json.logs.length > 0) {
          try {
            localStorage.setItem(LOCAL_STORAGE_KEY_AUDIT, JSON.stringify(json.logs));
          } catch {}
          return json.logs as AuditLog[];
        }
      }
    } catch {
      // Continuar con fallback
    }

    try {
      const stored = localStorage.getItem(LOCAL_STORAGE_KEY_AUDIT);
      if (stored) {
        return JSON.parse(stored) as AuditLog[];
      }
    } catch {
      return [];
    }
  }

  return [];
}
