-- ============================================================================
-- MIGRACIÓN: Añadir soporte de logotipo WebP/URL a empresas (public.companies)
-- Proyecto: Brain Up Clockify
-- Uso: Ejecutar en Supabase -> SQL Editor
-- ============================================================================

alter table public.companies
  add column if not exists logo_url text null;
