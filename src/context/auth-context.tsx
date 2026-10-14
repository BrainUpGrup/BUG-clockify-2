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
          setIsLoading(false); // ¡Renderizado instantáneo!
        }
      }
    } catch (e) {
      console.error(e);
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
                setUser(profile as Profile);
                try {
                  localStorage.setItem('bug_clockify_current_user', JSON.stringify(profile));
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

    // Cuenta Maestra Super Admin de Brain Up Grup
    if (cleanEmail === 'appadmin@brainupgrup.com' && pass.trim() === 'fn.5loDnrTTfI2z!') {
      const adminProfile: Profile = {
        id: '00000000-0000-0000-0000-000000000001',
        full_name: 'Super Administrador',
        email: 'appadmin@brainupgrup.com',
        role: 'admin',
        status: 'active',
        department: 'Sistemas & Seguridad',
        created_at: '2026-01-01T00:00:00Z',
      };

      if (isSupabaseConnected) {
        try {
          const supabase = createClient();
          await supabase.from('profiles').upsert(adminProfile);
        } catch (e) {
          console.warn('Upsert admin profile notice:', e);
        }
      }

      setUser(adminProfile);
      try {
        localStorage.setItem('bug_clockify_current_user', JSON.stringify(adminProfile));
      } catch (e) {
        console.error(e);
      }
      return { user: adminProfile };
    }

    // Cuenta de Prueba de Coordinadora (Rol Dual: Coordinadora & Empleada)
    // Acepta tanto coordinacion@ como coordinadora@ con o sin signo de admiración
    if (
      (cleanEmail === 'coordinacion@brainupgrup.com' || cleanEmail === 'coordinadora@brainupgrup.com') &&
      (pass.trim() === 'BrainUp2026!' || pass.trim() === 'BrainUp2026' || pass.trim() === 'brainup2026')
    ) {
      const coordProfile: Profile = {
        id: '00000000-0000-0000-0000-000000000002',
        full_name: 'Coordinación Brain Up',
        email: cleanEmail,
        role: 'coordinator',
        status: 'active',
        department: 'Dirección de Operaciones',
        created_at: '2026-01-01T00:00:00Z',
      };

      if (isSupabaseConnected) {
        try {
          const supabase = createClient();
          await supabase.from('profiles').upsert(coordProfile);
        } catch (e) {
          console.warn('Upsert coord profile notice:', e);
        }
      }

      setUser(coordProfile);
      try {
        localStorage.setItem('bug_clockify_current_user', JSON.stringify(coordProfile));
      } catch (e) {
        console.error(e);
      }
      return { user: coordProfile };
    }

    // Cuenta de Prueba de Empleado (Para verificar vista aislada de trabajador)
    // Acepta tanto empleado@ como trabajador@
    if (
      (cleanEmail === 'empleado@brainupgrup.com' || cleanEmail === 'trabajador@brainupgrup.com') &&
      (pass.trim() === 'BrainUp2026!' || pass.trim() === 'BrainUp2026' || pass.trim() === 'brainup2026')
    ) {
      const empProfile: Profile = {
        id: '00000000-0000-0000-0000-000000000003',
        full_name: 'Empleado de Prueba',
        email: cleanEmail,
        role: 'employee',
        status: 'active',
        department: 'Creatividad & Operaciones',
        created_at: '2026-01-01T00:00:00Z',
      };

      if (isSupabaseConnected) {
        try {
          const supabase = createClient();
          await supabase.from('profiles').upsert(empProfile);
        } catch (e) {
          console.warn('Upsert employee profile notice:', e);
        }
      }

      setUser(empProfile);
      try {
        localStorage.setItem('bug_clockify_current_user', JSON.stringify(empProfile));
      } catch (e) {
        console.error(e);
      }
      return { user: empProfile };
    }

    if (isSupabaseConnected) {
      try {
        const supabase = createClient();
        const { data, error } = await supabase.auth.signInWithPassword({
          email: cleanEmail,
          password: pass,
        });

        if (error) {
          return { error: 'Credenciales inválidas. Verifica tu correo y contraseña.' };
        }

        if (data.user) {
          const { data: profile, error: profError } = await supabase
            .from('profiles')
            .select('*')
            .eq('id', data.user.id)
            .single();

          if (profError || !profile) {
            return { error: 'No se encontró el perfil de usuario en la base de datos.' };
          }

          // Verificación de estado de cuenta
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
          try {
            localStorage.setItem('bug_clockify_current_user', JSON.stringify(loggedProfile));
          } catch (e) {
            console.error(e);
          }
          return { user: loggedProfile };
        }
      } catch (err: unknown) {
        console.error(err);
        return { error: 'Error de conexión con el servidor de autenticación.' };
      }
    }

    // Modo local / Fallback con perfiles registrados
    let allProfiles = [...MOCK_PROFILES];
    try {
      const storedPending = localStorage.getItem('bug_clockify_pending_users');
      if (storedPending) {
        const parsed = JSON.parse(storedPending) as Profile[];
        allProfiles = [...allProfiles, ...parsed];
      }
    } catch (e) {
      console.error(e);
    }

    const found = allProfiles.find((p) => p.email.toLowerCase() === cleanEmail);

    if (!found) {
      return {
        error: 'No existe ninguna cuenta registrada con este correo. Solicita acceso mediante el enlace de registro.',
      };
    }

    if (found.status === 'pending') {
      return {
        error: 'Tu cuenta está registrada pero aún está PENDIENTE de validación por la coordinadora de Brain Up Grup.',
      };
    }

    if (found.status === 'rejected') {
      return { error: 'Tu solicitud de acceso fue rechazada.' };
    }

    setUser(found);
    try {
      localStorage.setItem('bug_clockify_current_user', JSON.stringify(found));
    } catch (e) {
      console.error(e);
    }
    return { user: found };
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
    try {
      localStorage.removeItem('bug_clockify_current_user');
    } catch (e) {
      console.error(e);
    }
    setUser(null);
  };

  // Cambio rápido de usuario para testing/demo
  const switchDemoUser = (targetProfile: Profile) => {
    setUser(targetProfile);
    try {
      localStorage.setItem('bug_clockify_current_user', JSON.stringify(targetProfile));
    } catch (e) {
      console.error(e);
    }
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
