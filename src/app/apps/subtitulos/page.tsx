'use client';

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/context/auth-context';
import { canUserAccessHubApp } from '@/lib/hub-apps';
import { flagAccessDenied } from '@/lib/feedback';
import { SubtitulosJob } from '@/types/subtitulos';
import { VideoUploadCard } from '@/components/subtitulos/video-upload-card';
import { JobCard } from '@/components/subtitulos/job-card';
import { ReviewModal } from '@/components/subtitulos/review-modal';
import { ServiceStatusBadge } from '@/components/subtitulos/service-status-badge';
import { 
  FileVideo, 
  ArrowLeft, 
  RotateCw, 
  Clock, 
  CheckCircle2, 
  AlertTriangle, 
  Sparkles,
  Inbox,
  MessageSquare,
  PauseCircle,
  ShieldCheck,
  Cpu,
  ArrowRight,
  Code2,
  ChevronDown,
  ChevronUp
} from 'lucide-react';

export default function SubtitulosPage() {
  const router = useRouter();
  const { user, isLoading: authLoading } = useAuth();

  const [jobs, setJobs] = useState<SubtitulosJob[]>([]);
  const [loadingJobs, setLoadingJobs] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [activeFilter, setActiveFilter] = useState<'all' | 'active' | 'review' | 'completed'>('all');

  // Modal de revisión de subtítulos
  const [reviewJob, setReviewJob] = useState<SubtitulosJob | null>(null);

  // Toggle para ver la consola técnica / banco de pruebas aunque esté en mantenimiento
  const [showDevConsole, setShowDevConsole] = useState(false);

  // Redirigir a login si no hay sesión, o al hub si el usuario no tiene permisos
  useEffect(() => {
    if (!authLoading) {
      if (!user) {
        router.replace('/login');
      } else if (user.role === 'employee' && !canUserAccessHubApp(user, 'subtitulos')) {
        flagAccessDenied('No tienes acceso a Subtitulado de vídeos. Pídeselo a tu coordinadora.');
        router.replace('/hub');
      }
    }
  }, [user, authLoading, router]);

  // Cargar lista de trabajos
  const fetchJobs = useCallback(async (silent = false) => {
    if (!silent) setIsRefreshing(true);
    try {
      const res = await fetch('/api/subtitulos/jobs', { cache: 'no-store' });
      if (res.ok) {
        const data = await res.json();
        setJobs(Array.isArray(data) ? data : []);
      }
    } catch (err) {
      console.warn('Error fetching subtitulos jobs:', err);
    } finally {
      setLoadingJobs(false);
      if (!silent) setIsRefreshing(false);
    }
  }, []);

  // Carga inicial sólo si se abre la consola técnica o en segundo plano discreto
  useEffect(() => {
    if (showDevConsole) {
      fetchJobs();
    }
  }, [showDevConsole, fetchJobs]);

  // Polling automático cada 5 segundos si hay trabajos en curso y la consola técnica está abierta
  useEffect(() => {
    if (!showDevConsole) return;

    const hasActiveJobs = jobs.some(
      (j) => j.status === 'queued' || j.status === 'processing'
    );

    if (!hasActiveJobs) return;

    const interval = setInterval(() => {
      fetchJobs(true);
    }, 5000);

    return () => clearInterval(interval);
  }, [jobs, showDevConsole, fetchJobs]);

  // Handlers para actualizar trabajos
  const handleJobCreated = (newJob: SubtitulosJob) => {
    setJobs((prev) => [newJob, ...prev]);
    setActiveFilter('all');
  };

  const handleJobUpdated = (updatedJob: SubtitulosJob) => {
    setJobs((prev) =>
      prev.map((j) => (j.id === updatedJob.id ? updatedJob : j))
    );
  };

  const handleJobDeleted = (deletedId: string) => {
    setJobs((prev) => prev.filter((j) => j.id !== deletedId));
  };

  const handleOpenReview = (job: SubtitulosJob) => {
    setReviewJob(job);
  };

  const handleReviewApproved = (updatedJob: SubtitulosJob) => {
    handleJobUpdated(updatedJob);
    fetchJobs(true);
  };

  // Contadores para filtros
  const counts = useMemo(() => {
    const total = jobs.length;
    const active = jobs.filter((j) => j.status === 'queued' || j.status === 'processing').length;
    const review = jobs.filter((j) => j.status === 'awaiting_review').length;
    const completed = jobs.filter((j) => j.status === 'completed').length;
    return { total, active, review, completed };
  }, [jobs]);

  // Filtrado de la lista
  const filteredJobs = useMemo(() => {
    return jobs.filter((job) => {
      if (activeFilter === 'active') return job.status === 'queued' || job.status === 'processing';
      if (activeFilter === 'review') return job.status === 'awaiting_review';
      if (activeFilter === 'completed') return job.status === 'completed';
      return true;
    });
  }, [jobs, activeFilter]);

  if (authLoading || !user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#FFFFFF]">
        <div className="flex flex-col items-center gap-3">
          <div className="h-10 w-10 animate-spin rounded-full border-4 border-[#D8CFF0] border-t-[#8E0E75]" />
          <p className="text-xs font-bold uppercase tracking-wider text-[#292929]">
            Cargando Subtitulado de vídeos...
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col w-full font-sans">
      <main className="page-transition flex-1 w-full max-w-[1550px] mx-auto px-4 sm:px-8 lg:px-12 py-6 sm:py-8 space-y-8">
        
        {/* Barra superior con Volver al Hub, Título y Estado */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-[#D8CFF0]">
          <div>
            <Link
              href="/hub"
              className="inline-flex items-center gap-1.5 text-xs font-bold text-[#8E0E75] hover:text-[#700B5C] mb-2 transition-colors"
            >
              <ArrowLeft className="h-3.5 w-3.5" />
              <span>Volver al HUB de aplicaciones</span>
            </Link>
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-xl bg-amber-50 border-2 border-amber-300 flex items-center justify-center text-amber-800">
                <FileVideo className="h-6 w-6" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h1 className="text-2xl sm:text-3xl font-black text-[#292929] tracking-tight">
                    Subtitulado de vídeos
                  </h1>
                  <span className="px-2.5 py-0.5 rounded-full text-xs font-bold uppercase tracking-wider bg-amber-100 text-amber-900 border border-amber-300">
                    Modo Mantenimiento
                  </span>
                </div>
                <p className="text-xs sm:text-sm text-[#4A4A4A] mt-0.5">
                  Pipeline automatizado Whisper large-v3 + Claude + ffmpeg · Pausa técnica preventiva
                </p>
              </div>
            </div>
          </div>

          <ServiceStatusBadge />
        </div>

        {/* TARJETA PRINCIPAL DE MODO MANTENIMIENTO */}
        <div className="relative overflow-hidden rounded-3xl border-2 border-amber-200 bg-gradient-to-br from-amber-50/70 via-white to-[#F8F6FC] p-8 sm:p-10 shadow-sm">
          <div className="relative z-10 max-w-3xl space-y-5">
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-xl bg-amber-100 text-amber-900 border border-amber-300 text-xs font-bold">
              <PauseCircle className="h-4 w-4 text-amber-700" />
              <span>Pausa técnica por optimización de costes</span>
            </div>

            <h2 className="text-2xl sm:text-3xl font-black text-[#292929] tracking-tight leading-snug">
              Este apartado está pausado temporalmente para evitar costes recurrentes de API.
            </h2>

            <p className="text-sm sm:text-base text-[#4A4A4A] leading-relaxed">
              Actualmente no disponemos de un cliente con volumen recurrente de subtitulado que justifique el coste continuo de la API de IA (Claude / Anthropic). Para cualquier necesidad puntual de transcripción o subtitulado, el equipo canalizará las solicitudes directamente a través de nuestro <strong className="text-[#8E0E75]">Brain Up Chat</strong>.
            </p>

            {/* Botones de acción directos */}
            <div className="flex flex-wrap items-center gap-4 pt-2">
              <Link
                href="/apps/chat"
                className="inline-flex items-center gap-2 px-5 py-3 rounded-xl bg-[#8E0E75] hover:bg-[#700B5C] text-white font-bold text-sm shadow-md hover:shadow-lg transition-all cursor-pointer group"
              >
                <MessageSquare className="h-4 w-4" />
                <span>Ir al Chat de Brain Up</span>
                <ArrowRight className="h-4 w-4 group-hover:translate-x-1 transition-transform" />
              </Link>

              <Link
                href="/hub"
                className="inline-flex items-center gap-2 px-5 py-3 rounded-xl bg-white hover:bg-[#F8F6FC] border-2 border-[#D8CFF0] text-[#292929] font-bold text-sm transition-all cursor-pointer"
              >
                <ArrowLeft className="h-4 w-4 text-[#8E0E75]" />
                <span>Volver al HUB</span>
              </Link>
            </div>
          </div>

          <div className="absolute right-0 top-1/2 -translate-y-1/2 translate-x-12 hidden md:block opacity-10 pointer-events-none">
            <FileVideo className="h-96 w-96 text-[#8E0E75]" />
          </div>
        </div>

        {/* ESTADO DE LA ARQUITECTURA: LISTA PARA ACTIVARSE */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-lg font-black text-[#292929] tracking-tight">
                Arquitectura 100% desarrollada y lista para desplegar
              </h3>
              <p className="text-xs sm:text-sm text-[#4A4A4A]">
                Tan pronto como entre un cliente con necesidad de subtitulado constante, el servicio se reactivará al instante simplemente conectando la clave de API.
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="p-5 rounded-2xl border-2 border-[#D8CFF0] bg-white space-y-2">
              <div className="h-9 w-9 rounded-xl bg-[#F8F6FC] border border-[#D8CFF0] flex items-center justify-center text-[#8E0E75]">
                <Cpu className="h-5 w-5" />
              </div>
              <h4 className="font-black text-sm text-[#292929]">Whisper large-v3</h4>
              <p className="text-xs text-[#4A4A4A] leading-relaxed">
                Extracción de audio local con ffmpeg y transcripción fonética de máxima fidelidad con marcas de tiempo precisas.
              </p>
              <div className="pt-1 flex items-center gap-1.5 text-[11px] font-bold text-emerald-700">
                <CheckCircle2 className="h-3.5 w-3.5" />
                <span>Probado y operativo</span>
              </div>
            </div>

            <div className="p-5 rounded-2xl border-2 border-[#D8CFF0] bg-white space-y-2">
              <div className="h-9 w-9 rounded-xl bg-[#F8F6FC] border border-[#D8CFF0] flex items-center justify-center text-[#8E0E75]">
                <Sparkles className="h-5 w-5" />
              </div>
              <h4 className="font-black text-sm text-[#292929]">Revisión Claude 3.5</h4>
              <p className="text-xs text-[#4A4A4A] leading-relaxed">
                Corrección semántica adaptada al sector (marketing, tech, médico, etc.), glosarios de términos y traducción ES ↔ EN.
              </p>
              <div className="pt-1 flex items-center gap-1.5 text-[11px] font-bold text-amber-700">
                <PauseCircle className="h-3.5 w-3.5" />
                <span>Pausado (control de saldo)</span>
              </div>
            </div>

            <div className="p-5 rounded-2xl border-2 border-[#D8CFF0] bg-white space-y-2">
              <div className="h-9 w-9 rounded-xl bg-[#F8F6FC] border border-[#D8CFF0] flex items-center justify-center text-[#8E0E75]">
                <ShieldCheck className="h-5 w-5" />
              </div>
              <h4 className="font-black text-sm text-[#292929]">Aprobación Humana</h4>
              <p className="text-xs text-[#4A4A4A] leading-relaxed">
                Revisión interactiva con resaltado de puntos dudosos (`REVISAR`), edición de bloques y visto bueno antes de traducir.
              </p>
              <div className="pt-1 flex items-center gap-1.5 text-[11px] font-bold text-emerald-700">
                <CheckCircle2 className="h-3.5 w-3.5" />
                <span>UI integrada</span>
              </div>
            </div>

            <div className="p-5 rounded-2xl border-2 border-[#D8CFF0] bg-white space-y-2">
              <div className="h-9 w-9 rounded-xl bg-[#F8F6FC] border border-[#D8CFF0] flex items-center justify-center text-[#8E0E75]">
                <FileVideo className="h-5 w-5" />
              </div>
              <h4 className="font-black text-sm text-[#292929]">Exportación Multi-formato</h4>
              <p className="text-xs text-[#4A4A4A] leading-relaxed">
                Descarga directa en SRT, VTT, TXT y vídeo MP4 con subtítulos incrustados mediante codificación local ffmpeg.
              </p>
              <div className="pt-1 flex items-center gap-1.5 text-[11px] font-bold text-emerald-700">
                <CheckCircle2 className="h-3.5 w-3.5" />
                <span>Rutas API protegidas</span>
              </div>
            </div>
          </div>
        </div>

        {/* ACCORDEÓN: BANCO DE PRUEBAS / CONSOLA TÉCNICA */}
        <div className="rounded-2xl border-2 border-[#D8CFF0] bg-white overflow-hidden shadow-xs">
          <button
            type="button"
            onClick={() => setShowDevConsole(!showDevConsole)}
            className="w-full px-6 py-4 flex items-center justify-between text-left hover:bg-[#F8F6FC] transition-colors cursor-pointer"
          >
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-xl bg-[#F8F6FC] text-[#8E0E75] border border-[#D8CFF0]">
                <Code2 className="h-5 w-5" />
              </div>
              <div>
                <h4 className="font-bold text-sm text-[#292929] flex items-center gap-2">
                  <span>Banco de pruebas y consola técnica</span>
                  <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full bg-gray-100 text-gray-700">
                    {showDevConsole ? 'Visible' : 'Oculto'}
                  </span>
                </h4>
                <p className="text-xs text-[#4A4A4A]">
                  Despliega la interfaz interactiva de subida, monitorización y jobs para demostraciones o tests internos.
                </p>
              </div>
            </div>

            <div className="text-[#8E0E75]">
              {showDevConsole ? <ChevronUp className="h-5 w-5" /> : <ChevronDown className="h-5 w-5" />}
            </div>
          </button>

          {showDevConsole && (
            <div className="p-6 border-t-2 border-[#D8CFF0] bg-[#F8F6FC]/50 space-y-8 animate-in fade-in duration-200">
              <div className="p-4 bg-amber-50 border border-amber-300 rounded-xl text-xs text-amber-900 flex items-start gap-3">
                <AlertTriangle className="h-4 w-4 text-amber-700 shrink-0 mt-0.5" />
                <p>
                  <strong>Atención:</strong> Para ejecutar un trabajo real desde esta consola de pruebas, la API local de FastAPI debe estar corriendo en el puerto 8000 (<code className="font-mono bg-amber-100 px-1 py-0.5 rounded">uvicorn app.main:app --port 8000</code>) y contar con saldo en Anthropic. Si se queda sin créditos, la parada de seguridad cancelará el trabajo evitando sobrecostes.
                </p>
              </div>

              {/* Layout en 2 columnas: Subida a la izquierda / Trabajos a la derecha */}
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
                
                {/* Columna Izquierda: Formulario de Subida (5 columnas en lg) */}
                <div className="lg:col-span-5 space-y-6">
                  <VideoUploadCard onJobCreated={handleJobCreated} />
                </div>

                {/* Columna Derecha: Lista de Trabajos y Monitorización (7 columnas en lg) */}
                <div className="lg:col-span-7 space-y-6">
                  
                  {/* Cabecera de la sección de trabajos */}
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div className="flex items-center gap-2">
                      <h2 className="text-xl font-black text-[#292929] tracking-tight">
                        Historial de trabajos
                      </h2>
                      <span className="px-2.5 py-0.5 rounded-full text-xs font-mono font-bold bg-[#F8F6FC] text-[#8E0E75] border border-[#D8CFF0]">
                        {jobs.length}
                      </span>
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => fetchJobs(false)}
                        disabled={isRefreshing}
                        className="px-3 py-1.5 rounded-xl border-2 border-[#D8CFF0] bg-white hover:border-[#8E0E75] text-[#8E0E75] text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                        title="Actualizar estado de trabajos"
                      >
                        <RotateCw className={`h-3.5 w-3.5 ${isRefreshing ? 'animate-spin' : ''}`} />
                        <span>Actualizar</span>
                      </button>
                    </div>
                  </div>

                  {/* Pestañas de Filtro */}
                  <div className="flex items-center gap-1.5 p-1 bg-white rounded-xl border border-[#D8CFF0] overflow-x-auto">
                    <button
                      type="button"
                      onClick={() => setActiveFilter('all')}
                      className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all whitespace-nowrap cursor-pointer ${
                        activeFilter === 'all'
                          ? 'bg-[#8E0E75] text-white shadow-xs'
                          : 'text-[#4A4A4A] hover:text-[#292929]'
                      }`}
                    >
                      Todos ({counts.total})
                    </button>

                    <button
                      type="button"
                      onClick={() => setActiveFilter('active')}
                      className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 whitespace-nowrap cursor-pointer ${
                        activeFilter === 'active'
                          ? 'bg-[#8E0E75] text-white shadow-xs'
                          : 'text-[#4A4A4A] hover:text-[#292929]'
                      }`}
                    >
                      <Clock className="h-3 w-3" />
                      <span>En proceso</span>
                      {counts.active > 0 && (
                        <span className={`px-1.5 py-0.2 rounded-full text-[10px] ${activeFilter === 'active' ? 'bg-[#700B5C] text-white' : 'bg-[#D8CFF0] text-[#8E0E75]'}`}>
                          {counts.active}
                        </span>
                      )}
                    </button>

                    <button
                      type="button"
                      onClick={() => setActiveFilter('review')}
                      className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 whitespace-nowrap cursor-pointer ${
                        activeFilter === 'review'
                          ? 'bg-amber-500 text-white shadow-xs'
                          : 'text-[#4A4A4A] hover:text-[#292929]'
                      }`}
                    >
                      <AlertTriangle className="h-3 w-3" />
                      <span>Revisión ({counts.review})</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => setActiveFilter('completed')}
                      className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 whitespace-nowrap cursor-pointer ${
                        activeFilter === 'completed'
                          ? 'bg-emerald-600 text-white shadow-xs'
                          : 'text-[#4A4A4A] hover:text-[#292929]'
                      }`}
                    >
                      <CheckCircle2 className="h-3 w-3" />
                      <span>Completados ({counts.completed})</span>
                    </button>
                  </div>

                  {/* Lista de Trabajos */}
                  {loadingJobs ? (
                    <div className="py-16 flex flex-col items-center justify-center gap-3 bg-white rounded-2xl border-2 border-[#D8CFF0]">
                      <div className="h-8 w-8 animate-spin rounded-full border-3 border-[#D8CFF0] border-t-[#8E0E75]" />
                      <p className="text-xs font-bold text-[#8E0E75] uppercase tracking-wider">
                        Consultando trabajos del servicio...
                      </p>
                    </div>
                  ) : filteredJobs.length === 0 ? (
                    <div className="py-12 text-center bg-white rounded-2xl border-2 border-dashed border-[#D8CFF0] p-8 flex flex-col items-center justify-center">
                      <div className="h-12 w-12 rounded-2xl bg-[#F8F6FC] border border-[#D8CFF0] flex items-center justify-center text-gray-400 mb-3">
                        <Inbox className="h-6 w-6" />
                      </div>
                      <h3 className="font-bold text-base text-[#292929]">
                        {activeFilter === 'all'
                          ? 'Aún no hay trabajos en la cola'
                          : 'No hay trabajos en este estado'}
                      </h3>
                      <p className="text-xs text-[#4A4A4A] mt-1 max-w-sm">
                        {activeFilter === 'all'
                          ? 'Cuando el servicio esté activo podrás subir vídeos y monitorizarlos aquí.'
                          : 'Selecciona "Todos" para ver el histórico completo.'}
                      </p>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {filteredJobs.map((job) => (
                        <JobCard
                          key={job.id}
                          job={job}
                          onOpenReview={handleOpenReview}
                          onJobUpdated={handleJobUpdated}
                          onJobDeleted={handleJobDeleted}
                        />
                      ))}
                    </div>
                  )}

                </div>

              </div>
            </div>
          )}
        </div>

      </main>

      {/* Modal de Revisión de Transcripción */}
      {reviewJob && (
        <ReviewModal
          jobId={reviewJob.id}
          originalFilename={reviewJob.original_filename}
          isOpen={!!reviewJob}
          onClose={() => setReviewJob(null)}
          onApproved={handleReviewApproved}
        />
      )}
    </div>
  );
}
