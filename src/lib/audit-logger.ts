import { AuditLog, AuditSeverity } from '@/types/database';
import { createClient } from '@/lib/supabase/client';

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
 * Registra un evento de auditoría forense e inmutable.
 * Intenta persistir en la tabla public.audit_logs de Supabase y sincroniza localmente.
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

  // 2. Persistir en Supabase mediante RPC o API REST
  try {
    const supabase = createClient();
    const { error } = await supabase.rpc('log_audit_event', {
      p_user_id: payload.userId || null,
      p_user_email: sanitizedEmail,
      p_user_role: sanitizedRole,
      p_action: payload.action,
      p_entity_type: payload.entityType,
      p_entity_id: payload.entityId || null,
      p_details: payload.details || {},
      p_ip_address: payload.ipAddress || null,
      p_severity: sanitizedSeverity,
    });

    if (error) {
      // Fallback a inserción directa si la RPC no estuviera compilada
      await supabase.from('audit_logs').insert([{
        user_id: payload.userId || null,
        user_email: sanitizedEmail,
        user_role: sanitizedRole,
        action: payload.action,
        entity_type: payload.entityType,
        entity_id: payload.entityId || null,
        details: payload.details || {},
        ip_address: payload.ipAddress || null,
        severity: sanitizedSeverity,
      }]);
    }
    return true;
  } catch (err) {
    console.warn('Aviso: Registro de auditoría guardado en caché local (Supabase pendiente):', err);
    return false;
  }
}

/**
 * Obtiene los eventos de auditoría (desde Supabase o caché local).
 */
export async function getAuditLogs(limit = 100): Promise<AuditLog[]> {
  try {
    const supabase = createClient();
    const { data, error } = await supabase
      .from('audit_logs')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(limit);

    if (!error && data && data.length > 0) {
      if (typeof window !== 'undefined') {
        localStorage.setItem(LOCAL_STORAGE_KEY_AUDIT, JSON.stringify(data));
      }
      return data as AuditLog[];
    }
  } catch {
    // Continuar con fallback
  }

  if (typeof window !== 'undefined') {
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

