'use client';

import React, { createContext, useContext, useEffect, useState } from 'react';
import { Profile, UserRole } from '@/types/database';
import { createClient } from '@/lib/supabase/client';
import { MOCK_PROFILES } from '@/lib/mock-data';

interface AuthContextType {
  user: Profile | null;
  role: UserRole | null;
  isLoading: boolean;
  isSupabaseConnected: boolean;
  login: (email: string, pass: string) => Promise<{ error?: string; user?: Profile }>;
  signUp: (fullName: string, email: string, pass: string, department?: string) => Promise<{ error?: string }>;
  logout: () => Promise<void>;
  switchDemoUser: (targetProfile: Profile) => void;
  updateUserAvatar: (avatarUrl: string | null) => Promise<{ error?: string }>;
}


function persistUser(profile: Profile | null) {
  if (typeof window === 'undefined') return;
  try {
    if (profile) {
      localStorage.setItem('bug_clockify_current_user', JSON.stringify(profile));
      const cookieData = JSON.stringify({ id: profile.id, role: profile.role, email: profile.email });
      document.cookie = 'bug_clockify_user=' + encodeURIComponent(cookieData) + '; path=/; max-age=604800; SameSite=Lax';
    } else {
      localStorage.removeItem('bug_clockify_current_user');
      document.cookie = 'bug_clockify_user=; path=/; max-age=0; SameSite=Lax';
    }
  } catch (e) {
    console.error('persistUser error:', e);
  }
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<Profile | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isSupabaseConnected, setIsSupabaseConnected] = useState<boolean>(false);

  // Inicialización ultra-rápida (0ms de bloqueo): restaura de inmediato desde caché y valida en segundo plano
  useEffect(() => {
    let isMounted = true;

    // 1. PASO INSTANTÁNEO (0ms): Si hay sesión previa guardada, carga de inmediato sin spinner
    try {
      const stored = localStorage.getItem('bug_clockify_current_user');
      if (stored) {
        const parsed = JSON.parse(stored) as Profile;
        if (parsed && parsed.status !== 'pending') {
          setUser(parsed);
          persistUser(parsed);
        }
      }
    } catch (e) {
      console.error(e);
    } finally {
      if (isMounted) {
        setIsLoading(false);
      }
    }

    // 2. PASO EN SEGUNDO PLANO: Sincronización asíncrona no bloqueante
    async function syncRemoteAuth() {
      const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
      const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
      const hasConfig = url && key && !url.includes('your-project') && !url.includes('tu-proyecto');

      if (hasConfig) {
        if (isMounted) setIsSupabaseConnected(true);
        try {
          const supabase = createClient();
          const { data: { session } } = await supabase.auth.getSession();

          if (session?.user && isMounted) {
            const { data: profile } = await supabase
              .from('profiles')
              .select('*')
              .eq('id', session.user.id)
              .single();

            if (profile && isMounted) {
              if (profile.status === 'pending') {
                await supabase.auth.signOut();
                setUser(null);
                try {
                  localStorage.removeItem('bug_clockify_current_user');
                } catch (e) {
                  console.error(e);
                }
              } else {
                const safeProfile = {
                  ...profile,
                  avatar_url: profile.avatar_url || undefined,
                } as Profile;
                setUser(safeProfile);
                try {
                  localStorage.setItem('bug_clockify_current_user', JSON.stringify(safeProfile));
                } catch (e) {
                  console.error(e);
                }
              }
            }
          }
        } catch (e) {
          console.warn('Sync background auth notice:', e);
        }
      }

      if (isMounted) {
        setIsLoading(false);
      }
    }

    syncRemoteAuth();

    return () => {
      isMounted = false;
    };
  }, []);

  // Función de inicio de sesión con validación de estado (activo vs pendiente)
  const login = async (email: string, pass: string): Promise<{ error?: string; user?: Profile }> => {
    const cleanEmail = email.trim().toLowerCase();
    const isDevOrDemo =
      process.env.NODE_ENV === 'development' ||
      process.env.NEXT_PUBLIC_SHOW_DEMO_LOGIN === 'true';

    // 1. INTENTO PRINCIPAL EN SUPABASE AUTH (Cuentas registradas reales y sesiones criptográficas JWT)
    if (isSupabaseConnected) {
      try {
        const supabase = createClient();
        const { data, error } = await supabase.auth.signInWithPassword({
          email: cleanEmail,
          password: pass,
        });

        if (!error && data?.user) {
          const { data: profile, error: profError } = await supabase
            .from('profiles')
            .select('*')
            .eq('id', data.user.id)
            .single();

          if (!profError && profile) {
            // Verificación estricta de estado de cuenta
            if (profile.status === 'pending') {
              await supabase.auth.signOut();
              return {
                error: 'Tu cuenta está registrada pero aún está PENDIENTE de validación y aceptación por la coordinadora de Brain Up Grup.',
              };
            }

            if (profile.status === 'rejected') {
              await supabase.auth.signOut();
              return { error: 'Tu solicitud de acceso fue rechazada. Contacta con la coordinadora.' };
            }

            const loggedProfile = profile as Profile;
            setUser(loggedProfile);
            persistUser(loggedProfile);
            return { user: loggedProfile };
          }
        }
      } catch (err: unknown) {
        console.warn('Aviso: Intento Supabase Auth fallido:', err);
      }
    }

    // 2. FALLBACK EXCLUSIVO PARA DESARROLLO / DEMO (Solo si está habilitado explícitamente en entorno dev)
    if (isDevOrDemo) {
      const devPass = pass.trim();
      const isAllowedDevPass = devPass === 'BrainUp2026!' || devPass === 'BrainUp2026' || devPass === 'brainup2026';

      if (isAllowedDevPass) {
        // Cuenta Super Admin
        if (cleanEmail === 'appadmin@brainupgrup.com') {
          const adminProfile: Profile = {
            id: '00000000-0000-0000-0000-000000000001',
            full_name: 'Super Administrador',
            email: 'appadmin@brainupgrup.com',
            role: 'admin',
            status: 'active',
            department: 'Sistemas & Seguridad',
            created_at: '2026-01-01T00:00:00Z',
          };
          persistUser(adminProfile);
          setUser(adminProfile);
          return { user: adminProfile };
        }

        // Cuenta Coordinadora
        if (cleanEmail === 'coordinacion@brainupgrup.com' || cleanEmail === 'coordinadora@brainupgrup.com') {
          const coordProfile: Profile = {
            id: '00000000-0000-0000-0000-000000000002',
            full_name: 'Coordinación Brain Up',
            email: cleanEmail,
            role: 'coordinator',
            status: 'active',
            department: 'Dirección de Operaciones',
            created_at: '2026-01-01T00:00:00Z',
          };
          persistUser(coordProfile);
          setUser(coordProfile);
          return { user: coordProfile };
        }

        // Cuenta Empleado
        if (cleanEmail === 'empleado@brainupgrup.com' || cleanEmail === 'trabajador@brainupgrup.com') {
          const empProfile: Profile = {
            id: '00000000-0000-0000-0000-000000000003',
            full_name: 'Empleado de Prueba',
            email: cleanEmail,
            role: 'employee',
            status: 'active',
            department: 'Creatividad & Operaciones',
            created_at: '2026-01-01T00:00:00Z',
          };
          persistUser(empProfile);
          setUser(empProfile);
          return { user: empProfile };
        }
      }

      // Perfiles mock locales registrados
      let allProfiles: Profile[] = [...MOCK_PROFILES];
      try {
        const storedPending = localStorage.getItem('bug_clockify_pending_users');
        if (storedPending) {
          const parsed = JSON.parse(storedPending) as Profile[];
          if (Array.isArray(parsed)) {
            allProfiles = [...allProfiles, ...parsed];
          }
        }
      } catch (e) {
        console.error(e);
      }

      const found = allProfiles.find((p) => p && p.email && p.email.toLowerCase() === cleanEmail);
      if (found) {
        if (found.status === 'pending') {
          return {
            error: 'Tu cuenta está registrada pero aún está PENDIENTE de validación por la coordinadora de Brain Up Grup.',
          };
        }
        if (found.status === 'rejected') {
          return { error: 'Tu solicitud de acceso fue rechazada.' };
        }
        setUser(found);
        persistUser(found);
        return { user: found };
      }
    }

    return {
      error: 'Credenciales inválidas. Verifica tu correo y contraseña.',
    };
  };

  // Registro de nuevo empleado (siempre en estado 'pending')
  const signUp = async (
    fullName: string,
    email: string,
    pass: string,
    department: string = 'Creatividad & Operaciones'
  ): Promise<{ error?: string }> => {
    const cleanEmail = email.trim().toLowerCase();

    if (isSupabaseConnected) {
      try {
        const supabase = createClient();
        const { data, error } = await supabase.auth.signUp({
          email: cleanEmail,
          password: pass,
          options: {
            data: {
              full_name: fullName.trim(),
              role: 'employee',
              status: 'pending',
              department,
            },
          },
        });

        if (error) {
          return { error: error.message };
        }

        // Insertar o asegurar registro en profiles (upsert para evitar duplicados si el trigger SQL ya actuó)
        if (data.user) {
          try {
            await supabase.from('profiles').upsert({
              id: data.user.id,
              full_name: fullName.trim(),
              email: cleanEmail,
              role: 'employee',
              status: 'pending',
              department,
            });
          } catch (upsertErr) {
            console.warn('Profile upsert notice:', upsertErr);
          }
        }

        // Cerrar cualquier sesión automática para forzar la aprobación previa de la coordinadora
        await supabase.auth.signOut();
      } catch (err: unknown) {
        console.error(err);
      }
    }

    // Guardar en pending local
    try {
      const pendingUsers = JSON.parse(localStorage.getItem('bug_clockify_pending_users') || '[]');
      pendingUsers.push({
        id: `u_${Date.now()}`,
        full_name: fullName.trim(),
        email: cleanEmail,
        role: 'employee',
        status: 'pending',
        department,
        created_at: new Date().toISOString(),
      });
      localStorage.setItem('bug_clockify_pending_users', JSON.stringify(pendingUsers));
    } catch (e) {
      console.error(e);
    }

    return {};
  };

  // Cierre de sesión seguro
  const logout = async () => {
    if (isSupabaseConnected) {
      try {
        const supabase = createClient();
        await supabase.auth.signOut();
      } catch (e) {
        console.error(e);
      }
    }
    persistUser(null);
    setUser(null);
  };

  // Cambio rápido de usuario para testing/demo
  const switchDemoUser = (targetProfile: Profile) => {
    persistUser(targetProfile);
    setUser(targetProfile);
  };

  // Actualizar fotografía del usuario con sincronización en Supabase y caché local
  const updateUserAvatar = async (avatarUrl: string | null): Promise<{ error?: string }> => {
    if (!user) return { error: 'No hay usuario autenticado.' };

    const updatedProfile: Profile = {
      ...user,
      avatar_url: avatarUrl || undefined,
    };

    setUser(updatedProfile);
    persistUser(updatedProfile);

    // Actualizar en Supabase si está conectado
    if (isSupabaseConnected) {
      try {
        const supabase = createClient();
        const { error } = await supabase
          .from('profiles')
          .update({ avatar_url: avatarUrl })
          .eq('id', user.id);

        if (error) {
          console.warn('Aviso: error al actualizar avatar en Supabase:', error.message);
        }
      } catch (err) {
        console.warn('Aviso al sincronizar avatar:', err);
      }
    }

    // Emitir evento para refrescar cualquier componente dependiente
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('bug_user_avatar_updated', { detail: { avatarUrl } }));
    }

    return {};
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        role: user?.role || null,
        isLoading,
        isSupabaseConnected,
        login,
        signUp,
        logout,
        switchDemoUser,
        updateUserAvatar,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth debe ser usado dentro de un AuthProvider');
  }
  return context;
}
