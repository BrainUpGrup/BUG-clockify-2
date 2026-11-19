import { Channel, ChatMessage } from '@/types/chat';
import { SEED_CHANNELS, SEED_MESSAGES } from './chat-mock-data';

const STORAGE_KEY_CHANNELS = 'bug_chat_channels_v1';
const STORAGE_KEY_MESSAGES = 'bug_chat_messages_v2';

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
   * Carga la lista completa de canales vía `/api/data/chat` con fallback local.
   */
  public static async getChannels(): Promise<Channel[]> {
    try {
      const res = await fetch('/api/data/chat?resource=channels', { cache: 'no-store' });
      if (res.ok) {
        const json = await res.json();
        if (json?.success && Array.isArray(json.data) && json.data.length > 0) {
          return json.data as Channel[];
        }
      }
    } catch {
      // Fallback a localStorage
    }
    return this.getStoredChannels();
  }

  /**
   * Carga mensajes de un canal específico vía `/api/data/chat`.
   */
  public static async getMessages(channelId: string): Promise<ChatMessage[]> {
    try {
      const res = await fetch(
        `/api/data/chat?resource=messages&channelId=${encodeURIComponent(channelId)}`,
        { cache: 'no-store' }
      );
      if (res.ok) {
        const json = await res.json();
        if (json?.success && Array.isArray(json.data) && json.data.length > 0) {
          return json.data as ChatMessage[];
        }
      }
    } catch {
      // Fallback
    }

    const all = this.getStoredMessages();
    return all.filter((m) => m.channel_id === channelId);
  }

  /**
   * Obtiene todos los mensajes accionables (tareas/revisiones) pendientes vía `/api/data/chat`.
   */
  public static async getActionItems(userId?: string): Promise<ChatMessage[]> {
    try {
      const res = await fetch('/api/data/chat?resource=actions', { cache: 'no-store' });
      if (res.ok) {
        const json = await res.json();
        if (json?.success && Array.isArray(json.data) && json.data.length > 0) {
          return json.data as ChatMessage[];
        }
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
   * Carga todos los mensajes fijados (pinned) en una única petición vía `/api/data/chat`.
   */
  public static async getPinnedMessages(): Promise<ChatMessage[]> {
    try {
      const res = await fetch('/api/data/chat?resource=pinned', { cache: 'no-store' });
      if (res.ok) {
        const json = await res.json();
        if (json?.success && Array.isArray(json.data) && json.data.length > 0) {
          return json.data as ChatMessage[];
        }
      }
    } catch {
      // Fallback local
    }

    const all = this.getStoredMessages();
    return all.filter((m) => m.is_pinned);
  }

  /**
   * Envía un nuevo mensaje al canal vía `POST /api/data/chat` con persistencia local inmediata.
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
    companyName?: string,
    attachments?: import('@/types/chat').ChatAttachment[]
  ): Promise<ChatMessage> {
    const newMsg: ChatMessage = {
      id:
        typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function'
          ? crypto.randomUUID()
          : 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
              const r = (Math.random() * 16) | 0;
              return (c === 'x' ? r : (r & 0x3) | 0x8).toString(16);
            }),
      channel_id: channelId,
      sender_id: senderId,
      sender_name: senderName,
      content,
      attachments: attachments && attachments.length > 0 ? attachments : undefined,
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

    try {
      await fetch('/api/data/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          resource: 'message',
          id: newMsg.id,
          channel_id: newMsg.channel_id,
          content: newMsg.content,
          is_action_item: newMsg.is_action_item,
          assigned_to: assignedTo || null,
          priority: newMsg.priority,
        }),
      });
    } catch {
      // Ignorar si no hay conexión
    }

    const all = this.getStoredMessages();
    const updated = [...all, newMsg];
    this.saveStoredMessages(updated);

    const channels = this.getStoredChannels();
    const updatedChannels = channels.map((c) =>
      c.id === channelId ? { ...c, last_message_at: newMsg.created_at } : c
    );
    this.saveStoredChannels(updatedChannels);

    return newMsg;
  }

  /**
   * Conmuta el estado de completado / revisado de una tarea.
   */
  public static async toggleActionItemCompleted(
    messageId: string,
    isCompleted: boolean
  ): Promise<void> {
    try {
      await fetch('/api/data/chat', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: messageId,
          action: 'toggle_complete',
          is_completed: isCompleted,
        }),
      });
    } catch {}

    const all = this.getStoredMessages();
    const updated = all.map((m) =>
      m.id === messageId ? { ...m, is_completed: isCompleted } : m
    );
    this.saveStoredMessages(updated);
  }

  /**
   * Conmuta la fijación de un mensaje como importante (pin).
   */
  public static async toggleMessagePinned(
    messageId: string,
    isPinned: boolean
  ): Promise<void> {
    try {
      await fetch('/api/data/chat', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: messageId,
          action: 'toggle_pin',
          is_pinned: isPinned,
        }),
      });
    } catch {}

    const all = this.getStoredMessages();
    const updated = all.map((m) =>
      m.id === messageId ? { ...m, is_pinned: isPinned } : m
    );
    this.saveStoredMessages(updated);
  }

  /**
   * Convierte un mensaje ordinario en tarea accionable.
   */
  public static async convertToTask(
    messageId: string,
    assignedTo: string,
    assignedName: string,
    priority: 'normal' | 'urgent' = 'normal'
  ): Promise<void> {
    try {
      await fetch('/api/data/chat', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: messageId,
          action: 'convert_to_task',
          assigned_to: assignedTo,
          priority,
        }),
      });
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
   * Marca el canal como leído limpiando su contador local.
   */
  public static markChannelRead(channelId: string): void {
    const channels = this.getStoredChannels();
    const updated = channels.map((c) =>
      c.id === channelId ? { ...c, unread_count: 0 } : c
    );
    this.saveStoredChannels(updated);
  }

  /**
   * Crea un nuevo canal vía `POST /api/data/chat`.
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
      const res = await fetch('/api/data/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          resource: 'channel',
          name: newChan.name,
          type: newChan.type,
          company_id: companyId || null,
        }),
      });
      if (res.ok) {
        const json = await res.json();
        if (json?.channel?.id) {
          newChan.id = json.channel.id;
        }
      }
    } catch {}

    const channels = this.getStoredChannels();
    const updated = [...channels, newChan];
    this.saveStoredChannels(updated);

    return newChan;
  }
}
