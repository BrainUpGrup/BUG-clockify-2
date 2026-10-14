import { Company, Profile, TimeEntry } from '@/types/database';

// Estructura limpia para entorno de producción
// Las empresas, clientes y registros se darán de alta por el equipo real.

export const MOCK_COMPANIES: Company[] = [];

export const MOCK_PROFILES: Profile[] = [
  {
    id: 'u_coord',
    full_name: 'Coordinación Brain Up',
    email: 'coordinacion@brainupgrup.com',
    role: 'coordinator',
    status: 'active',
    department: 'Dirección de Operaciones',
    created_at: '2026-01-01T00:00:00Z',
  },
];

export const MOCK_TIME_ENTRIES: TimeEntry[] = [];
