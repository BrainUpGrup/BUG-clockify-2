-- ==============================================================================
-- BRAIN UP GRUP - ESQUEMA DE CHAT EN TIEMPO REAL & TAREAS POR CLIENTE (SLACK)
-- ==============================================================================
-- Compatible con profiles y companies existentes.
-- Habilita Supabase Realtime para la tabla messages y configura RLS completo.
-- ==============================================================================

-- 1. TABLA: channels (Canales de Clientes, Grupos Internos y DMs)
CREATE TABLE IF NOT EXISTS public.channels (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    type TEXT NOT NULL CHECK (type IN ('client', 'group', 'dm')),
    company_id UUID REFERENCES public.companies(id) ON DELETE SET NULL,
    created_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Índices para búsqueda rápida de canales
CREATE INDEX IF NOT EXISTS idx_channels_type ON public.channels(type);
CREATE INDEX IF NOT EXISTS idx_channels_company_id ON public.channels(company_id);

-- 2. TABLA: channel_members (Miembros y Registro de Última Lectura)
CREATE TABLE IF NOT EXISTS public.channel_members (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    channel_id UUID NOT NULL REFERENCES public.channels(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    last_read_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT uq_channel_user UNIQUE(channel_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_channel_members_user ON public.channel_members(user_id);
CREATE INDEX IF NOT EXISTS idx_channel_members_channel ON public.channel_members(channel_id);

-- 3. TABLA: messages (Mensajes, Tareas Accionables y Fijados)
CREATE TABLE IF NOT EXISTS public.messages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    channel_id UUID NOT NULL REFERENCES public.channels(id) ON DELETE CASCADE,
    sender_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    content TEXT NOT NULL,
    is_action_item BOOLEAN NOT NULL DEFAULT false,
    assigned_to UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    priority TEXT NOT NULL DEFAULT 'normal' CHECK (priority IN ('normal', 'urgent')),
    is_completed BOOLEAN NOT NULL DEFAULT false,
    is_pinned BOOLEAN NOT NULL DEFAULT false,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_messages_channel_created ON public.messages(channel_id, created_at ASC);
CREATE INDEX IF NOT EXISTS idx_messages_assigned_action ON public.messages(assigned_to, is_action_item, is_completed);
CREATE INDEX IF NOT EXISTS idx_messages_pinned ON public.messages(channel_id, is_pinned);

-- 4. ACTIVAR SUPABASE REALTIME PARA MESSAGES
-- Permite que los clientes suscritos reciban INSERTs, UPDATEs y DELETEs al instante
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_publication_tables 
        WHERE pubname = 'supabase_realtime' 
        AND schemaname = 'public' 
        AND tablename = 'messages'
    ) THEN
        ALTER PUBLICATION supabase_realtime ADD TABLE public.messages;
    END IF;
END $$;

-- 5. POLÍTICAS DE SEGURIDAD (ROW LEVEL SECURITY - RLS)
ALTER TABLE public.channels ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.channel_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;

-- Canales: los usuarios pueden ver canales públicos ('group' o 'client') o aquellos donde son miembros
CREATE POLICY "Ver canales permitidos" ON public.channels
    FOR SELECT USING (
        type IN ('group', 'client')
        OR EXISTS (
            SELECT 1 FROM public.channel_members 
            WHERE channel_members.channel_id = channels.id 
            AND channel_members.user_id = auth.uid()
        )
        OR public.is_coordinator()
    );

CREATE POLICY "Crear canales miembros autenticados" ON public.channels
    FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Actualizar canales coordinadores o creador" ON public.channels
    FOR UPDATE USING (
        created_by = auth.uid() 
        OR public.is_coordinator()
    );

-- Miembros de Canal:
CREATE POLICY "Ver miembros de canales accesibles" ON public.channel_members
    FOR SELECT USING (
        user_id = auth.uid()
        OR EXISTS (
            SELECT 1 FROM public.channels 
            WHERE channels.id = channel_members.channel_id 
            AND channels.type IN ('group', 'client')
        )
        OR public.is_coordinator()
    );

CREATE POLICY "Insertar membresía propia o coordinador" ON public.channel_members
    FOR INSERT WITH CHECK (
        user_id = auth.uid() 
        OR public.is_coordinator()
    );

CREATE POLICY "Actualizar last_read_at propio" ON public.channel_members
    FOR UPDATE USING (user_id = auth.uid());

-- Mensajes:
CREATE POLICY "Ver mensajes de canales autorizados" ON public.messages
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.channels 
            WHERE channels.id = messages.channel_id 
            AND (
                channels.type IN ('group', 'client')
                OR EXISTS (
                    SELECT 1 FROM public.channel_members 
                    WHERE channel_members.channel_id = channels.id 
                    AND channel_members.user_id = auth.uid()
                )
            )
        )
        OR public.is_coordinator()
    );

CREATE POLICY "Enviar mensajes a canales" ON public.messages
    FOR INSERT WITH CHECK (
        sender_id = auth.uid()
        AND EXISTS (
            SELECT 1 FROM public.channels 
            WHERE channels.id = messages.channel_id
        )
    );

CREATE POLICY "Actualizar mensajes propios o marcar revisado/fijado" ON public.messages
    FOR UPDATE USING (
        sender_id = auth.uid()
        OR assigned_to = auth.uid()
        OR public.is_coordinator()
    );

CREATE POLICY "Eliminar mensajes propios o coordinador" ON public.messages
    FOR DELETE USING (
        sender_id = auth.uid()
        OR public.is_coordinator()
    );

-- 6. DATOS SEMILLA INICIALES (GRUPOS GENERALES DE BRAIN UP)
INSERT INTO public.channels (id, name, type)
VALUES 
    ('00000000-0000-0000-0000-000000000001', 'general', 'group'),
    ('00000000-0000-0000-0000-000000000002', 'anuncios', 'group'),
    ('00000000-0000-0000-0000-000000000003', 'marketing-y-creativo', 'group'),
    ('00000000-0000-0000-0000-000000000004', 'operaciones', 'group')
ON CONFLICT (id) DO NOTHING;
