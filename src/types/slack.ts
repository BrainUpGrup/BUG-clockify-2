import { MessagePriority } from './chat';

export type SlackChannelKind = 'client' | 'group';

export interface SlackChannelLink {
  slack_channel_id: string;
  team_id: string;
  name: string;
  kind: SlackChannelKind;
  company_id: string | null;
  is_archived: boolean;
  last_message_at: string | null;
}

export interface SlackMessageRow {
  slack_channel_id: string;
  ts: string;
  thread_ts: string | null;
  slack_user_id: string | null;
  user_name: string | null;
  text: string;
  permalink: string | null;
  is_pinned: boolean;
  pinned_at: string | null;
  posted_at: string;
}

export interface SlackTaskRow {
  id: string;
  slack_channel_id: string;
  message_ts: string;
  text: string;
  permalink: string | null;
  created_by_slack_user_id: string;
  created_by_name: string | null;
  assignee_slack_user_id: string;
  assignee_profile_id: string | null;
  priority: MessagePriority;
  due_date: string | null;
  is_completed: boolean;
  completed_at: string | null;
  created_at: string;
}

/**
 * Respuesta de GET /api/slack/summary para el panel "Mi Resumen".
 * Mantiene los nombres de campos que ya usa SummaryDashboard.
 */
export interface SlackSummary {
  tasks: Array<{
    id: string;
    channel_id: string;
    channel_name: string;
    company_name: string | null;
    content: string;
    sender_name: string | null;
    priority: MessagePriority;
    is_completed: boolean;
    created_at: string;
    permalink: string | null;
  }>;
  clientChannels: Array<{
    id: string;
    name: string;
    company_id: string | null;
    company_name: string | null;
    unread_count: number;
    last_message_at: string | null;
    url: string;
  }>;
  pinned: Array<{
    channel_id: string;
    channel_name: string;
    content: string;
    created_at: string;
    permalink: string | null;
  }>;
}
