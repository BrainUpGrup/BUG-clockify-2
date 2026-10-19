-- ==============================================================================
-- BRAIN UP GRUP - INTEGRACIÓN SLACK (sustituye a schema_chat.sql)
-- ==============================================================================
-- Slack es la fuente de verdad de la conversación. Estas tablas son una caché
-- mínima para "Mi Resumen" + las tareas creadas desde mensajes de Slack.
-- Ver docs/INTEGRACION_SLACK.md
-- ==============================================================================

-- 1. INSTALACIÓN (token del bot cifrado). Solo accesible por la service role.
CREATE TABLE IF NOT EXISTS public.slack_installations (
    team_id TEXT PRIMARY KEY,
    team_name TEXT,
    bot_user_id TEXT NOT NULL,
    bot_token_encrypted TEXT NOT NULL,
    scopes TEXT NOT NULL,
    installed_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    installed_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 2. VÍNCULO CANAL SLACK <-> EMPRESA / CLIENTE
CREATE TABLE IF NOT EXISTS public.slack_channel_links (
    slack_channel_id TEXT PRIMARY KEY,
    team_id TEXT NOT NULL REFERENCES public.slack_installations(team_id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    kind TEXT NOT NULL DEFAULT 'client' CHECK (kind IN ('client', 'group')),
    company_id UUID REFERENCES public.companies(id) ON DELETE SET NULL,
    is_archived BOOLEAN NOT NULL DEFAULT false,
    last_message_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_slack_channel_links_company ON public.slack_channel_links(company_id);

-- 3. VÍNCULO PERFIL HUB <-> USUARIO SLACK
CREATE TABLE IF NOT EXISTS public.slack_user_links (
    profile_id UUID PRIMARY KEY REFERENCES public.profiles(id) ON DELETE CASCADE,
    slack_user_id TEXT NOT NULL UNIQUE,
    team_id TEXT NOT NULL REFERENCES public.slack_installations(team_id) ON DELETE CASCADE,
    linked_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 4. CACHÉ DE MENSAJES (solo canales vinculados; texto recortado)
CREATE TABLE IF NOT EXISTS public.slack_messages (
    slack_channel_id TEXT NOT NULL REFERENCES public.slack_channel_links(slack_channel_id) ON DELETE CASCADE,
    ts TEXT NOT NULL,
    thread_ts TEXT,
    slack_user_id TEXT,
    user_name TEXT,
    text TEXT NOT NULL DEFAULT '',
    permalink TEXT,
    is_pinned BOOLEAN NOT NULL DEFAULT false,
    pinned_at TIMESTAMPTZ,
    posted_at TIMESTAMPTZ NOT NULL,
    PRIMARY KEY (slack_channel_id, ts)
);

CREATE INDEX IF NOT EXISTS idx_slack_messages_posted ON public.slack_messages(slack_channel_id, posted_at DESC);
CREATE INDEX IF NOT EXISTS idx_slack_messages_pinned ON public.slack_messages(is_pinned, pinned_at DESC) WHERE is_pinned;

-- 5. TAREAS CREADAS DESDE MENSAJES DE SLACK
CREATE TABLE IF NOT EXISTS public.slack_tasks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    slack_channel_id TEXT NOT NULL REFERENCES public.slack_channel_links(slack_channel_id) ON DELETE CASCADE,
    message_ts TEXT NOT NULL,
    text TEXT NOT NULL,
    permalink TEXT,
    created_by_slack_user_id TEXT NOT NULL,
    created_by_name TEXT,
    assignee_slack_user_id TEXT NOT NULL,
    assignee_profile_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    priority TEXT NOT NULL DEFAULT 'normal' CHECK (priority IN ('normal', 'urgent')),
    due_date DATE,
    is_completed BOOLEAN NOT NULL DEFAULT false,
    completed_at TIMESTAMPTZ,
    completed_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT uq_slack_task_message_assignee UNIQUE (slack_channel_id, message_ts, assignee_slack_user_id)
);

CREATE INDEX IF NOT EXISTS idx_slack_tasks_assignee ON public.slack_tasks(assignee_profile_id, is_completed);

-- 6. ÚLTIMA VISITA POR USUARIO Y CANAL (contador "nuevos" propio del Hub)
CREATE TABLE IF NOT EXISTS public.slack_channel_reads (
    profile_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    slack_channel_id TEXT NOT NULL REFERENCES public.slack_channel_links(slack_channel_id) ON DELETE CASCADE,
    last_seen_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    PRIMARY KEY (profile_id, slack_channel_id)
);

-- 7. REALTIME para refrescar "Mi Resumen" en vivo
DO $$
DECLARE t TEXT;
BEGIN
    FOREACH t IN ARRAY ARRAY['slack_messages', 'slack_tasks'] LOOP
        IF NOT EXISTS (
            SELECT 1 FROM pg_publication_tables
            WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = t
        ) THEN
            EXECUTE format('ALTER PUBLICATION supabase_realtime ADD TABLE public.%I', t);
        END IF;
    END LOOP;
END $$;

-- 8. RLS
ALTER TABLE public.slack_installations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.slack_channel_links ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.slack_user_links ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.slack_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.slack_tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.slack_channel_reads ENABLE ROW LEVEL SECURITY;

-- slack_installations: sin políticas -> solo la service role (servidor) accede.

CREATE POLICY "Ver canales vinculados" ON public.slack_channel_links
    FOR SELECT USING (auth.uid() IS NOT NULL);
CREATE POLICY "Coordinador gestiona vínculos de canal" ON public.slack_channel_links
    FOR UPDATE USING (public.is_coordinator());

CREATE POLICY "Ver vínculo Slack propio o coordinador" ON public.slack_user_links
    FOR SELECT USING (profile_id = auth.uid() OR public.is_coordinator());

CREATE POLICY "Ver mensajes cacheados" ON public.slack_messages
    FOR SELECT USING (auth.uid() IS NOT NULL);

CREATE POLICY "Ver tareas propias o coordinador" ON public.slack_tasks
    FOR SELECT USING (assignee_profile_id = auth.uid() OR public.is_coordinator());
CREATE POLICY "Completar tareas propias o coordinador" ON public.slack_tasks
    FOR UPDATE USING (assignee_profile_id = auth.uid() OR public.is_coordinator());

CREATE POLICY "Gestionar lecturas propias" ON public.slack_channel_reads
    FOR ALL USING (profile_id = auth.uid()) WITH CHECK (profile_id = auth.uid());
