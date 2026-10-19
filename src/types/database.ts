export type UserRole = 'admin' | 'coordinator' | 'employee';
export type ProfileStatus = 'active' | 'pending' | 'rejected';
export type ClientType = 'cuota' | 'puntual';
export type EntryComputeType = 'cuota' | 'puntual';

export interface Profile {
  id: string;
  full_name: string;
  email: string;
  role: UserRole;
  status?: ProfileStatus; // 'active' | 'pending' | 'rejected'
  department?: string;
  created_at: string;
}

export interface Company {
  id: string;
  name: string;
  client_type: ClientType; // 'cuota' o 'puntual'
  monthly_hours_quota: number | null; // Cuota mensual en horas (ej. 15 horas)
  cif?: string; // CIF / NIF del cliente
  contact_name?: string; // Persona o cargo de contacto
  contact_email?: string; // Email de contacto
  account_manager?: string; // Responsable de cuenta en Brain Up
  logo_url?: string; // URL o Base64 del logo de la empresa
  is_active: boolean;
  created_at: string;
}

export interface TimeEntry {
  id: string;
  user_id: string;
  company_id: string;
  work_date: string; // YYYY-MM-DD
  start_time: string | null;
  end_time: string | null;
  duration_minutes: number;
  description: string | null;
  compute_type: EntryComputeType; // 'cuota' (computa a la cuota) | 'puntual' (horas extra/fuera de cuota)
  created_at: string;
  company?: Company;
  profile?: Profile;
}

export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: Profile;
        Insert: {
          id: string;
          full_name: string;
          email: string;
          role?: UserRole;
          created_at?: string;
        };
        Update: {
          id?: string;
          full_name?: string;
          email?: string;
          role?: UserRole;
          created_at?: string;
        };
        Relationships: [];
      };
      companies: {
        Row: Company;
        Insert: {
          id?: string;
          name: string;
          client_type?: ClientType;
          monthly_hours_quota?: number | null;
          is_active?: boolean;
          created_at?: string;
        };
        Update: {
          id?: string;
          name?: string;
          client_type?: ClientType;
          monthly_hours_quota?: number | null;
          is_active?: boolean;
          created_at?: string;
        };
        Relationships: [];
      };
      time_entries: {
        Row: TimeEntry;
        Insert: {
          id?: string;
          user_id: string;
          company_id: string;
          work_date?: string;
          start_time?: string | null;
          end_time?: string | null;
          duration_minutes: number;
          description?: string | null;
          compute_type?: EntryComputeType;
          created_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          company_id?: string;
          work_date?: string;
          start_time?: string | null;
          end_time?: string | null;
          duration_minutes?: number;
          description?: string | null;
          compute_type?: EntryComputeType;
          created_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'time_entries_user_id_fkey';
            columns: ['user_id'];
            referencedRelation: 'profiles';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'time_entries_company_id_fkey';
            columns: ['company_id'];
            referencedRelation: 'companies';
            referencedColumns: ['id'];
          }
        ];
      };
    };
    Views: {
      [_ in never]: never;
    };
    Functions: {
      is_coordinator: {
        Args: Record<PropertyKey, never>;
        Returns: boolean;
      };
    };
    Enums: {
      user_role: UserRole;
      client_type: ClientType;
      entry_compute_type: EntryComputeType;
    };
    CompositeTypes: {
      [_ in never]: never;
    };
  };
}
