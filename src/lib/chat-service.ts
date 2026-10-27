import { createClient } from '@/lib/supabase/client';
import { Channel, ChatMessage } from '@/types/chat';
import { SEED_CHANNELS, SEED_MESSAGES } from './chat-mock-data';

const STORAGE_KEY_CHANNELS = 'bug_chat_channels_v1';
const STORAGE_KEY_MESSAGES = 'bug_chat_messages_v1';

export class ChatService {
  private static getStoredChannels(): Channel[] {
    if (typeof window === 'undefined') return SEED_CHANNELS;
    try {
      const raw = localStorage.getItem(STORAGE_KEY_CHANNELS);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
      localStorage.setItem(STORAGE_KEY_CHANNELS, JSON.stringify(SEED_CHANNELS));
      return SEED_CHANNELS;
    } catch {
      return SEED_CHANNELS;
    }
  }

  private static saveStoredChannels(channels: Channel[]): void {
    if (typeof window === 'undefined') return;
    try {
      localStorage.setItem(STORAGE_KEY_CHANNELS, JSON.stringify(channels));
    } catch (e) {
      console.warn('Error saving chat channels:', e);
    }
  }

  private static getStoredMessages(): ChatMessage[] {
    if (typeof window === 'undefined') return SEED_MESSAGES;
    try {
      const raw = localStorage.getItem(STORAGE_KEY_MESSAGES);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
      localStorage.setItem(STORAGE_KEY_MESSAGES, JSON.stringify(SEED_MESSAGES));
      return SEED_MESSAGES;
    } catch {
      return SEED_MESSAGES;
    }
  }

  private static saveStoredMessages(messages: ChatMessage[]): void {
    if (typeof window === 'undefined') return;
    try {
      localStorage.setItem(STORAGE_KEY_MESSAGES, JSON.stringify(messages));
    } catch (e) {
      console.warn('Error saving chat messages:', e);
    }
  }

  /**
   * Carga la lista completa de canales con soporte para Supabase y fallback local
   */
  public static async getChannels(): Promise<Channel[]> {
    try {
      const supabase = createClient();
      const { data, error } = await supabase
        .from('channels')
        .select('*, company:companies(*)')
        .order('created_at', { ascending: true });

      if (!error && data && data.length > 0) {
        return data as Channel[];
      }
    } catch {
      // Fallback a localStorage
    }
    return this.getStoredChannels();
  }

  /**
   * Carga mensajes de un canal específico
   */
  public static async getMessages(channelId: string): Promise<ChatMessage[]> {
    try {
      const supabase = createClient();
      const { data, error } = await supabase
        .from('messages')
        .select('*, sender:profiles(*), assignee:profiles(*)')
        .eq('channel_id', channelId)
        .order('created_at', { ascending: true });

      if (!error && data && data.length > 0) {
        return data as ChatMessage[];
      }
    } catch {
      // Fallback
    }

    const all = this.getStoredMessages();
    return all.filter((m) => m.channel_id === channelId);
  }

  /**
   * Obtiene todos los mensajes accionables (tareas/revisiones) pendientes
   */
  public static async getActionItems(userId?: string): Promise<ChatMessage[]> {
    try {
      const supabase = createClient();
      let query = supabase
        .from('messages')
        .select('*, sender:profiles(*), assignee:profiles(*)')
        .eq('is_action_item', true)
        .eq('is_completed', false)
        .order('created_at', { ascending: false });

      if (userId) {
        query = query.or(`assigned_to.eq.${userId},assigned_to.eq.current_user`);
      }

      const { data, error } = await query;
      if (!error && data && data.length > 0) {
        return data as ChatMessage[];
      }
    } catch {
      // Fallback local
    }

    const all = this.getStoredMessages();
    return all.filter((m) => {
      if (!m.is_action_item) return false;
      if (userId && m.assigned_to !== 'current_user' && m.assigned_to !== userId) return false;
      return true;
    });
  }

  /**
   * Carga todos los mensajes fijados (pinned) en una única consulta optimizada (evita N+1)
   */
  public static async getPinnedMessages(): Promise<ChatMessage[]> {
    try {
      const supabase = createClient();
      const { data, error } = await supabase
        .from('messages')
        .select('*, sender:profiles(*), assignee:profiles(*)')
        .eq('is_pinned', true)
        .order('created_at', { ascending: false });

      if (!error && data && data.length > 0) {
        return data as ChatMessage[];
      }
    } catch {
      // Fallback local
    }

    const all = this.getStoredMessages();
    return all.filter((m) => m.is_pinned);
  }

