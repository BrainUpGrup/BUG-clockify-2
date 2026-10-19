'use client';

import React, { useState, useEffect, Suspense, useMemo } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useAuth } from '@/context/auth-context';
import { useNotifications } from '@/context/notifications-context';
import { createClient } from '@/lib/supabase/client';
import { MOCK_COMPANIES, MOCK_PROFILES } from '@/lib/mock-data';
import { Company, Profile } from '@/types/database';
import { Channel, ChatMessage } from '@/types/chat';
import { ChatService } from '@/lib/chat-service';
import { RailSidebar } from '@/components/chat/rail-sidebar';
import { ChannelsSidebar } from '@/components/chat/channels-sidebar';
import { SummaryDashboard } from '@/components/chat/summary-dashboard';
import { ChatView } from '@/components/chat/chat-view';
import { CreateChannelModal } from '@/components/chat/create-channel-modal';
import { CheckCircle2, AlertCircle } from 'lucide-react';
import { canUserAccessHubApp } from '@/lib/hub-apps';

function BrainUpChatContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user, isLoading: authLoading } = useAuth();
  const { addNotification } = useNotifications();

  // Estados de datos
  const [channels, setChannels] = useState<Channel[]>([]);
  const [companies, setCompanies] = useState<Company[]>([]);
  const [profiles, setProfiles] = useState<Profile[]>([]);
  
  // Estado de navegación
  const [isSummaryActive, setIsSummaryActive] = useState<boolean>(true);
  const [selectedChannelId, setSelectedChannelId] = useState<string | null>(null);
  const [activeRailTab, setActiveRailTab] = useState<'summary' | 'clients' | 'groups' | 'dms'>('summary');

  // Mensajes y tareas
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [actionItems, setActionItems] = useState<ChatMessage[]>([]);
  const [pinnedMessages, setPinnedMessages] = useState<ChatMessage[]>([]);

  // Modal de creación de canal
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [createModalType, setCreateModalType] = useState<'client' | 'group' | 'dm'>('client');

  // Toast
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const showToast = (text: string) => {
    setToastMessage(text);
    setTimeout(() => {
      setToastMessage((prev) => (prev === text ? null : prev));
    }, 4000);
  };

  // Redirigir a login si no hay sesión, o al hub si el usuario no tiene permisos para Chat
  useEffect(() => {
    if (!authLoading) {
      if (!user) {
        router.replace('/login');
      } else if (user.role === 'employee' && !canUserAccessHubApp(user, 'chat')) {
        router.replace('/hub');
      }
    }
  }, [user, authLoading, router]);

  // Cargar canales y empresas
  useEffect(() => {
    const initData = async () => {
      const chans = await ChatService.getChannels();
      setChannels(chans);

      const actions = await ChatService.getActionItems(user?.id);
      setActionItems(actions);

      // Cargar empresas
      try {
        const cachedComp = localStorage.getItem('bug_clockify_cache_companies');
        if (cachedComp) {
          setCompanies(JSON.parse(cachedComp));
        } else {
          setCompanies(MOCK_COMPANIES);
        }
      } catch {
        setCompanies(MOCK_COMPANIES);
      }

      // Cargar perfiles
      try {
        const cachedProf = localStorage.getItem('bug_clockify_cache_profiles');
        if (cachedProf) {
          setProfiles(JSON.parse(cachedProf));
        } else {
          setProfiles(MOCK_PROFILES);
        }
      } catch {
        setProfiles(MOCK_PROFILES);
      }
    };

    initData();
  }, [user?.id]);

  // Cargar mensajes cuando cambia el canal activo
  useEffect(() => {
    if (!selectedChannelId) return;

    const loadMsgs = async () => {
      const msgs = await ChatService.getMessages(selectedChannelId);
      setMessages(msgs);
      ChatService.markChannelRead(selectedChannelId);

      // Actualizar contador no leídos en estado
      setChannels((prev) =>
        prev.map((c) => (c.id === selectedChannelId ? { ...c, unread_count: 0 } : c))
      );
    };

    loadMsgs();
  }, [selectedChannelId]);

  // Recargar todos los action items y fijados
  const refreshGlobalItems = async () => {
    const actions = await ChatService.getActionItems(user?.id);
    setActionItems(actions);

    const allChans = await ChatService.getChannels();
    setChannels(allChans);

    // Recopilar todos los mensajes fijados de todos los canales
    const allStoredMsgs: ChatMessage[] = [];
    for (const c of allChans) {
      const msgs = await ChatService.getMessages(c.id);
      allStoredMsgs.push(...msgs);
    }
    setPinnedMessages(allStoredMsgs.filter((m) => m.is_pinned));
  };

  useEffect(() => {
    refreshGlobalItems();
  }, [selectedChannelId]);

  // Suscripción Supabase Realtime si el canal de postgres está disponible
  useEffect(() => {
    try {
      const supabase = createClient();
      const subscription = supabase
        .channel('messages_realtime_chat')
        .on(
          'postgres_changes',
          { event: '*', schema: 'public', table: 'messages' },
          (payload) => {
            // Si el mensaje es para el canal actual, recargar mensajes
            if (selectedChannelId && payload.new && (payload.new as any).channel_id === selectedChannelId) {
              ChatService.getMessages(selectedChannelId).then(setMessages);
            }
            refreshGlobalItems();
          }
        )
        .subscribe();

      return () => {
        supabase.removeChannel(subscription);
      };
    } catch {}
  }, [selectedChannelId]);

  // Manejar selección de canal
  const handleSelectChannel = (channelId: string) => {
    setSelectedChannelId(channelId);
    setIsSummaryActive(false);
  };

  // Manejar selección de "Mi Resumen"
  const handleSelectSummary = () => {
    setIsSummaryActive(true);
    setSelectedChannelId(null);
    setActiveRailTab('summary');
    refreshGlobalItems();
  };

  // Manejar tabs del Rail
  const handleSelectRailTab = (tab: 'summary' | 'clients' | 'groups' | 'dms') => {
    setActiveRailTab(tab);
    if (tab === 'summary') {
      handleSelectSummary();
    } else if (tab === 'clients') {
      const firstClient = channels.find((c) => c.type === 'client');
      if (firstClient) handleSelectChannel(firstClient.id);
    } else if (tab === 'groups') {
      const firstGroup = channels.find((c) => c.type === 'group');
      if (firstGroup) handleSelectChannel(firstGroup.id);
    } else if (tab === 'dms') {
      const firstDm = channels.find((c) => c.type === 'dm');
      if (firstDm) handleSelectChannel(firstDm.id);
    }
  };

  // Enviar mensaje
  const handleSendMessage = async (
    content: string,
    isActionItem: boolean,
    assignedTo?: string | null,
    priority: 'normal' | 'urgent' = 'normal'
  ) => {
    if (!selectedChannelId) return;

    const channel = channels.find((c) => c.id === selectedChannelId);
    const senderName = user?.full_name || 'Alejandro Ramos';

    let assignedName: string | undefined;
    if (assignedTo === 'current_user' || assignedTo === user?.id) {
      assignedName = senderName;
    } else if (assignedTo) {
      const p = profiles.find((prof) => prof.id === assignedTo);
      assignedName = p?.full_name;
    }

    const newMsg = await ChatService.sendMessage(
      selectedChannelId,
      content,
      user?.id || 'current_user',
      senderName,
      isActionItem,
      assignedTo,
      assignedName,
      priority,
      channel?.name,
      channel?.company?.name
    );

    setMessages((prev) => [...prev, newMsg]);
    refreshGlobalItems();

    if (isActionItem) {
      showToast(`Tarea registrada en #${channel?.name} para ${assignedName || 'el equipo'}`);
      
      // Integración con el panel global de notificaciones
      addNotification({
        title: `Nueva Tarea en #${channel?.name}`,
        message: `Asignada por ${senderName}: "${content.slice(0, 80)}"`,
        source: 'taskflow',
        urgency: priority === 'urgent' ? 'alta' : 'normal',
        link: '/apps/chat',
      });
    }
  };

  // Conmutar completado de tarea
  const handleToggleCompleteActionItem = async (messageId: string, currentStatus: boolean) => {
    const nextStatus = !currentStatus;
    await ChatService.toggleActionItemCompleted(messageId, nextStatus);

    // Actualizar estados reactivos
    setMessages((prev) =>
      prev.map((m) => (m.id === messageId ? { ...m, is_completed: nextStatus } : m))
    );
    setActionItems((prev) =>
      prev.map((m) => (m.id === messageId ? { ...m, is_completed: nextStatus } : m))
    );

    showToast(nextStatus ? 'Tarea marcada como revisada y completada' : 'Tarea reabierta');
  };

  // Conmutar fijado de mensaje
  const handleTogglePinMessage = async (messageId: string, currentStatus: boolean) => {
    const nextStatus = !currentStatus;
    await ChatService.toggleMessagePinned(messageId, nextStatus);

    setMessages((prev) =>
      prev.map((m) => (m.id === messageId ? { ...m, is_pinned: nextStatus } : m))
    );
    refreshGlobalItems();

    showToast(nextStatus ? 'Mensaje fijado como importante' : 'Mensaje desfijado');
  };

  // Convertir mensaje ordinario en tarea
  const handleConvertToTask = async (
    messageId: string,
    assignedTo: string,
    assignedName: string
  ) => {
    await ChatService.convertToTask(messageId, assignedTo, assignedName);
    const msgs = await ChatService.getMessages(selectedChannelId || '');
    setMessages(msgs);
    refreshGlobalItems();
    showToast(`Mensaje convertido en tarea para ${assignedName}`);
  };

  // Crear nuevo canal
  const handleCreateChannel = async (
    name: string,
    type: 'client' | 'group' | 'dm',
    companyId?: string | null,
    description?: string
  ) => {
    const newChan = await ChatService.createChannel(
      name,
      type,
      companyId,
      description,
      user?.id
    );

    setChannels((prev) => [...prev, newChan]);
    handleSelectChannel(newChan.id);
    showToast(`Canal #${newChan.name} creado con éxito`);
  };

  const selectedChannel = channels.find((c) => c.id === selectedChannelId) || null;
  const pendingCount = actionItems.filter((t) => !t.is_completed).length;

  if (authLoading || !user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white">
        <div className="flex flex-col items-center gap-3">
          <div className="h-10 w-10 animate-spin rounded-full border-4 border-[#D8CFF0] border-t-[#8E0E75]" />
          <p className="text-xs font-bold uppercase tracking-wider text-[#292929]">
            Cargando Brain Up Comms...
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-[calc(100vh-5rem)] flex flex-col bg-white overflow-hidden font-sans w-full">

      {/* Notificación Toast Flotante */}
      {toastMessage && (
        <div className="fixed bottom-5 right-5 z-50 max-w-md bg-white border border-[#8E0E75] p-3.5 rounded-sm shadow-xl flex items-center gap-3 animate-in fade-in slide-in-from-bottom-3 duration-300">
          <div className="p-1 rounded-full bg-emerald-50 text-emerald-700 shrink-0">
            <CheckCircle2 className="h-4 w-4 text-emerald-600" />
          </div>
          <p className="text-xs font-bold text-[#292929] leading-tight flex-1">
            {toastMessage}
          </p>
        </div>
      )}

      {/* Layout Slack de Doble Columna Izquierda + Lienzo Blanco (Zero Scroll Viewport) */}
      <div className="flex-1 flex overflow-hidden w-full max-w-none">
        
        {/* Columna 1: Rail estrecho de iconos (64px) */}
        <RailSidebar
          activeTab={activeRailTab}
          onSelectTab={handleSelectRailTab}
          pendingCount={pendingCount}
          currentUser={user}
        />

        {/* Columna 2: Navegación de Canales (260px) en degradado corporativo */}
        <ChannelsSidebar
          channels={channels}
          selectedChannelId={selectedChannelId}
          isSummaryActive={isSummaryActive}
          onSelectSummary={handleSelectSummary}
          onSelectChannel={handleSelectChannel}
          onOpenCreateChannelModal={(type) => {
            setCreateModalType(type);
            setIsCreateModalOpen(true);
          }}
          pendingActionItemsCount={pendingCount}
        />

        {/* Área Central: Lienzo de Chat o Dashboard Anti-Ruido "Mi Resumen" */}
        <main className="flex-1 flex flex-col overflow-hidden bg-white">
          {isSummaryActive ? (
            <SummaryDashboard
              currentUser={user}
              channels={channels}
              actionItems={actionItems}
              pinnedMessages={pinnedMessages}
              onToggleCompleteActionItem={handleToggleCompleteActionItem}
              onNavigateToChannel={handleSelectChannel}
            />
          ) : selectedChannel ? (
            <ChatView
              channel={selectedChannel}
              messages={messages}
              currentUser={user}
              profiles={profiles}
              onSendMessage={handleSendMessage}
              onToggleCompleteActionItem={handleToggleCompleteActionItem}
              onTogglePinMessage={handleTogglePinMessage}
              onConvertToTask={handleConvertToTask}
            />
          ) : (
            <div className="flex-1 flex items-center justify-center bg-white text-center p-8">
              <p className="text-xs font-bold text-slate-400">
                Selecciona un canal o ve a &quot;Mi Resumen&quot; para comenzar.
              </p>
            </div>
          )}
        </main>

      </div>

      {/* Modal de Creación de Canal / DM */}
      <CreateChannelModal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        type={createModalType}
        companies={companies}
        profiles={profiles}
        onCreateChannel={handleCreateChannel}
      />
    </div>
  );
}

export default function BrainUpChatPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center bg-white">
          <div className="flex flex-col items-center gap-3">
            <div className="h-10 w-10 animate-spin rounded-full border-4 border-[#D8CFF0] border-t-[#8E0E75]" />
            <p className="text-xs font-bold uppercase tracking-wider text-[#292929]">
              Cargando Brain Up Comms...
            </p>
          </div>
        </div>
      }
    >
      <BrainUpChatContent />
    </Suspense>
  );
}
