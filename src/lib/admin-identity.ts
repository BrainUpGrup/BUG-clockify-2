/**
 * Identidad canónica de la cuenta maestra Super Administrador.
 * Centralizada aquí para evitar duplicación de literales entre middleware, APIs, contextos y vistas.
 */
export const SUPER_ADMIN_EMAIL = 'desarrollo@brainupgrup.com';

export function isSuperAdminEmail(email?: string | null): boolean {
  return (email || '').toLowerCase().trim() === SUPER_ADMIN_EMAIL;
}
