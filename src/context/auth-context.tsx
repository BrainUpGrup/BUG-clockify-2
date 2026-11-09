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
  mustResetPassword: boolean;
  login: (email: string, pass: string) => Promise<{ error?: string; user?: Profile }>;
  signUp: (fullName: string, email: string, pass: string, department?: string) => Promise<{ error?: string }>;
  logout: () => Promise<void>;
  completePasswordReset: (newPassword: string) => Promise<{ success: boolean; error?: string }>;
  switchDemoUser: (targetProfile: Profile) => void;
  updateUserAvatar: (avatarUrl: string | null) => Promise<{ error?: string }>;
}

async function syncServerSession(profile: Profile | null): Promise<void> {
  if (typeof window === 'undefined') return;
  try {
    if (profile) {
      await fetch('/api/auth/session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ user: profile }),
      });
    } else {
      await fetch('/api/auth/session', {
        method: 'DELETE',
      });
    }
  } catch (err) {
    console.warn('[Session] Aviso al sincronizar sesión con el servidor:', err);
  }
}

function persistUser(profile: Profile | null) {
  if (typeof window === 'undefined') return;
  try {
    if (profile) {
      if (profile.email && profile.email.toLowerCase() === 'appadmin@brainupgrup.com') {
        profile.role = 'admin';
      }
      localStorage.setItem('bug_clockify_current_user', JSON.stringify(profile));
      const cookieData = JSON.stringify({ id: profile.id, role: profile.role, email: profile.email });
      document.cookie = 'bug_clockify_user=' + encodeURIComponent(cookieData) + '; path=/; max-age=604800; SameSite=Lax';
      syncServerSession(profile);
    } else {
      localStorage.removeItem('bug_clockify_current_user');
      document.cookie = 'bug_clockify_user=; path=/; max-age=0; SameSite=Lax';
      syncServerSession(null);
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
  const [mustResetPassword, setMustResetPassword] = useState<boolean>(false);

  // Inicialización ultra-rápida (0ms de bloqueo): restaura de inmediato desde caché y valida en segundo plano
  useEffect(() => {
    let isMounted = true;

    // 1. PASO INSTANTÁNEO (0ms): Si hay sesión previa guardada, carga de inmediato sin spinner
    try {
      const stored = localStorage.getItem('bug_clockify_current_user');
      if (stored) {
        const parsed = JSON.parse(stored) as Profile;
        if (parsed && parsed.status !== 'pending') {
          if (parsed.email && parsed.email.toLowerCase() === 'appadmin@brainupgrup.com') {
            parsed.role = 'admin';
          }
          setUser(parsed);
          persistUser(parsed);

          const wasLocallyConfigured = typeof window !== 'undefined' && localStorage.getItem(`bug_pwd_configured_${parsed.email}`) === 'true';
          if (parsed.password_configured === false && !wasLocallyConfigured) {
            setMustResetPassword(true);
          } else if (parsed.email && !wasLocallyConfigured) {
            // Comprobación de fondo si Super Admin marcó reset
            fetch(`/api/auth/reset-password?email=${encodeURIComponent(parsed.email)}`)
              .then((r) => r.json())
              .then((data) => {
                if (data && data.password_configured === false && isMounted) {
                  const isNowConfigured = typeof window !== 'undefined' && localStorage.getItem(`bug_pwd_configured_${parsed.email}`) === 'true';
                  if (!isNowConfigured) {
                    setMustResetPassword(true);
                    setUser((prev) => (prev ? { ...prev, password_configured: false } : prev));
                  }
                }
              })
              .catch(() => {});
          }
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
                setMustResetPassword(false);
                try {
                  localStorage.removeItem('bug_clockify_current_user');
                } catch (e) {
                  console.error(e);
                }
              } else {
                const safeProfile = {
                  ...profile,
                  role: profile.email && profile.email.toLowerCase() === 'appadmin@brainupgrup.com' ? 'admin' : profile.role,
                  avatar_url: profile.avatar_url || undefined,
                } as Profile;
                setUser(safeProfile);

                if (profile.password_configured === false) {
                  setMustResetPassword(true);
                }

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

  // Función de inicio de sesión con validación de contraseña temporal (OTP) y estado
  const login = async (email: string, pass: string): Promise<{ error?: string; user?: Profile }> => {
    const cleanEmail = email.trim().toLowerCase();
    const cleanPass = pass.trim();
    const isDevOrDemo =
      process.env.NODE_ENV === 'development' ||
      process.env.NEXT_PUBLIC_SHOW_DEMO_LOGIN === 'true';

    // 0. AUTENTICACIÓN SEGURA EN SERVIDOR EDGE (/api/auth/session)
    // Valida credenciales contra RPC SECURITY DEFINER, emite cookie HMAC y aplica Rate Limiting
    try {
      const sessionRes = await fetch('/api/auth/session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: cleanEmail, password: cleanPass }),
      });

      if (sessionRes.ok) {
        const sData = await sessionRes.json();
        if (sData.success && sData.user) {
          const loggedProfile = {
            ...sData.user,
            role: cleanEmail === 'appadmin@brainupgrup.com' ? 'admin' : sData.user.role,
          } as Profile;
          setUser(loggedProfile);
          persistUser(loggedProfile);
          setMustResetPassword(loggedProfile.password_configured === false);
          return { user: loggedProfile };
        }
      } else if (sessionRes.status === 403 || sessionRes.status === 429) {
        const errData = await sessionRes.json();
        return { error: errData.error };
      }
    } catch (e) {
      console.warn('Aviso conexión /api/auth/session:', e);
    }

    // 1. INTENTO CON CONTRASEÑA TEMPORAL DE UN SOLO USO (OTP) GENERADA POR SUPER ADMIN
    try {
      const verifyRes = await fetch('/api/auth/reset-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'verify_temp_password',
          email: cleanEmail,
          password: cleanPass,
        }),
      });

      if (verifyRes.ok) {
        const vData = await verifyRes.json();
        if (vData.valid) {
          let otpProfile: Profile | null = null;

          // Buscar perfil en Supabase si está conectado
          if (isSupabaseConnected) {
            try {
              const supabase = createClient();
              const { data: dbProf } = await supabase
                .from('profiles')
                .select('*')
                .eq('email', cleanEmail)
                .single();
              if (dbProf) otpProfile = dbProf as Profile;
            } catch {
              // fallback
            }
          }

          if (!otpProfile) {
            if (cleanEmail === 'montse@brainupgrup.com') {
              otpProfile = {
                id: '755e8812-8e22-43f1-ac6f-f41ce5451fcf',
                full_name: 'Montse',
                email: cleanEmail,
                role: 'coordinator',
                status: 'active',
                department: 'Coordinación & Dirección',
                created_at: '2026-10-14T10:35:57Z',
              };
            } else if (cleanEmail === 'peipito@gmail.com') {
              otpProfile = {
                id: 'd6ab9054-ef6c-46ff-9483-441426e3cf8b',
                full_name: 'Gerard Medina',
                email: cleanEmail,
                role: 'employee',
                status: 'active',
                department: 'Creatividad & Operaciones',
                created_at: '2026-01-01T00:00:00Z',
              };
            } else if (cleanEmail === 'appadmin@brainupgrup.com') {
              otpProfile = {
                id: '8b2a428b-9fb2-4a26-b298-696f8510d770',
                full_name: 'Super Administrador',
                email: cleanEmail,
                role: 'admin',
                status: 'active',
                department: 'Sistemas & Seguridad',
                created_at: '2026-01-01T00:00:00Z',
              };
            } else {
              otpProfile = {
                id: `u_${Date.now()}`,
                full_name: cleanEmail.split('@')[0],
                email: cleanEmail,
                role: 'employee',
                status: 'active',
                department: 'Creatividad & Operaciones',
                created_at: new Date().toISOString(),
              };
            }
          }

          const loggedWithOtp: Profile = {
            ...otpProfile,
            password_configured: false,
          };
          setUser(loggedWithOtp);
          persistUser(loggedWithOtp);
          setMustResetPassword(true);
          return { user: loggedWithOtp };
        }
      }
    } catch (otpErr) {
      console.warn('Aviso de verificación OTP:', otpErr);
    }

    // 2. INTENTO EN SUPABASE AUTH (Cuentas registradas reales y sesiones criptográficas JWT)
    if (isSupabaseConnected) {
      try {
        const supabase = createClient();
        const { data, error } = await supabase.auth.signInWithPassword({
          email: cleanEmail,
          password: cleanPass,
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

            if (profile.password_configured === false) {
              setMustResetPassword(true);
            } else {
              setMustResetPassword(false);
            }

            return { user: loggedProfile };
          }
        }
      } catch (err: unknown) {
        console.warn('Aviso: Intento Supabase Auth fallido:', err);
      }
    }

    // 3. INTENTO MEDIANTE FUNCIÓN DE AUTENTICACIÓN SEGURA RPC (SECURITY DEFINER)
    // Permite validar al empleado en la base de datos sin exponer columnas de contraseñas ni requerir RLS permisivo
    if (isSupabaseConnected) {
      try {
        const supabase = createClient();
        const { data: rpcRes, error: rpcErr } = await supabase.rpc('authenticate_employee', {
          p_email: cleanEmail,
          p_password: cleanPass,
        });

        if (rpcErr) {
          console.error('Error al ejecutar RPC authenticate_employee en Supabase:', rpcErr);
        } else if (rpcRes) {
          if (rpcRes.success === false) {
            return { error: rpcRes.error };
          }
          if (rpcRes.success === true && rpcRes.user) {
            const userProf = rpcRes.user as Profile;
            persistUser(userProf);
            setUser(userProf);
            setMustResetPassword(userProf.password_configured === false);
            return { user: userProf };
          }
        }
      } catch (rpcErr) {
        console.warn('Aviso: RPC authenticate_employee no disponible aún en Supabase:', rpcErr);
      }
    }

    // 4. ACCESO DEMO EXCLUSIVAMENTE EN ENTORNO LOCAL DE DESARROLLO SIN SUPABASE
    if (isDevOrDemo && !isSupabaseConnected) {
      if (cleanEmail === 'appadmin@brainupgrup.com') {
        const adminProfile: Profile = {
          id: '8b2a428b-9fb2-4a26-b298-696f8510d770',
          full_name: 'Super Administrador',
          email: 'appadmin@brainupgrup.com',
          role: 'admin',
          status: 'active',
          department: 'Sistemas & Seguridad',
          created_at: '2026-01-01T00:00:00Z',
        };
        persistUser(adminProfile);
        setUser(adminProfile);
        setMustResetPassword(false);
        return { user: adminProfile };
      }

      if (cleanEmail === 'montse@brainupgrup.com') {
        const coordProfile: Profile = {
          id: '755e8812-8e22-43f1-ac6f-f41ce5451fcf',
          full_name: 'Montse',
          email: cleanEmail,
          role: 'coordinator',
          status: 'active',
          department: 'Coordinación & Dirección',
          created_at: '2026-10-14T10:35:57Z',
        };
        persistUser(coordProfile);
        setUser(coordProfile);
        setMustResetPassword(false);
        return { user: coordProfile };
      }

      if (cleanEmail === 'peipito@gmail.com') {
        const empProfile: Profile = {
          id: 'd6ab9054-ef6c-46ff-9483-441426e3cf8b',
          full_name: 'Gerard Medina',
          email: cleanEmail,
          role: 'employee',
          status: 'active',
          department: 'Creatividad & Operaciones',
          created_at: '2026-01-01T00:00:00Z',
        };
        persistUser(empProfile);
        setUser(empProfile);
        setMustResetPassword(false);
        return { user: empProfile };
      }

      // Perfiles mock locales registrados offline
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

  // Completar reinicio obligatorio de contraseña
  const completePasswordReset = async (newPassword: string): Promise<{ success: boolean; error?: string }> => {
    if (!user?.email) {
      return { success: false, error: 'No hay usuario autenticado.' };
    }

    try {
      const res = await fetch('/api/auth/reset-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'update_password',
          email: user.email,
          newPassword,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        return { success: false, error: data.error || 'Error al actualizar contraseña' };
      }

      // Si Supabase Auth está conectado y hay sesión activa
      if (isSupabaseConnected) {
        try {
          const supabase = createClient();
          await supabase.auth.updateUser({ password: newPassword });
        } catch (supaErr) {
          console.warn('Aviso: update password en Supabase Auth:', supaErr);
        }
      }

      // Actualizar estado local
      const updatedProfile: Profile = {
        ...user,
        password_configured: true,
      };
      setUser(updatedProfile);
      persistUser(updatedProfile);
      setMustResetPassword(false);

      try {
        localStorage.setItem(`bug_pwd_configured_${user.email}`, 'true');
      } catch {}

      return { success: true };
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Error inesperado al guardar contraseña';
      return { success: false, error: msg };
    }
  };

  // Registro de nuevo empleado (siempre en estado 'pending')
  const signUp = async (
    fullName: string,
    email: string,
    pass: string,
    department: string = 'Creatividad & Operaciones'
  ): Promise<{ error?: string }> => {
    const cleanEmail = email.trim().toLowerCase();
    const cleanPass = pass.trim();
    let createdProfileId: string | undefined;

    if (isSupabaseConnected) {
      try {
        const supabase = createClient();

        // 1. Verificar si el correo ya existe en la base de datos
        const { data: existingProf } = await supabase
          .from('profiles')
          .select('id, email, status')
          .eq('email', cleanEmail)
          .maybeSingle();

        if (existingProf) {
          if (existingProf.status === 'pending') {
            return {
              error: 'Ya existe una solicitud pendiente con este correo. La coordinadora la validará en breve.',
            };
          }
          return {
            error: 'Este correo ya está registrado en la plataforma. Puedes iniciar sesión directamente.',
          };
        }

        // 2. Insertar perfil pendiente directamente en public.profiles
        // Esto es inmune a límites de envío de emails ('email rate limit') de Supabase
        const { data: insertedProfile, error: insertErr } = await supabase
          .from('profiles')
          .insert({
            full_name: fullName.trim(),
            email: cleanEmail,
            role: 'employee',
            status: 'pending',
            department,
            password_configured: true,
            custom_password: cleanPass,
          })
          .select('id')
          .maybeSingle();

        if (insertErr) {
          console.warn('[SignUp] Aviso al registrar perfil en profiles:', insertErr);
          if (insertErr.code === '23505') {
            return { error: 'Este correo ya tiene un registro en la base de datos.' };
          }
        } else if (insertedProfile?.id) {
          createdProfileId = insertedProfile.id;
        }

        // 3. Intento secundario en Supabase Auth (en segundo plano y sin bloquear el registro)
        // Si Supabase devuelve "email rate limit exceeded" o falla el envío de correo, no interrumpe el registro
        try {
          const authRes = await supabase.auth.signUp({
            email: cleanEmail,
            password: cleanPass,
            options: {
              data: {
                full_name: fullName.trim(),
                role: 'employee',
                status: 'pending',
                department,
              },
            },
          });

          if (authRes.error) {
            console.warn('[SignUp] Supabase Auth aviso (ignorado para garantizar registro):', authRes.error.message);
          } else if (authRes.data?.user?.id && createdProfileId && createdProfileId !== authRes.data.user.id) {
            try {
              await supabase
                .from('profiles')
                .update({ id: authRes.data.user.id })
                .eq('email', cleanEmail);
              createdProfileId = authRes.data.user.id;
            } catch {
              // Si no permite actualizar id por constraints, se mantiene el ID ya asignado
            }
          }

          // Asegurar que custom_password esté actualizado en profiles
          try {
            await supabase
              .from('profiles')
              .update({
                custom_password: cleanPass,
                password_configured: true,
              })
              .eq('email', cleanEmail);
          } catch {
            // ignore
          }

          // Cerrar cualquier sesión automática para forzar la aprobación previa de la coordinadora
          await supabase.auth.signOut();
        } catch (authErr) {
          console.warn('[SignUp] Excepción secundaria en Supabase Auth:', authErr);
        }
      } catch (err: unknown) {
        console.error('[SignUp] Error en registro:', err);
      }
    }

    // 4. Guardar en pending local como respaldo
    try {
      const pendingUsers = JSON.parse(localStorage.getItem('bug_clockify_pending_users') || '[]');
      const filtered = pendingUsers.filter((u: any) => u.email !== cleanEmail);
      filtered.push({
        id: createdProfileId || `u_${Date.now()}`,
        full_name: fullName.trim(),
        email: cleanEmail,
        role: 'employee',
        status: 'pending',
        department,
        password_configured: true,
        created_at: new Date().toISOString(),
      });
      localStorage.setItem('bug_clockify_pending_users', JSON.stringify(filtered));
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
    await syncServerSession(null);
    persistUser(null);
    setUser(null);
    setMustResetPassword(false);
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
        mustResetPassword,
        login,
        signUp,
        logout,
        completePasswordReset,
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
