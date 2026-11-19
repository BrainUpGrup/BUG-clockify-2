-- ==============================================================================
-- MIGRACIÓN: DESGLOSE DE ACTIVIDADES DE CUOTA POR EMPRESA • BRAIN UP CLOCKIFY
-- Suite Corporativa: Brain Up Grup
-- Versión asociada: v4.5.1
--
-- QUÉ HACE:
--   Añade la columna JSONB `quota_activities` a `public.companies` para guardar
--   la lista de actividades/partidas en las que se dedican las horas pactadas
--   con cada cliente (ej. [{"id":"...","title":"Redes sociales","hours":4}]).
--
-- Idempotente y segura (no borra ni modifica datos existentes).
-- ==============================================================================

alter table public.companies
  add column if not exists quota_activities jsonb null default '[]'::jsonb;

comment on column public.companies.quota_activities is
  'Lista JSONB de actividades en las que se dedica la cuota mensual de la empresa: [{ id, title, hours? }]';
