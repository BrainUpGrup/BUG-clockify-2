'use client';

import React, { createContext, useContext, useEffect, useState } from 'react';
import { Profile, UserRole } from '@/types/database';
import { createClient } from '@/lib/supabase/client';
import { MOCK_PROFILES } from '@/lib/mock-data';

interface AuthContextType {
  user: Profile | null;
  role: UserRole;
  isLoading: boolean;
  isSupabaseConnected: boolean;
  login: (email: string, pass: string) => Promise<{ error?: string }>;
  signUp: (fullName: string, email: string, pass: string, role: UserRole) => Promise<{ error?: string }>;
  logout: () => Promise<void>;
  switchDemoUser: (targetRole: UserRole) => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

// Por defecto entrar DIRECTAMENTE como Coordinador (Alejandro Ramos)
// El coordinador tiene permisos de Coordinador Y Trabajador a la vez.
const DEFAULT_COORDINATOR: Profile = MOCK_PROFILES[2]; // Alejandro Ramos

export function AuthProvider({ children }: { children: React.ReactNode }) {
  // Inicialización directa con el usuario Coordinador para evitar pantallas de carga o bloqueo
  const [user, setUser] = useState<Profile>(DEFAULT_COORDINATOR);
  const [isLoading, setIsLoading] = useState(false);
  const [isSupabaseConnected, setIsSupabaseConnected] = useState(false);

  useEffect(() => {
    async function checkSupabaseSession() {
      const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
      const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
      const hasConfig = url && key && !url.includes('your-project') && !url.includes('tu-proyecto');

      if (hasConfig) {
        setIsSupabaseConnected(true);
        try {
          const supabase = createClient();
          const { data: { session } } = await supabase.auth.getSession();
          if (session?.user) {
            const { data: profile } = await supabase
              .from('profiles')
              .select('*')
              .eq('id', session.user.id)
              .single();

            if (profile) {
              setUser(profile as Profile);
            }
          }
        } catch (e) {
          console.warn('Supabase no conectado aún, manteniendo modo Coordinador local:', e);
        }
      }
    }

    checkSupabaseSession();
  }, []);

  const login = async (email: string, pass: string) => {
    if (isSupabaseConnected) {
      const supabase = createClient();
      const { data, error } = await supabase.auth.signInWithPassword({ email, password: pass });
      if (error) return { error: error.message };

      if (data.user) {
        const { data: profile } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', data.user.id)
          .single();

        if (profile) setUser(profile as Profile);
      }
      return {};
    } else {
      // Búsqueda en mock profiles
      const found = MOCK_PROFILES.find((p) => p.email.toLowerCase() === email.toLowerCase());
      if (found) {
        setUser(found);
        return {};
      }
      return {};
    }
  };

  const signUp = async (fullName: string, email: string, pass: string, role: UserRole) => {
    if (isSupabaseConnected) {
      const supabase = createClient();
      const { error } = await supabase.auth.signUp({
        email,
        password: pass,
        options: {
          data: { full_name: fullName, role },
        },
      });
      if (error) return { error: error.message };
      return {};
    } else {
      const newMock: Profile = {
        id: 'u_' + Date.now(),
        full_name: fullName,
        email,
        role,
        created_at: new Date().toISOString(),
      };
      setUser(newMock);
      return {};
    }
  };

  const logout = async () => {
    // Si se hace logout, se restablece el usuario coordinador directo
    setUser(DEFAULT_COORDINATOR);
  };

  const switchDemoUser = (targetRole: UserRole) => {
    const target = MOCK_PROFILES.find((p) => p.role === targetRole) || DEFAULT_COORDINATOR;
    setUser(target);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        role: user?.role || 'coordinator',
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
