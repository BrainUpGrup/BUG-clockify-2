import { createServerSupabaseClient } from '@/lib/supabase/server';
import { UserRole } from '@/types/database';

/** Usuario del Hub autenticado por cookie de Supabase (Route Handlers). */
export async function getHubUser(): Promise<{ id: string; role: UserRole } | null> {
  const supabase = createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const { data: profile } = await supabase
    .from('profiles')
    .select('role, status')
    .eq('id', user.id)
    .maybeSingle();

  // Defensa en profundidad: solo usuarios con estado activo pueden operar
  if (!profile || profile.status !== 'active') return null;
  return { id: user.id, role: profile.role as UserRole };
}

export function isCoordinatorRole(role: UserRole): boolean {
  return role === 'coordinator' || role === 'admin';
}
