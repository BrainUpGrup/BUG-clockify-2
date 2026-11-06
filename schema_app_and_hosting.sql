-- ==============================================================================
-- BRAIN UP GRUP - ESQUEMA SUPABASE: HOSTING & TASKFLOW (PERSISTENCIA TOTAL)
-- ==============================================================================
-- Copia y pega este script completo en el SQL Editor de tu proyecto Supabase:
-- https://supabase.com/dashboard/project/popypyunzkuyighdyjkc/sql
-- y haz clic en RUN.
-- ==============================================================================

-- 1. TABLA: hosting_services (Servicios de Hosting, Dominios y Alertas de Renovación)
CREATE TABLE IF NOT EXISTS public.hosting_services (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  service_type TEXT NOT NULL DEFAULT 'Hosting',
  renewal_cycle TEXT NOT NULL DEFAULT 'Anual',
  expiration_date DATE NOT NULL,
  auto_renew BOOLEAN NOT NULL DEFAULT false,
  payment_method TEXT NULL DEFAULT 'Manual / No configurado',
  provider TEXT NOT NULL DEFAULT 'Cdmon',
  parent_id TEXT NULL,
  client_name TEXT NULL,
  company_id UUID NULL REFERENCES public.companies(id) ON DELETE SET NULL,
  price_cost NUMERIC(10, 2) NULL DEFAULT 0,
  price_client NUMERIC(10, 2) NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'expired', 'renewed', 'cancelled')),
  notes TEXT NULL,
  last_notified_at TIMESTAMPTZ NULL,
  notification_stages JSONB NULL DEFAULT '{"7": false, "15": false, "30": false, "60": false, "90": false}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_hosting_expiration_date ON public.hosting_services(expiration_date);
CREATE INDEX IF NOT EXISTS idx_hosting_name ON public.hosting_services(name);
CREATE INDEX IF NOT EXISTS idx_hosting_parent_id ON public.hosting_services(parent_id);

ALTER TABLE public.hosting_services ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "hosting_select_policy" ON public.hosting_services;
CREATE POLICY "hosting_select_policy" ON public.hosting_services
  FOR SELECT USING (true);

DROP POLICY IF EXISTS "hosting_all_policy" ON public.hosting_services;
CREATE POLICY "hosting_all_policy" ON public.hosting_services
  FOR ALL USING (true) WITH CHECK (true);


-- 2. TABLA: taskflow_items (Tareas, Reuniones y Entregables del Calendario)
CREATE TABLE IF NOT EXISTS public.taskflow_items (
  id TEXT PRIMARY KEY,
  type TEXT NOT NULL DEFAULT 'task' CHECK (type IN ('task', 'meeting')),
  title TEXT NOT NULL,
  description TEXT NULL,
  company_id UUID NULL REFERENCES public.companies(id) ON DELETE SET NULL,
  company_name TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'todo' CHECK (status IN ('todo', 'in_progress', 'review', 'done')),
  priority TEXT NULL DEFAULT 'media',
  color_strip TEXT NULL DEFAULT 'purple',
  custom_color TEXT NULL,
  list_id TEXT NULL,
  reschedule_mode TEXT NULL DEFAULT 'manual',
  auto_reschedule BOOLEAN NOT NULL DEFAULT false,
  reschedule_days INTEGER NOT NULL DEFAULT 1,
  date DATE NOT NULL,
  start_time TEXT NULL,
  end_time TEXT NULL,
  location TEXT NULL,
  meeting_url TEXT NULL,
  estimated_hours NUMERIC(5, 2) NULL DEFAULT 0,
  created_by TEXT NULL DEFAULT 'Equipo Brain Up',
  created_by_name TEXT NULL,
  is_shared BOOLEAN NOT NULL DEFAULT true,
  assignees JSONB NOT NULL DEFAULT '["Todos"]',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_taskflow_items_date ON public.taskflow_items(date);
CREATE INDEX IF NOT EXISTS idx_taskflow_items_status ON public.taskflow_items(status);
CREATE INDEX IF NOT EXISTS idx_taskflow_items_company ON public.taskflow_items(company_id);

ALTER TABLE public.taskflow_items ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "taskflow_items_select_policy" ON public.taskflow_items;
CREATE POLICY "taskflow_items_select_policy" ON public.taskflow_items
  FOR SELECT USING (true);

DROP POLICY IF EXISTS "taskflow_items_all_policy" ON public.taskflow_items;
CREATE POLICY "taskflow_items_all_policy" ON public.taskflow_items
  FOR ALL USING (true) WITH CHECK (true);


-- 3. TABLA: taskflow_lists (Listas personalizadas de TaskFlow)
CREATE TABLE IF NOT EXISTS public.taskflow_lists (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  color TEXT NOT NULL DEFAULT '#8E0E75',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.taskflow_lists ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "taskflow_lists_select_policy" ON public.taskflow_lists;
CREATE POLICY "taskflow_lists_select_policy" ON public.taskflow_lists
  FOR SELECT USING (true);

DROP POLICY IF EXISTS "taskflow_lists_all_policy" ON public.taskflow_lists;
CREATE POLICY "taskflow_lists_all_policy" ON public.taskflow_lists
  FOR ALL USING (true) WITH CHECK (true);


-- 4. TABLA: taskflow_postits (Mural y Pizarra Modular Interactiva de Post-its)
CREATE TABLE IF NOT EXISTS public.taskflow_postits (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  content TEXT NOT NULL DEFAULT '',
  color TEXT NOT NULL DEFAULT 'yellow',
  target_date DATE NOT NULL,
  target_time TEXT NULL DEFAULT '09:00',
  reminders JSONB NOT NULL DEFAULT '[]',
  is_pinned BOOLEAN NOT NULL DEFAULT false,
  is_completed BOOLEAN NOT NULL DEFAULT false,
  pos_x NUMERIC NULL DEFAULT 0,
  pos_y NUMERIC NULL DEFAULT 0,
  width NUMERIC NULL DEFAULT 260,
  height NUMERIC NULL DEFAULT 220,
  z_index INTEGER NULL DEFAULT 1,
  size_preset TEXT NULL DEFAULT 'medium',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_taskflow_postits_target_date ON public.taskflow_postits(target_date);
CREATE INDEX IF NOT EXISTS idx_taskflow_postits_completed ON public.taskflow_postits(is_completed);

ALTER TABLE public.taskflow_postits ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "taskflow_postits_select_policy" ON public.taskflow_postits;
CREATE POLICY "taskflow_postits_select_policy" ON public.taskflow_postits
  FOR SELECT USING (true);

DROP POLICY IF EXISTS "taskflow_postits_all_policy" ON public.taskflow_postits;
CREATE POLICY "taskflow_postits_all_policy" ON public.taskflow_postits
  FOR ALL USING (true) WITH CHECK (true);

