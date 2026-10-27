'use client';

import React, { useState, useRef } from 'react';
import { 
  Upload, 
  FileVideo, 
  X, 
  Sparkles, 
  Globe2, 
  Stethoscope, 
  BookMarked, 
  CheckCircle2, 
  Flame, 
  AlertCircle,
  HelpCircle
} from 'lucide-react';
import { notify } from '@/lib/feedback';
import { SubtitulosJob } from '@/types/subtitulos';

interface VideoUploadCardProps {
  onJobCreated: (job: SubtitulosJob) => void;
}

export function VideoUploadCard({ onJobCreated }: VideoUploadCardProps) {
  const [file, setFile] = useState<File | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [topic, setTopic] = useState('');
  const [glossary, setGlossary] = useState('');
  const [targetLang, setTargetLang] = useState<'auto' | 'es' | 'en'>('auto');
  const [reviewRequired, setReviewRequired] = useState(true);
  const [burn, setBurn] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      handleFileSelected(e.dataTransfer.files[0]);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      handleFileSelected(e.target.files[0]);
    }
  };

  const handleFileSelected = (selectedFile: File) => {
    const validTypes = ['video/mp4', 'video/quicktime', 'video/x-matroska', 'video/webm', 'video/avi', 'video/mpeg'];
    const hasValidExt = /\.(mp4|mov|mkv|webm|avi)$/i.test(selectedFile.name);

    if (!validTypes.includes(selectedFile.type) && !hasValidExt) {
      notify('Por favor, selecciona un formato de vídeo válido (mp4, mov, mkv, webm, avi)', {
        type: 'warning',
      });
      return;
    }

    // Comprobar límite de 4 GB
    const maxBytes = 4096 * 1024 * 1024;
    if (selectedFile.size > maxBytes) {
      notify('El archivo supera el límite de 4 GB', { type: 'error' });
      return;
    }

    setFile(selectedFile);
  };

  const removeFile = () => {
    setFile(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const formatFileSize = (bytes: number): string => {
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
    return `${(bytes / (1024 * 1024 * 1024)).toFixed(2)} GB`;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!file) {
      notify('Selecciona o arrastra un archivo de vídeo antes de continuar', { type: 'warning' });
      return;
    }

    setIsSubmitting(true);
    setUploadProgress(15);

    try {
      const formData = new FormData();
      formData.append('file', file);
      if (topic.trim()) formData.append('topic', topic.trim());
      if (glossary.trim()) formData.append('glossary', glossary.trim());

      if (targetLang === 'es') {
        formData.append('target_lang', 'es');
      } else if (targetLang === 'en') {
        formData.append('target_lang', 'en');
      }

      formData.append('review_required', reviewRequired ? 'true' : 'false');
      formData.append('burn', burn ? 'true' : 'false');

      setUploadProgress(50);

      const res = await fetch('/api/subtitulos/jobs', {
        method: 'POST',
        body: formData,
      });

      setUploadProgress(90);

      if (!res.ok) {
        let msg = 'Error al enviar el vídeo';
        try {
          const errData = await res.json();
          msg = errData.error || errData.detail || msg;
        } catch {}
        throw new Error(msg);
      }

      const job: SubtitulosJob = await res.json();
      setUploadProgress(100);

      notify('¡Vídeo subido con éxito! Trabajo encolado en el pipeline.', {
        type: 'success',
      });

      // Reset
      removeFile();
      setTopic('');
      setGlossary('');
      onJobCreated(job);
    } catch (err: any) {
      notify(err.message || 'Error al conectar con el servicio de subtitulado', {
        type: 'error',
      });
    } finally {
      setIsSubmitting(false);
      setUploadProgress(0);
    }
  };

  return (
    <div className="rounded-2xl border-2 border-[#D8CFF0] bg-white p-6 sm:p-8 shadow-sm">
      <div className="flex items-center gap-3 mb-6">
        <div className="h-10 w-10 rounded-xl bg-[#F8F6FC] border border-[#D8CFF0] flex items-center justify-center text-[#8E0E75]">
          <FileVideo className="h-5 w-5" />
        </div>
        <div>
          <h2 className="text-xl font-black text-[#292929] tracking-tight">
            Subir nuevo vídeo
          </h2>
          <p className="text-sm text-[#4A4A4A]">
            Transcripción Whisper large-v3 · Revisión de coherencia y traducción con Claude
          </p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Zona de Drop de Vídeo */}
        <div>
          <label className="block text-sm font-bold text-[#292929] mb-2">
            Archivo de vídeo <span className="text-[#8E0E75]">*</span>
          </label>

          <input
            ref={fileInputRef}
            type="file"
            accept="video/mp4,video/quicktime,video/x-matroska,video/webm,video/avi,.mp4,.mov,.mkv,.webm,.avi"
            onChange={handleFileChange}
            className="hidden"
            id="video-upload-input"
          />

          {!file ? (
            <div
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
              onClick={() => fileInputRef.current?.click()}
              className={`border-2 border-dashed rounded-2xl p-8 text-center cursor-pointer transition-all duration-200 flex flex-col items-center justify-center gap-3 ${
                isDragging
                  ? 'border-[#8E0E75] bg-[#F8F6FC] scale-[0.99]'
                  : 'border-[#D8CFF0] bg-[#FAF8FE] hover:border-[#8E0E75] hover:bg-white'
              }`}
            >
              <div className="h-14 w-14 rounded-2xl bg-white border border-[#D8CFF0] flex items-center justify-center text-[#8E0E75] shadow-xs">
                <Upload className="h-7 w-7" />
              </div>
              <div>
                <p className="text-base font-bold text-[#292929]">
                  Haz clic para seleccionar o arrastra aquí tu vídeo
                </p>
                <p className="text-xs text-[#4A4A4A] mt-1">
                  Formatos soportados: MP4, MOV, MKV, WebM, AVI (hasta 4 GB)
                </p>
              </div>
            </div>
          ) : (
            <div className="border-2 border-[#D8CFF0] rounded-2xl p-4 bg-[#F8F6FC] flex items-center justify-between gap-4">
              <div className="flex items-center gap-3 min-w-0">
                <div className="h-12 w-12 rounded-xl bg-white border border-[#D8CFF0] flex items-center justify-center text-[#8E0E75] shrink-0 shadow-xs">
                  <FileVideo className="h-6 w-6" />
                </div>
                <div className="min-w-0">
                  <p className="text-sm font-bold text-[#292929] truncate" title={file.name}>
                    {file.name}
                  </p>
                  <p className="text-xs text-[#4A4A4A]">{formatFileSize(file.size)}</p>
                </div>
              </div>
              <button
                type="button"
                onClick={removeFile}
                className="p-2 rounded-xl hover:bg-white text-gray-400 hover:text-red-600 transition-colors"
                title="Quitar archivo"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
          )}
        </div>

        {/* Campos de Contexto (topic) y Nombres propios / Términos (glossary) */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          <div>
            <label className="block text-sm font-bold text-[#292929] mb-1.5 flex items-center gap-1.5">
              <Sparkles className="h-4 w-4 text-[#8E0E75]" />
              Contexto
            </label>
            <input
              type="text"
              value={topic}
              onChange={(e) => setTopic(e.target.value)}
              placeholder="P. ej.: Anuncio de zapatillas de running, marca Nike, tono cercano"
              className="w-full px-4 py-2.5 rounded-xl border-2 border-[#D8CFF0] bg-white text-sm text-[#292929] placeholder:text-gray-400 focus:border-[#8E0E75] focus:outline-none transition-colors"
            />
            <p className="text-xs text-[#4A4A4A] mt-1">
              Cliente, sector, tipo de vídeo y tono (mejora la revisión y traducción).
            </p>
          </div>

          <div>
            <label className="block text-sm font-bold text-[#292929] mb-1.5 flex items-center gap-1.5">
              <BookMarked className="h-4 w-4 text-[#8E0E75]" />
              Nombres propios y términos
            </label>
            <input
              type="text"
              value={glossary}
              onChange={(e) => setGlossary(e.target.value)}
              placeholder="P. ej.: Nike, Pegasus 41, ZoomX, amortiguación"
              className="w-full px-4 py-2.5 rounded-xl border-2 border-[#D8CFF0] bg-white text-sm text-[#292929] placeholder:text-gray-400 focus:border-[#8E0E75] focus:outline-none transition-colors"
            />
            <p className="text-xs text-[#4A4A4A] mt-1">
              Marcas, productos y jerga esperada, separados por comas.
            </p>
          </div>
        </div>

        {/* Selector de Idioma Destino */}
        <div>
          <label className="block text-sm font-bold text-[#292929] mb-2 flex items-center gap-1.5">
            <Globe2 className="h-4 w-4 text-[#8E0E75]" />
            Idioma destino
          </label>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {[
              { id: 'auto', label: 'Automático', desc: 'Detecta el audio y subtitula al idioma opuesto' },
              { id: 'es', label: 'Castellano (ES)', desc: 'Subtítulos finales en español' },
              { id: 'en', label: 'Inglés (EN)', desc: 'Subtítulos finales en inglés' },
            ].map((lang) => (
              <button
                key={lang.id}
                type="button"
                onClick={() => setTargetLang(lang.id as any)}
                className={`p-3.5 rounded-xl border-2 text-left transition-all ${
                  targetLang === lang.id
                    ? 'border-[#8E0E75] bg-[#F8F6FC] shadow-xs'
                    : 'border-[#D8CFF0] bg-white hover:border-[#8E0E75]'
                }`}
              >
                <div className="flex items-center justify-between mb-1">
                  <span className={`text-sm font-bold ${targetLang === lang.id ? 'text-[#8E0E75]' : 'text-[#292929]'}`}>
                    {lang.label}
                  </span>
                  {targetLang === lang.id && (
                    <CheckCircle2 className="h-4 w-4 text-[#8E0E75]" />
                  )}
                </div>
                <p className="text-xs text-[#4A4A4A]">{lang.desc}</p>
              </button>
            ))}
          </div>
        </div>

        {/* Opciones Avanzadas: Casillas */}
        <div className="p-4 rounded-xl border-2 border-[#D8CFF0] bg-[#FAF8FE] space-y-3">
          {/* Casilla Revisar antes de traducir */}
          <label className="flex items-start gap-3 cursor-pointer select-none">
            <input
              type="checkbox"
              checked={reviewRequired}
              onChange={(e) => setReviewRequired(e.target.checked)}
              className="mt-1 h-4 w-4 rounded text-[#8E0E75] focus:ring-[#8E0E75]"
            />
            <div>
              <span className="text-sm font-bold text-[#292929]">
                Revisar antes de traducir
              </span>
              <span className="ml-2 inline-flex items-center text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded bg-[#8E0E75] text-white">
                Recomendado
              </span>
              <p className="text-xs text-[#4A4A4A] mt-0.5">
                Pausa el trabajo tras la revisión de coherencia de Claude para validar los términos marcados como <strong className="text-amber-700">REVISAR</strong> antes de traducir y generar los vídeos.
              </p>
            </div>
          </label>

          {/* Casilla Quemar subtítulos */}
          <label className="flex items-start gap-3 cursor-pointer select-none pt-2 border-t border-[#D8CFF0]">
            <input
              type="checkbox"
              checked={burn}
              onChange={(e) => setBurn(e.target.checked)}
              className="mt-1 h-4 w-4 rounded text-[#8E0E75] focus:ring-[#8E0E75]"
            />
            <div>
              <span className="text-sm font-bold text-[#292929]">
                Incrustar subtítulos quemados en el vídeo (.mp4)
              </span>
              <p className="text-xs text-[#4A4A4A] mt-0.5">
                Genera además del vídeo con pistas seleccionables un vídeo final con los subtítulos permanentemente sobreimpresos.
              </p>
            </div>
          </label>
        </div>

        {/* Barra de progreso de subida */}
        {isSubmitting && (
          <div className="space-y-2">
            <div className="flex justify-between text-xs font-bold text-[#292929]">
              <span>Subiendo vídeo al servidor...</span>
              <span>{uploadProgress}%</span>
            </div>
            <div className="w-full bg-[#E5E0F2] rounded-full h-2.5 overflow-hidden">
              <div
                className="bg-[#8E0E75] h-2.5 rounded-full transition-all duration-300"
                style={{ width: `${uploadProgress}%` }}
              />
            </div>
          </div>
        )}

        {/* Botón de Envío */}
        <div className="flex justify-end">
          <button
            type="submit"
            disabled={!file || isSubmitting}
            className="w-full sm:w-auto px-8 py-3 rounded-xl bg-[#8E0E75] hover:bg-[#700B5C] disabled:bg-gray-300 text-white font-bold text-sm shadow-md transition-all flex items-center justify-center gap-2 cursor-pointer disabled:cursor-not-allowed"
          >
            {isSubmitting ? (
              <>
                <div className="h-4 w-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                <span>Enviando al pipeline...</span>
              </>
            ) : (
              <>
                <Sparkles className="h-4 w-4" />
                <span>Iniciar subtitulado</span>
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  );
}
