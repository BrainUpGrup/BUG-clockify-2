import { Company, Profile } from './database';

export type ChannelType = 'client' | 'group' | 'dm';
export type MessagePriority = 'normal' | 'urgent';

export interface Channel {
  id: string;
  name: string;
  type: ChannelType;
  company_id?: string | null;
  company?: Company;
  created_by?: string;
  created_at: string;
  description?: string;
  is_private?: boolean;
  unread_count?: number;
  last_message_at?: string;
  dm_partner?: Profile;
}

export interface ChannelMember {
  id: string;
  channel_id: string;
  user_id: string;
  last_read_at: string;
}

export interface ChatAttachment {
  id: string;
  name: string;
  size: number; // Bytes
  type: 'image' | 'video' | 'file';
  url: string; // URL para descargar o visualizar
  poster_url?: string; // Fotograma póster para previsualización de vídeo o miniatura
  mime_type?: string;
  duration_seconds?: number;
}

export interface ChatMessage {
  id: string;
  channel_id: string;
  sender_id: string;
  sender?: Profile;
  sender_name?: string;
  content: string;
  attachments?: ChatAttachment[];
  is_action_item: boolean;
  assigned_to?: string | null;
  assignee?: Profile;
  assigned_name?: string;
  priority: MessagePriority;
  is_completed: boolean;
  is_pinned: boolean;
  created_at: string;
  channel_name?: string;
  company_name?: string;
}

export interface ActionItemFilter {
  status: 'all' | 'pending' | 'completed';
  channelId?: string;
  assignedTo?: string;
}
