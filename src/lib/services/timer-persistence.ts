'use client';

import { createClient } from '@/lib/supabase/client';
import { TimeEntry, Company, EntryComputeType, Profile } from '@/types/database';
import { safeGetLocalStorage, safeSetLocalStorage } from '@/lib/utils';
import { MOCK_COMPANIES, MOCK_PROFILES } from '@/lib/mock-data';

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
      // Intentar consultar una empresa activa a Supabase
      try {
        const { data: dbComps } = await supabase.from('companies').select('*').eq('is_active', true).limit(1);
        if (dbComps && dbComps.length > 0) {
          finalCompanyId = dbComps[0].id;
          targetCompany = dbComps[0] as Company;
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

  let savedEntry: TimeEntry | null = null;
  let saveError: string | null = null;

  // 4. Intentar guardar en Supabase si está disponible
  const isSupabaseConfigured = !!process.env.NEXT_PUBLIC_SUPABASE_URL && !!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (isSupabaseConfigured) {
    try {
      const { data, error } = await supabase
        .from('time_entries')
        .insert({
          user_id: finalUserId,
          company_id: finalCompanyId,
          work_date: workDate,
          start_time: startTime,
          end_time: endTime,
          duration_minutes: durationMinutes,
          description: description,
          compute_type: computeType,
        })
        .select('*, company:companies(*), profile:profiles(*)')
        .single();

      if (error) {
        console.error('[TimerPersistence] Error inserting into Supabase time_entries:', error);
        saveError = error.message;
      } else if (data) {
        savedEntry = data as unknown as TimeEntry;
      }
    } catch (err: any) {
      console.error('[TimerPersistence] Network / unexpected error saving to Supabase:', err);
      saveError = err?.message || 'Error de conexión';
    }
  }

  // 5. Fallback local / offline si falló Supabase o no está configurado
  if (!savedEntry) {
    savedEntry = {
      id: 'entry_' + Date.now() + '_' + Math.random().toString(36).substring(2, 7),
      user_id: finalUserId,
      company_id: finalCompanyId,
      work_date: workDate,
      start_time: startTime,
      end_time: endTime,
      duration_minutes: durationMinutes,
      description: description,
      compute_type: computeType,
      created_at: new Date().toISOString(),
      company: targetCompany,
      profile: currentUserProfile || undefined,
    };
  }

  // 6. Persistencia y sincronización en cachés de localStorage y multi-ventana
  if (typeof window !== 'undefined') {
    try {
      // Caché privada del empleado
      const userCacheKey = `bug_clockify_cache_entries_${finalUserId}`;
      const existingUserEntries = safeGetLocalStorage<TimeEntry[]>(userCacheKey, []);
      const updatedUserEntries = [savedEntry, ...existingUserEntries.filter((e) => e.id !== savedEntry!.id)].slice(0, 200);
      safeSetLocalStorage(userCacheKey, updatedUserEntries);

      // Caché general (coordinador/admin)
      const coordCacheKey = 'bug_clockify_cache_entries';
      const existingCoordEntries = safeGetLocalStorage<TimeEntry[]>(coordCacheKey, []);
      const updatedCoordEntries = [savedEntry, ...existingCoordEntries.filter((e) => e.id !== savedEntry!.id)].slice(0, 300);
      safeSetLocalStorage(coordCacheKey, updatedCoordEntries);

      // Guardar última empresa usada
      localStorage.setItem('bug_clockify_last_company_id', finalCompanyId);

      // Disparador de sincronización en localStorage (recibido por otras ventanas/pestañas vía 'storage')
      localStorage.setItem('bug_clockify_entry_trigger', JSON.stringify({
        timestamp: Date.now(),
        entryId: savedEntry.id,
        userId: finalUserId,
        durationMinutes,
      }));

      // Evento Custom en la ventana actual
      window.dispatchEvent(new CustomEvent('bug_clockify_entry_created', { detail: savedEntry }));

      // Comunicación directa con ventana principal si esta es una ventana emergente / flotante
      if (window.opener && !window.opener.closed) {
        try {
          window.opener.postMessage({
            type: 'BUG_ENTRY_CREATED',
            entry: savedEntry,
          }, '*');
        } catch (postErr) {
          console.warn('[TimerPersistence] Could not postMessage to window.opener:', postErr);
        }
      }
    } catch (cacheErr) {
      console.warn('[TimerPersistence] Error updating localStorage caches:', cacheErr);
    }
  }

  return {
    success: true,
    entry: savedEntry,
    durationMinutes,
    error: saveError || undefined,
  };
}

