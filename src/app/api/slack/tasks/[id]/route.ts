import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { getBotInstallation, slackApi } from '@/lib/slack/client';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * Completa o reabre una tarea desde el Hub. La actualización va con la sesión
 * del usuario (RLS: solo el responsable o un coordinador) y se deja constancia
 * en el hilo del mensaje original en Slack.
 */
export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const supabase = createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });

  const body = (await req.json().catch(() => ({}))) as { is_completed?: boolean };
  if (typeof body.is_completed !== 'boolean') {
    return NextResponse.json({ error: 'is_completed (boolean) es obligatorio' }, { status: 400 });
  }

  const { data: task, error } = await supabase
    .from('slack_tasks')
    .update({
      is_completed: body.is_completed,
      completed_at: body.is_completed ? new Date().toISOString() : null,
      completed_by: body.is_completed ? user.id : null,
    })
    .eq('id', params.id)
    .select('slack_channel_id, message_ts')
    .maybeSingle();

  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  if (!task) return NextResponse.json({ error: 'not_found' }, { status: 404 });

  const { data: profile } = await supabase.from('profiles').select('full_name').eq('id', user.id).maybeSingle();
  const who = profile?.full_name || 'un miembro del equipo';

  try {
    const install = await getBotInstallation();
    if (install) {
      await slackApi(
        'chat.postMessage',
        {
          channel: task.slack_channel_id,
          thread_ts: task.message_ts,
          text: body.is_completed ? `Completada en Brain Up Hub por ${who}.` : `Reabierta en Brain Up Hub por ${who}.`,
        },
        install.token
      );
    }
  } catch (e) {
    console.error('[slack/tasks] aviso en hilo fallido', e);
  }

  return NextResponse.json({ ok: true });
}
