import { NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase/server';

export async function GET() {
  const tables = [
    'profiles',
    'companies',
    'time_entries',
    'hosting_services',
    'taskflow_items',
    'taskflow_lists',
    'taskflow_postits'
  ];

  const results: Record<string, boolean> = {};
  let missingCount = 0;

  try {
    const supabase = createServerSupabaseClient();

    for (const table of tables) {
      const { error } = await supabase.from(table).select('id').limit(1);
      if (error && error.code === 'PGRST205') {
        results[table] = false;
        missingCount++;
      } else {
        results[table] = true;
      }
    }

    return NextResponse.json({
      status: 'ok',
      tables: results,
      allTablesReady: missingCount === 0,
      missingCount,
      instructions: missingCount > 0 
        ? 'Ejecuta el script schema_app_and_hosting.sql en el SQL Editor de tu panel de Supabase para activar la persistencia en las tablas faltantes.'
        : 'Todas las tablas de la aplicación y hosting están conectadas y sincronizadas en Supabase.',
    });
  } catch (err: any) {
    return NextResponse.json({
      status: 'error',
      message: err?.message || 'Error consultando estado de base de datos en Supabase',
    }, { status: 500 });
  }
}