  /**
   * Envía un nuevo mensaje al canal con soporte de Realtime y persistencia
   */
  public static async sendMessage(
    channelId: string,
    content: string,
    senderId: string,
    senderName: string,
    isActionItem: boolean = false,
    assignedTo?: string | null,
    assignedName?: string,
    priority: 'normal' | 'urgent' = 'normal',
    channelName?: string,
    companyName?: string
  ): Promise<ChatMessage> {
    const newMsg: ChatMessage = {
      id: 'msg-' + Date.now() + '-' + Math.random().toString(36).slice(2, 6),
      channel_id: channelId,
      sender_id: senderId,
      sender_name: senderName,
      content,
      is_action_item: isActionItem,
      assigned_to: assignedTo,
      assigned_name: assignedName,
      priority,
      is_completed: false,
      is_pinned: false,
      created_at: new Date().toISOString(),
      channel_name: channelName,
      company_name: companyName,
    };

    // Intentar guardar en Supabase si está disponible
    try {
      const supabase = createClient();
      await supabase.from('messages').insert({
        id: newMsg.id,
        channel_id: newMsg.channel_id,
        sender_id: senderId,
        content: newMsg.content,
        is_action_item: newMsg.is_action_item,
        assigned_to: assignedTo || null,
        priority: newMsg.priority,
        is_completed: false,
        is_pinned: false,
      });
    } catch {
      // Ignorar si no hay conexión
    }

    // Persistir siempre en local para reactividad inmediata
    const all = this.getStoredMessages();
    const updated = [...all, newMsg];
    this.saveStoredMessages(updated);

    // Actualizar timestamp de canal
    const channels = this.getStoredChannels();
    const updatedChannels = channels.map((c) =>
      c.id === channelId ? { ...c, last_message_at: newMsg.created_at } : c
    );
    this.saveStoredChannels(updatedChannels);

    return newMsg;
  }

  /**
   * Conmuta el estado de completado / revisado de una tarea
   */
  public static async toggleActionItemCompleted(
    messageId: string,
    isCompleted: boolean
  ): Promise<void> {
    try {
      const supabase = createClient();
      await supabase
        .from('messages')
        .update({ is_completed: isCompleted })
        .eq('id', messageId);
    } catch {}

    const all = this.getStoredMessages();
    const updated = all.map((m) =>
      m.id === messageId ? { ...m, is_completed: isCompleted } : m
    );
    this.saveStoredMessages(updated);
  }

  /**
   * Conmuta la fijación de un mensaje como importante (pin)
   */
  public static async toggleMessagePinned(
    messageId: string,
    isPinned: boolean
  ): Promise<void> {
    try {
      const supabase = createClient();
      await supabase
        .from('messages')
        .update({ is_pinned: isPinned })
        .eq('id', messageId);
    } catch {}

    const all = this.getStoredMessages();
    const updated = all.map((m) =>
      m.id === messageId ? { ...m, is_pinned: isPinned } : m
    );
    this.saveStoredMessages(updated);
  }

  /**
   * Convierte un mensaje ordinario en tarea accionable
   */
  public static async convertToTask(
    messageId: string,
    assignedTo: string,
    assignedName: string,
    priority: 'normal' | 'urgent' = 'normal'
  ): Promise<void> {
    try {
      const supabase = createClient();
      await supabase
        .from('messages')
        .update({
          is_action_item: true,
          assigned_to: assignedTo,
          priority,
          is_completed: false,
        })
        .eq('id', messageId);
    } catch {}

    const all = this.getStoredMessages();
    const updated = all.map((m) =>
      m.id === messageId
        ? {
            ...m,
            is_action_item: true,
            assigned_to: assignedTo,
            assigned_name: assignedName,
            priority,
            is_completed: false,
          }
        : m
    );
    this.saveStoredMessages(updated);
  }

  /**
   * Marca el canal como leído limpiando su contador
   */
  public static markChannelRead(channelId: string): void {
    const channels = this.getStoredChannels();
    const updated = channels.map((c) =>
      c.id === channelId ? { ...c, unread_count: 0 } : c
    );
    this.saveStoredChannels(updated);
  }

  /**
   * Crea un nuevo canal
   */
  public static async createChannel(
    name: string,
    type: 'client' | 'group' | 'dm',
    companyId?: string | null,
    description?: string,
    createdById?: string
  ): Promise<Channel> {
    const newChan: Channel = {
      id: 'chan-' + Date.now(),
      name: name.toLowerCase().replace(/\s+/g, '-'),
      type,
      company_id: companyId || null,
      description,
      created_by: createdById,
      created_at: new Date().toISOString(),
      unread_count: 0,
      last_message_at: new Date().toISOString(),
    };

    try {
      const supabase = createClient();
      await supabase.from('channels').insert({
        id: newChan.id,
        name: newChan.name,
        type: newChan.type,
        company_id: companyId || null,
        created_by: createdById || null,
      });
    } catch {}

    const channels = this.getStoredChannels();
    const updated = [...channels, newChan];
    this.saveStoredChannels(updated);

    return newChan;
  }
}
