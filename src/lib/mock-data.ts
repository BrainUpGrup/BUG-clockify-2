import { Company, Profile, TimeEntry } from '@/types/database';

// Estructura limpia para entorno de producción
// Las empresas, clientes y registros se darán de alta por el equipo real.

export const MOCK_COMPANIES: Company[] = [];

export const MOCK_PROFILES: Profile[] = [
  {
    id: '00000000-0000-0000-0000-000000000002',
    full_name: 'Coordinación Brain Up',
    email: 'coordinacion@brainupgrup.com',
    role: 'coordinator',
    status: 'active',
    department: 'Dirección de Operaciones',
    created_at: '2026-01-01T00:00:00Z',
  },
  {
    id: '00000000-0000-0000-0000-000000000003',
    full_name: 'Empleado de Prueba',
    email: 'empleado@brainupgrup.com',
    role: 'employee',
    status: 'active',
    department: 'Creatividad & Operaciones',
    created_at: '2026-01-01T00:00:00Z',
  },
];

export const MOCK_TIME_ENTRIES: TimeEntry[] = [];

