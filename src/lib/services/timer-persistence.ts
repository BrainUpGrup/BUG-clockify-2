'use client';

import { createClient } from '@/lib/supabase/client';
import { TimeEntry, Company, EntryComputeType, Profile } from '@/types/database';
import { safeGetLocalStorage, safeSetLocalStorage } from '@/lib/utils';
import { MOCK_COMPANIES, MOCK_PROFILES } from '@/lib/mock-data';
import { saveLocalFirstEntry } from '@/lib/services/offline-time-sync';

export interface SaveStoppedTimerParams {
  userId?: string;
  companyId?: string;
  durationSeconds: number;
  startTimeIso?: string | null;
  endTimeIso?: string;
  description?: string;
  computeType?: EntryComputeType;
  company?: Company | null;
}

export interface SaveTimerResult {
  success: boolean;
  entry?: TimeEntry;
  durationMinutes: number;
  error?: string;
}

/**
 * Guarda un registro de tiempo proveniente de la detención de un cronómetro (Ventana Flotante,
 * Widget PiP, Barra de Navegación o Fichador).
 * Inserta en la tabla `time_entries` de Supabase, actualiza la caché local y dispara
 * la sincronización multi-ventana para que aparezca instantáneamente en la pantalla del empleado.
 */
export async function saveStoppedTimerEntry(params: SaveStoppedTimerParams): Promise<SaveTimerResult> {
  const durationSeconds = Math.max(1, params.durationSeconds);
  const durationMinutes = Math.max(1, Math.round(durationSeconds / 60));
  const workDate = new Date().toISOString().split('T')[0];
  const startTime = params.startTimeIso || new Date(Date.now() - durationSeconds * 1000).toISOString();
  const endTime = params.endTimeIso || new Date().toISOString();
  const rawDesc = (params.description || (typeof window !== 'undefined' ? localStorage.getItem('bug_clockify_active_timer_desc') : '') || '').trim();
  const description = rawDesc || 'Sin descripción';

  // 1. Resolver usuario autenticado
  let finalUserId = params.userId;
  let currentUserProfile: Profile | null = null;
  if (typeof window !== 'undefined') {
    const cachedUser = safeGetLocalStorage<Profile | null>('bug_clockify_current_user', null);
    if (cachedUser) {
      currentUserProfile = cachedUser;
      if (!finalUserId) finalUserId = cachedUser.id;
    }
  }

  const supabase = createClient();

  if (!finalUserId) {
    try {
      const { data: authData } = await supabase.auth.getUser();
      if (authData?.user?.id) {
        finalUserId = authData.user.id;
      }
    } catch {}
  }

  // Fallback si sigue sin usuario (demo / mock)
  if (!finalUserId) {
    finalUserId = MOCK_PROFILES[0]?.id || 'user_1';
  }

  // 2. Resolver empresa destino
  let finalCompanyId = params.companyId || params.company?.id;
  if (!finalCompanyId && typeof window !== 'undefined') {
    finalCompanyId = localStorage.getItem('bug_clockify_active_company_id') || 
                     localStorage.getItem('bug_clockify_last_company_id') || 
                     undefined;
  }

  // Cargar lista de empresas en caché para lookup
  const cachedCompanies = safeGetLocalStorage<Company[]>('bug_clockify_cache_companies', MOCK_COMPANIES);
  let targetCompany: Company | undefined = params.company || undefined;

  if (finalCompanyId) {
    targetCompany = targetCompany || cachedCompanies.find((c) => c.id === finalCompanyId);
  }

  if (!finalCompanyId) {
    // Si todavía no hay empresa seleccionada, tomar la primera empresa activa disponible
    const firstActive = cachedCompanies.find((c) => c.is_active) || cachedCompanies[0];
    if (firstActive) {
      finalCompanyId = firstActive.id;
      targetCompany = firstActive;
    } else {
      // Consultar empresas activas vía endpoint autenticado de servidor
      try {
        const res = await fetch('/api/data/companies', { cache: 'no-store' });
        const json = await res.json();
        if (res.ok && json?.success && Array.isArray(json.companies) && json.companies.length > 0) {
          finalCompanyId = json.companies[0].id;
          targetCompany = json.companies[0] as Company;
        }
      } catch {}
    }
  }

  // Si a pesar de todo no existe empresa, usar la primera mock
  if (!finalCompanyId) {
    finalCompanyId = MOCK_COMPANIES[0].id;
    targetCompany = MOCK_COMPANIES[0];
  }

  // 3. Resolver tipo de cómputo (cuota vs puntual)
  const computeType: EntryComputeType = params.computeType || 
    (targetCompany?.client_type === 'cuota' ? 'cuota' : 'puntual');

  // 4. Guardar PRIMERO en LocalStorage y encolar para sincronización en la nube (Offline-First)
  const userProfile: Profile = currentUserProfile || {
    id: finalUserId,
    full_name: 'Empleado',
    email: '',
    role: 'employee',
    status: 'active',
    password_configured: true,
    created_at: new Date().toISOString(),
  };

  const savedEntry = saveLocalFirstEntry(
    {
      company_id: finalCompanyId,
      work_date: workDate,
      start_time: startTime,
      end_time: endTime,
      duration_minutes: durationMinutes,
      description: description,
      compute_type: computeType,
    },
    userProfile,
    targetCompany
  );

  // 5. Guardar última empresa y notificar a ventana padre si es ventana flotante
  if (typeof window !== 'undefined') {
    try {
      localStorage.setItem('bug_clockify_last_company_id', finalCompanyId);
      if (window.opener && !window.opener.closed) {
        window.opener.postMessage(
          {
            type: 'BUG_ENTRY_CREATED',
            entry: savedEntry,
          },
          '*'
        );
      }
    } catch (postErr) {
      console.warn('[TimerPersistence] Could not postMessage to window.opener:', postErr);
    }
  }

  return {
    success: true,
    entry: savedEntry,
    durationMinutes,
  };
}

