import { NextRequest, NextResponse } from 'next/server';
import { getSlackConfig, SLACK_TASK_MODAL_ID, SLACK_TASK_SHORTCUT_ID } from '@/lib/slack/config';
import { verifySlackSignature } from '@/lib/slack/verify';
import { getBotInstallation, resolveProfileId, slackApi, SlackApiResponse } from '@/lib/slack/client';
import { createAdminSupabaseClient } from '@/lib/supabase/admin';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

interface TaskMetadata {
  channel: string;
  ts: string;
  text: string;
  author: string;
}

/**
 * Interactivity de Slack:
 *  - message_action "Convertir en tarea (Brain Up)" -> abre el modal
 *  - view_submission del modal -> crea la fila en slack_tasks y avisa en el hilo
 */
export async function POST(req: NextRequest) {
  const rawBody = await req.text();
  const { signingSecret } = getSlackConfig();

  if (
    !verifySlackSignature(
      signingSecret,
      rawBody,
      req.headers.get('x-slack-request-timestamp'),
      req.headers.get('x-slack-signature')
    )
  ) {
    return NextResponse.json({ error: 'invalid_signature' }, { status: 401 });
  }

  const payload = JSON.parse(new URLSearchParams(rawBody).get('payload') || '{}');
  const install = await getBotInstallation(payload.team?.id);
  if (!install) return new NextResponse(null, { status: 200 });

  if (payload.type === 'message_action' && payload.callback_id === SLACK_TASK_SHORTCUT_ID) {
    return openTaskModal(payload, install.token);
  }

  if (payload.type === 'view_submission' && payload.view?.callback_id === SLACK_TASK_MODAL_ID) {
    return createTask(payload, install.teamId, install.token);
  }

  return new NextResponse(null, { status: 200 });
}

async function openTaskModal(payload: any, token: string) {
  const channelId: string = payload.channel?.id;
  const supabase = createAdminSupabaseClient();
  const { data: link } = await supabase
    .from('slack_channel_links')
    .select('slack_channel_id')
    .eq('slack_channel_id', channelId)
    .maybeSingle();

  if (!link) {
    await fetch(payload.response_url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        response_type: 'ephemeral',
        text: 'Este canal no está vinculado a ningún cliente en Brain Up Hub. Pide al coordinador que lo vincule.',
      }),
    });
    return new NextResponse(null, { status: 200 });
  }

  const metadata: TaskMetadata = {
    channel: channelId,
    ts: payload.message.ts,
    text: (payload.message.text || '').slice(0, 1500),
    author: payload.message.user || payload.user.id,
  };

  await slackApi(
    'views.open',
    {
      trigger_id: payload.trigger_id,
      view: {
        type: 'modal',
        callback_id: SLACK_TASK_MODAL_ID,
        private_metadata: JSON.stringify(metadata),
        title: { type: 'plain_text', text: 'Nueva tarea' },
        submit: { type: 'plain_text', text: 'Crear tarea' },
        close: { type: 'plain_text', text: 'Cancelar' },
        blocks: [
          {
            type: 'section',
            text: { type: 'mrkdwn', text: `>${metadata.text.slice(0, 280) || '(mensaje sin texto)'}` },
          },
          {
            type: 'input',
            block_id: 'assignee',
            label: { type: 'plain_text', text: 'Responsable' },
            element: { type: 'users_select', action_id: 'value', initial_user: payload.user.id },
          },
          {
            type: 'input',
            block_id: 'priority',
            label: { type: 'plain_text', text: 'Prioridad' },
            element: {
              type: 'static_select',
              action_id: 'value',
              initial_option: { text: { type: 'plain_text', text: 'Normal' }, value: 'normal' },
              options: [
                { text: { type: 'plain_text', text: 'Normal' }, value: 'normal' },
                { text: { type: 'plain_text', text: 'Urgente' }, value: 'urgent' },
              ],
            },
          },
          {
            type: 'input',
            block_id: 'due_date',
            optional: true,
            label: { type: 'plain_text', text: 'Fecha límite' },
            element: { type: 'datepicker', action_id: 'value' },
          },
        ],
      },
    },
    token
  );

  return new NextResponse(null, { status: 200 });
}

async function createTask(payload: any, teamId: string, token: string) {
  const meta = JSON.parse(payload.view.private_metadata) as TaskMetadata;
  const values = payload.view.state.values;
  const assignee: string = values.assignee.value.selected_user;
  const priority: string = values.priority.value.selected_option?.value || 'normal';
  const dueDate: string | null = values.due_date?.value?.selected_date || null;

  const [assigneeProfileId, permalinkRes] = await Promise.all([
    resolveProfileId(assignee, teamId, token),
    slackApi<SlackApiResponse & { permalink: string }>('chat.getPermalink', { channel: meta.channel, message_ts: meta.ts }, token).catch(
      () => null
    ),
  ]);

  const supabase = createAdminSupabaseClient();
  const { error } = await supabase.from('slack_tasks').upsert(
    {
      slack_channel_id: meta.channel,
      message_ts: meta.ts,
      text: meta.text,
      permalink: permalinkRes?.permalink || null,
      created_by_slack_user_id: payload.user.id,
      created_by_name: payload.user.name || null,
      assignee_slack_user_id: assignee,
      assignee_profile_id: assigneeProfileId,
      priority,
      due_date: dueDate,
    },
    { onConflict: 'slack_channel_id,message_ts,assignee_slack_user_id' }
  );

  if (error) {
    return NextResponse.json({
      response_action: 'errors',
      errors: { assignee: 'No se pudo guardar la tarea en Brain Up Hub. Inténtalo de nuevo.' },
    });
  }

  const hubNotice = assigneeProfileId ? '' : ' (sin perfil vinculado en Brain Up Hub)';
  await slackApi(
    'chat.postMessage',
    {
      channel: meta.channel,
      thread_ts: meta.ts,
      text: `Tarea asignada a <@${assignee}>${priority === 'urgent' ? ' - URGENTE' : ''}${hubNotice}.`,
    },
    token
  ).catch(() => null);

  return NextResponse.json({ response_action: 'clear' });
}
