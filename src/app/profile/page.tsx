'use client';

import React, { useState, useRef, useEffect, useCallback, ChangeEvent, DragEvent, MouseEvent as ReactMouseEvent, TouchEvent as ReactTouchEvent, WheelEvent as ReactWheelEvent } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/auth-context';
import { UserAvatar } from '@/components/ui/user-avatar';
import { 
  loadImageFromFile, 
  exportFramedAvatar, 
  formatBytes, 
  CompressedImageResult,
  FrameTransform 
} from '@/lib/image-compression';
import { 
  ArrowLeft, 
  Upload, 
  Camera, 
  CheckCircle2, 
  AlertCircle, 
  Trash2, 
  Sparkles, 
  User, 
  Building2, 
  Check, 
  RotateCcw,
  Move,
  ZoomIn,
  ZoomOut,
  ChevronUp,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Info
} from 'lucide-react';

export default function ProfilePage() {
  const router = useRouter();
  const { user, role, updateUserAvatar } = useAuth();

  const fileInputRef = useRef<HTMLInputElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const [isDraggingFile, setIsDraggingFile] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successToast, setSuccessToast] = useState<string | null>(null);

  // Imagen cargada en memoria y tamaño original
  const [loadedImage, setLoadedImage] = useState<HTMLImageElement | null>(null);
  const [originalFileSize, setOriginalFileSize] = useState<number>(0);

  // Parámetros de encuadre interactivo (Offset en píxeles y Zoom)
  const [transform, setTransform] = useState<FrameTransform>({
    offsetX: 0,
    offsetY: 25,
    zoom: 0.95,
  });

  // Resultado de compresión en tiempo real
  const [compressionResult, setCompressionResult] = useState<CompressedImageResult | null>(null);

  // Estado de arrastre del lienzo con ratón / táctil
  const [isDraggingCanvas, setIsDraggingCanvas] = useState(false);
  const dragStartRef = useRef<{ startX: number; startY: number; initOffsetX: number; initOffsetY: number }>({
    startX: 0,
    startY: 0,
    initOffsetX: 0,
    initOffsetY: 25,
  });

  const showNotification = (msg: string) => {
    setSuccessToast(msg);
    setTimeout(() => {
      setSuccessToast(null);
    }, 4500);
  };

  // Renderizado reactivo instantáneo sobre el lienzo y actualización de la previsualización
  useEffect(() => {
    if (!loadedImage || !canvasRef.current) return;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const W = loadedImage.naturalWidth || loadedImage.width;
    const H = loadedImage.naturalHeight || loadedImage.height;

    // Dimensiones del lienzo interactivo: 240x240 px, centro en (120, 120), radio de la apertura 100 px (diámetro 200 px)
    const canvasSize = 240;
    const center = canvasSize / 2;
    const circleRadius = 100;

    const fitScale = Math.max((circleRadius * 2) / W, (circleRadius * 2) / H);
    const scale = fitScale * Math.max(0.4, transform.zoom);

    const drawW = W * scale;
    const drawH = H * scale;
    const drawX = center + transform.offsetX - drawW / 2;
    const drawY = center + transform.offsetY - drawH / 2;

    // 1. Limpieza y fondo del lienzo
    ctx.clearRect(0, 0, canvasSize, canvasSize);
    ctx.fillStyle = '#0f172a';
    ctx.fillRect(0, 0, canvasSize, canvasSize);

    // 2. Dibujar imagen del usuario con filtrado de alta calidad
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = 'high';
    ctx.drawImage(loadedImage, drawX, drawY, drawW, drawH);

    // 3. Máscara de viñeta exterior fuera del círculo de corte
    ctx.save();
    ctx.fillStyle = 'rgba(15, 23, 42, 0.65)';
    ctx.beginPath();
    ctx.rect(0, 0, canvasSize, canvasSize);
    ctx.arc(center, center, circleRadius, 0, Math.PI * 2, true);
    ctx.fill();

    // 4. Anillos de guía circular (blanco interior y púrpura corporativo exterior)
    ctx.beginPath();
    ctx.arc(center, center, circleRadius, 0, Math.PI * 2);
    ctx.lineWidth = 2.5;
    ctx.strokeStyle = '#FFFFFF';
    ctx.stroke();

    ctx.beginPath();
    ctx.arc(center, center, circleRadius + 2, 0, Math.PI * 2);
    ctx.lineWidth = 1.5;
    ctx.strokeStyle = '#8E0E75';
    ctx.stroke();

    ctx.restore();

    // 5. Exportar simultáneamente el avatar a 200x200 px comprimido para los previews inferiores
    try {
      const res = exportFramedAvatar(loadedImage, originalFileSize, transform, 200, 0.78);
      setCompressionResult(res);
    } catch (e) {
      console.error('Error al exportar preview encuadrado:', e);
    }
  }, [loadedImage, transform, originalFileSize]);

  // Cargar archivo y establecer encuadre inicial con espacio para la cabeza
  const handleProcessFile = async (file: File) => {
    if (!file.type.startsWith('image/')) {
      setErrorMessage('Por favor, selecciona un archivo de imagen válido (JPG, PNG o WebP).');
      return;
    }

    setErrorMessage(null);
    setIsProcessing(true);

    try {
      const img = await loadImageFromFile(file);
      const isPortrait = (img.naturalHeight || img.height) > (img.naturalWidth || img.width);

      // Si la foto es vertical, dar 30px de margen hacia abajo para que el pelo y frente no queden cortados
      const initialOffsetY = isPortrait ? 30 : 10;
      const initialTransform: FrameTransform = {
        offsetX: 0,
        offsetY: initialOffsetY,
        zoom: 0.95,
      };

      setLoadedImage(img);
      setOriginalFileSize(file.size);
      setTransform(initialTransform);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Error al cargar la fotografía.';
      setErrorMessage(msg);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleFileChange = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      handleProcessFile(file);
    }
  };

  const handleDragOverFile = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDraggingFile(true);
  };

  const handleDragLeaveFile = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDraggingFile(false);
  };

  const handleDropFile = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDraggingFile(false);
    const file = e.dataTransfer.files?.[0];
    if (file) {
      handleProcessFile(file);
    }
  };

  // Arrastre directo con ratón sobre el lienzo
  const handleMouseDownCanvas = (e: ReactMouseEvent<HTMLCanvasElement>) => {
    setIsDraggingCanvas(true);
    dragStartRef.current = {
      startX: e.clientX,
      startY: e.clientY,
      initOffsetX: transform.offsetX,
      initOffsetY: transform.offsetY,
    };
  };

  const handleMouseMoveWindow = useCallback(
    (e: MouseEvent) => {
      if (!isDraggingCanvas) return;
      const dx = e.clientX - dragStartRef.current.startX;
      const dy = e.clientY - dragStartRef.current.startY;
      setTransform((prev) => ({
        ...prev,
        offsetX: Math.round(dragStartRef.current.initOffsetX + dx),
        offsetY: Math.round(dragStartRef.current.initOffsetY + dy),
      }));
    },
    [isDraggingCanvas]
  );

  const handleMouseUpWindow = useCallback(() => {
    setIsDraggingCanvas(false);
  }, []);

  useEffect(() => {
    if (isDraggingCanvas) {
      window.addEventListener('mousemove', handleMouseMoveWindow);
      window.addEventListener('mouseup', handleMouseUpWindow);
      return () => {
        window.removeEventListener('mousemove', handleMouseMoveWindow);
        window.removeEventListener('mouseup', handleMouseUpWindow);
      };
    }
  }, [isDraggingCanvas, handleMouseMoveWindow, handleMouseUpWindow]);

  // Arrastre táctil en dispositivos móviles / tablets
  const handleTouchStart = (e: ReactTouchEvent<HTMLCanvasElement>) => {
    const t = e.touches[0];
    if (!t) return;
    setIsDraggingCanvas(true);
    dragStartRef.current = {
      startX: t.clientX,
      startY: t.clientY,
      initOffsetX: transform.offsetX,
      initOffsetY: transform.offsetY,
    };
  };

  const handleTouchMove = (e: ReactTouchEvent<HTMLCanvasElement>) => {
    if (!isDraggingCanvas) return;
    const t = e.touches[0];
    if (!t) return;
    const dx = t.clientX - dragStartRef.current.startX;
    const dy = t.clientY - dragStartRef.current.startY;
    setTransform((prev) => ({
      ...prev,
      offsetX: Math.round(dragStartRef.current.initOffsetX + dx),
      offsetY: Math.round(dragStartRef.current.initOffsetY + dy),
    }));
  };

  const handleTouchEnd = () => {
    setIsDraggingCanvas(false);
  };

  // Zoom con rueda de ratón sobre el lienzo
  const handleWheelCanvas = (e: ReactWheelEvent<HTMLCanvasElement>) => {
    e.preventDefault();
    const step = e.deltaY < 0 ? 0.08 : -0.08;
    setTransform((prev) => ({
      ...prev,
      zoom: Math.max(0.5, Math.min(3.0, parseFloat((prev.zoom + step).toFixed(2)))),
    }));
  };

  // Guardar la foto recortada y comprimida en el perfil
  const handleSavePhoto = async () => {
    if (!compressionResult) return;
    setIsSaving(true);
    setErrorMessage(null);

    try {
      const res = await updateUserAvatar(compressionResult.dataUrl);
      if (res.error) {
        setErrorMessage(res.error);
      } else {
        showNotification(
          `Fotografía encuadrada y guardada con éxito (${formatBytes(compressionResult.compressedBytes)}). Perfil actualizado.`
        );
        setLoadedImage(null);
        setCompressionResult(null);
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Error al guardar la fotografía.';
      setErrorMessage(msg);
    } finally {
      setIsSaving(false);
    }
  };

  // Quitar fotografía personalizada y volver a la inicial
  const handleRemovePhoto = async () => {
    setIsSaving(true);
    try {
      await updateUserAvatar(null);
      showNotification('Fotografía eliminada. Tu perfil ahora muestra la inicial de tu nombre.');
      setLoadedImage(null);
      setCompressionResult(null);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Error al eliminar la fotografía.';
      setErrorMessage(msg);
    } finally {
      setIsSaving(false);
    }
  };

  const userInitial = user?.full_name?.trim() ? user.full_name.trim().charAt(0).toUpperCase() : 'U';
  const hasCustomPhoto = Boolean(user?.avatar_url && user.avatar_url.trim().length > 0 && user.avatar_url !== '/abuela-avatar.png');

  return (
    <div className="flex-1 flex flex-col font-sans w-full bg-[var(--hub-bg,#DDD2EA)] py-4 px-3 sm:px-6 lg:px-8">
      {/* Toast Flotante de Éxito */}
      {successToast && (
        <div className="fixed bottom-6 right-6 z-50 bg-white border-2 border-emerald-500 text-[#292929] px-4 py-3 rounded-2xl shadow-2xl flex items-center gap-3 animate-in fade-in slide-in-from-bottom-4 duration-200">
          <div className="p-1 rounded-full bg-emerald-100 text-emerald-700">
            <Check className="h-4 w-4 stroke-[3]" />
          </div>
          <p className="text-xs font-bold leading-tight">{successToast}</p>
        </div>
      )}

      {/* Cabecera de Página con Botón Volver */}
      <div className="max-w-5xl mx-auto w-full mb-4 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => router.back()}
            className="p-2 rounded-xl bg-white border-2 border-[#D8CFF0] hover:border-[#8E0E75] hover:bg-[#FAF8FD] text-[#8E0E75] transition-all cursor-pointer shadow-2xs group flex items-center gap-1.5 text-xs font-bold"
            title="Volver a la vista anterior"
          >
            <ArrowLeft className="h-4 w-4 group-hover:-translate-x-0.5 transition-transform" />
            <span>Volver</span>
          </button>
          <div>
            <h1 className="text-xl sm:text-2xl font-black text-[#292929] tracking-tight uppercase">
              Mi Perfil & Fotografía
            </h1>
            <p className="text-xs text-[#4A4A4A]">
              Personaliza y encuadra manualmente tu foto de perfil o utiliza la inicial de tu nombre
            </p>
          </div>
        </div>

        <Link
          href="/hub"
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border-2 border-[#D8CFF0] bg-white text-[#8E0E75] hover:border-[#8E0E75] text-xs font-bold transition-all shadow-2xs"
        >
          <span>Ir al HUB Principal</span>
        </Link>
      </div>

      {/* Mensaje de Error si ocurre */}
      {errorMessage && (
        <div className="max-w-5xl mx-auto w-full mb-4 p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs font-bold flex items-center gap-2">
          <AlertCircle className="h-4 w-4 shrink-0" />
          <span>{errorMessage}</span>
        </div>
      )}

      {/* Contenedor Principal: Rejilla de Dos Columnas */}
      <div className="max-w-5xl mx-auto w-full grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
        
        {/* Columna Izquierda (lg:col-span-5): Ficha de Identidad del Usuario */}
        <div className="lg:col-span-5 bg-white border-2 border-[#D8CFF0] rounded-2xl p-5 shadow-xs flex flex-col space-y-4">
          
          <div className="flex items-center justify-between border-b border-[#EAE4F5] pb-3">
            <span className="text-[11px] font-black uppercase tracking-wider text-[#8E0E75]">
              Identidad Activa
            </span>
            <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
              <span>Sesión verificada</span>
            </span>
          </div>

          {/* Avatar Actual Grande */}
          <div className="flex flex-col items-center text-center py-2">
            <div className="relative group">
              <UserAvatar
                src={user?.avatar_url}
                name={user?.full_name}
                size="2xl"
                showOnline={false}
                className="shadow-md"
              />
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="absolute bottom-0 right-0 p-2 rounded-full bg-[#8E0E75] hover:bg-[#700B5C] text-white shadow-lg border-2 border-white transition-transform hover:scale-110 active:scale-95 cursor-pointer"
                title="Cargar nueva fotografía"
                aria-label="Cargar nueva fotografía"
              >
                <Camera className="h-4 w-4" />
              </button>
            </div>

            <h2 className="text-base font-black text-[#292929] mt-3">
              {user?.full_name || 'Usuario'}
            </h2>
            <p className="text-xs text-[#4A4A4A] font-medium">
              {user?.email || 'usuario@brainupgrup.com'}
            </p>

            <span className="mt-2 text-[11px] font-extrabold uppercase tracking-wider text-[#8E0E75] bg-[#F8F6FC] px-3 py-1 rounded-full border border-[#D8CFF0]">
              {role === 'admin' ? 'Super Administrador' : role === 'coordinator' ? 'Coordinadora & Empleada' : 'Empleado / Trabajador'}
            </span>
          </div>

          {/* Datos del Perfil */}
          <div className="space-y-2 pt-2 border-t border-[#EAE4F5] text-xs">
            <div className="flex items-center justify-between p-2 rounded-xl bg-[#FAF8FD] border border-[#EAE4F5]">
              <span className="text-[#4A4A4A] font-semibold flex items-center gap-1.5">
                <Building2 className="h-3.5 w-3.5 text-[#8E0E75]" />
                <span>Departamento</span>
              </span>
              <span className="font-bold text-[#292929]">
                {user?.department || 'Operaciones'}
              </span>
            </div>

            <div className="flex items-center justify-between p-2 rounded-xl bg-[#FAF8FD] border border-[#EAE4F5]">
              <span className="text-[#4A4A4A] font-semibold flex items-center gap-1.5">
                <User className="h-3.5 w-3.5 text-[#8E0E75]" />
                <span>Modo de Imagen</span>
              </span>
              <span className="font-bold text-[#8E0E75]">
                {hasCustomPhoto ? 'Fotografía Personalizada' : `Inicial de Nombre ("${userInitial}")`}
              </span>
            </div>
          </div>

          {/* Botón para quitar foto y volver a la inicial */}
          {hasCustomPhoto && (
            <button
              type="button"
              onClick={handleRemovePhoto}
              disabled={isSaving}
              className="w-full flex items-center justify-center gap-2 py-2 px-3 rounded-xl border border-rose-300 bg-rose-50 hover:bg-rose-100 text-rose-700 text-xs font-bold transition-all cursor-pointer"
            >
              <Trash2 className="h-3.5 w-3.5" />
              <span>Quitar foto y usar inicial ("{userInitial}")</span>
            </button>
          )}

        </div>

        {/* Columna Derecha (lg:col-span-7): Carga, Encuadre Manual y Compresión */}
        <div className="lg:col-span-7 bg-white border-2 border-[#D8CFF0] rounded-2xl p-5 shadow-xs space-y-4">
          
          <div className="border-b border-[#EAE4F5] pb-3 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Camera className="h-4 w-4 text-[#8E0E75]" />
              <h3 className="text-xs font-black uppercase tracking-wider text-[#292929]">
                {loadedImage ? 'Ajustar y Centrar Fotografía' : 'Cargar Nueva Fotografía'}
              </h3>
            </div>
            <span className="text-[10px] font-extrabold uppercase px-2 py-0.5 rounded-md bg-emerald-100 text-emerald-800 border border-emerald-300">
              Compresión Automática &lt; 15 KB
            </span>
          </div>

          {/* Input Oculto de Archivos */}
          <input
            ref={fileInputRef}
            type="file"
            accept="image/png, image/jpeg, image/jpg, image/webp"
            onChange={handleFileChange}
            className="hidden"
            aria-label="Seleccionar fotografía de perfil"
          />

          {/* ESTADO 1: SIN IMAGEN CARGADA -> ZONA DRAG & DROP */}
          {!loadedImage && !isProcessing && (
            <>
              <div className="p-3 rounded-xl bg-[#FAF8FD] border border-[#D8CFF0] text-xs text-[#4A4A4A] flex items-start gap-2.5">
                <Info className="h-4 w-4 text-[#8E0E75] shrink-0 mt-0.5" />
                <p className="leading-relaxed">
                  Sube cualquier fotografía desde tu ordenador o móvil. Podrás <strong>arrastrarla libremente para no cortar la cabeza</strong> y ajustarla antes de guardarla.
                </p>
              </div>

              <div
                onClick={() => fileInputRef.current?.click()}
                onDragOver={handleDragOverFile}
                onDragLeave={handleDragLeaveFile}
                onDrop={handleDropFile}
                className={`border-2 border-dashed rounded-2xl p-8 text-center transition-all cursor-pointer flex flex-col items-center justify-center space-y-2.5 group ${
                  isDraggingFile
                    ? 'border-[#8E0E75] bg-[#8E0E75]/10 scale-[1.01]'
                    : 'border-[#D8CFF0] hover:border-[#8E0E75] hover:bg-[#FAF8FD]'
                }`}
              >
                <div className="h-12 w-12 rounded-full bg-[#FAF8FD] group-hover:bg-white text-[#8E0E75] border-2 border-[#D8CFF0] group-hover:border-[#8E0E75] flex items-center justify-center transition-transform group-hover:scale-110 shadow-2xs">
                  <Upload className="h-5 w-5" />
                </div>

                <div className="space-y-1">
                  <p className="text-xs font-black text-[#292929] group-hover:text-[#8E0E75] transition-colors">
                    Arrastra una fotografía aquí o haz clic para seleccionarla
                  </p>
                  <p className="text-[11px] text-[#4A4A4A]">
                    Formatos compatibles: JPG, PNG o WebP.
                  </p>
                </div>
              </div>
            </>
          )}

          {/* Spinner de Procesamiento inicial */}
          {isProcessing && (
            <div className="p-8 rounded-2xl bg-[#F8F6FC] border border-[#D8CFF0] flex flex-col items-center justify-center gap-3">
              <div className="h-6 w-6 animate-spin rounded-full border-3 border-[#D8CFF0] border-t-[#8E0E75]" />
              <span className="text-xs font-bold text-[#8E0E75]">
                Cargando fotografía en el editor de encuadre...
              </span>
            </div>
          )}

          {/* ESTADO 2: IMAGEN CARGADA -> EDITOR INTERACTIVO CON ARRASTRE Y SLIDERS EN VIVO */}
          {loadedImage && !isProcessing && (
            <div className="space-y-4 animate-in fade-in duration-200">
              
              {/* Barra de Acciones Rápidas de Encuadre */}
              <div className="p-2.5 rounded-xl bg-purple-50 border border-purple-200 text-[#8E0E75] text-xs font-bold flex flex-wrap items-center justify-between gap-2">
                <span className="flex items-center gap-1.5">
                  <Move className="h-3.5 w-3.5" />
                  <span>Arrastra la foto directamente en el recuadro para no cortar la cabeza</span>
                </span>
                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    onClick={() => setTransform({ offsetX: 0, offsetY: 35, zoom: 0.95 })}
                    className="px-2.5 py-1 rounded-lg bg-[#8E0E75] text-white hover:bg-[#700B5C] transition-all text-[11px] font-black uppercase tracking-wider cursor-pointer shadow-2xs"
                    title="Bajar la foto automáticamente para encuadrar la cabeza con aire superior"
                  >
                    Bajar Cabeza
                  </button>
                  <button
                    type="button"
                    onClick={() => setTransform({ offsetX: 0, offsetY: 0, zoom: 1.0 })}
                    className="p-1 rounded-lg bg-white border border-[#D8CFF0] hover:border-[#8E0E75] text-[#4A4A4A] hover:text-[#8E0E75] transition-all cursor-pointer"
                    title="Restablecer posición inicial al centro"
                  >
                    <RotateCcw className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>

              {/* Contenedor: Lienzo interactivo a la izquierda + Sliders a la derecha */}
              <div className="grid grid-cols-1 sm:grid-cols-12 gap-4 items-center">
                
                {/* Lienzo Interactivo con Máscara Circular */}
                <div className="sm:col-span-5 flex flex-col items-center justify-center">
                  <div className="relative rounded-2xl overflow-hidden border-2 border-[#8E0E75] shadow-lg bg-slate-900 group">
                    <canvas
                      ref={canvasRef}
                      width={240}
                      height={240}
                      onMouseDown={handleMouseDownCanvas}
                      onTouchStart={handleTouchStart}
                      onTouchMove={handleTouchMove}
                      onTouchEnd={handleTouchEnd}
                      onWheel={handleWheelCanvas}
                      className={`cursor-grab active:cursor-grabbing block select-none touch-none ${
                        isDraggingCanvas ? 'cursor-grabbing' : ''
                      }`}
                      title="Arrastra con el ratón para desplazar la foto o usa la rueda para zoom"
                    />

                    {/* Guía visual flotante */}
                    <div className="absolute top-2 left-1/2 -translate-x-1/2 pointer-events-none px-2.5 py-0.5 rounded-full bg-black/60 backdrop-blur-xs text-[10px] font-black uppercase tracking-wider text-white whitespace-nowrap shadow-xs">
                      Arrastra la imagen aquí
                    </div>
                  </div>
                </div>

                {/* Controles Deslizantes y Botones de Precisión */}
                <div className="sm:col-span-7 space-y-3 bg-[#FAF8FD] p-3.5 rounded-xl border border-[#D8CFF0]">
                  
                  {/* Control 1: Posición Vertical (Subir / Bajar cabeza) */}
                  <div className="space-y-1">
                    <div className="flex items-center justify-between text-[11px] font-bold">
                      <span className="text-[#292929] flex items-center gap-1">
                        <Move className="h-3 w-3 text-[#8E0E75]" />
                        <span>Posición Vertical (Bajar foto = mostrar cabeza)</span>
                      </span>
                      <span className="text-[#8E0E75] font-mono font-black">
                        {transform.offsetY > 0 ? `+${transform.offsetY}px` : `${transform.offsetY}px`}
                      </span>
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => setTransform((prev) => ({ ...prev, offsetY: prev.offsetY - 12 }))}
                        className="p-1 rounded-md bg-white border border-[#D8CFF0] hover:border-[#8E0E75] hover:bg-[#8E0E75] hover:text-white text-[#8E0E75] transition-all cursor-pointer shadow-2xs"
                        title="Subir foto"
                      >
                        <ChevronUp className="h-4 w-4" />
                      </button>

                      <input
                        type="range"
                        min="-150"
                        max="150"
                        step="1"
                        value={transform.offsetY}
                        onChange={(e) => setTransform((prev) => ({ ...prev, offsetY: parseInt(e.target.value, 10) }))}
                        className="flex-1 accent-[#8E0E75] cursor-pointer"
                        title="Desliza a la derecha para bajar la foto y ver la cabeza entera"
                      />

                      <button
                        type="button"
                        onClick={() => setTransform((prev) => ({ ...prev, offsetY: prev.offsetY + 12 }))}
                        className="p-1 rounded-md bg-white border border-[#D8CFF0] hover:border-[#8E0E75] hover:bg-[#8E0E75] hover:text-white text-[#8E0E75] transition-all cursor-pointer shadow-2xs"
                        title="Bajar foto (Mostrar más cabeza)"
                      >
                        <ChevronDown className="h-4 w-4" />
                      </button>
                    </div>
                    <div className="flex justify-between text-[10px] text-[#4A4A4A] font-semibold">
                      <span>▲ Subir cuerpo</span>
                      <span className="text-[#8E0E75] font-bold">Bajar foto (Ver cabeza) ▼</span>
                    </div>
                  </div>

                  {/* Control 2: Posición Horizontal (Izquierda / Derecha) */}
                  <div className="space-y-1">
                    <div className="flex items-center justify-between text-[11px] font-bold">
                      <span className="text-[#292929] flex items-center gap-1">
                        <Move className="h-3 w-3 text-[#8E0E75]" />
                        <span>Posición Horizontal</span>
                      </span>
                      <span className="text-[#8E0E75] font-mono font-black">
                        {transform.offsetX > 0 ? `+${transform.offsetX}px` : `${transform.offsetX}px`}
                      </span>
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => setTransform((prev) => ({ ...prev, offsetX: prev.offsetX - 12 }))}
                        className="p-1 rounded-md bg-white border border-[#D8CFF0] hover:border-[#8E0E75] hover:bg-[#8E0E75] hover:text-white text-[#8E0E75] transition-all cursor-pointer shadow-2xs"
                        title="Mover a la izquierda"
                      >
                        <ChevronLeft className="h-4 w-4" />
                      </button>

                      <input
                        type="range"
                        min="-150"
                        max="150"
                        step="1"
                        value={transform.offsetX}
                        onChange={(e) => setTransform((prev) => ({ ...prev, offsetX: parseInt(e.target.value, 10) }))}
                        className="flex-1 accent-[#8E0E75] cursor-pointer"
                      />

                      <button
                        type="button"
                        onClick={() => setTransform((prev) => ({ ...prev, offsetX: prev.offsetX + 12 }))}
                        className="p-1 rounded-md bg-white border border-[#D8CFF0] hover:border-[#8E0E75] hover:bg-[#8E0E75] hover:text-white text-[#8E0E75] transition-all cursor-pointer shadow-2xs"
                        title="Mover a la derecha"
                      >
                        <ChevronRight className="h-4 w-4" />
                      </button>
                    </div>
                  </div>

                  {/* Control 3: Zoom / Escala */}
                  <div className="space-y-1">
                    <div className="flex items-center justify-between text-[11px] font-bold">
                      <span className="text-[#292929] flex items-center gap-1">
                        <ZoomIn className="h-3 w-3 text-[#8E0E75]" />
                        <span>Zoom / Tamaño de Escala</span>
                      </span>
                      <span className="text-[#8E0E75] font-mono font-black">
                        {transform.zoom.toFixed(2)}x
                      </span>
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => setTransform((prev) => ({ ...prev, zoom: Math.max(0.5, parseFloat((prev.zoom - 0.08).toFixed(2))) }))}
                        className="p-1 rounded-md bg-white border border-[#D8CFF0] hover:border-[#8E0E75] hover:bg-[#8E0E75] hover:text-white text-[#8E0E75] transition-all cursor-pointer shadow-2xs"
                        title="Alejar foto para que quepa la cabeza entera"
                      >
                        <ZoomOut className="h-4 w-4" />
                      </button>

                      <input
                        type="range"
                        min="0.5"
                        max="2.5"
                        step="0.02"
                        value={transform.zoom}
                        onChange={(e) => setTransform((prev) => ({ ...prev, zoom: parseFloat(e.target.value) }))}
                        className="flex-1 accent-[#8E0E75] cursor-pointer"
                        title="Reduce el zoom si la cabeza es muy grande"
                      />

                      <button
                        type="button"
                        onClick={() => setTransform((prev) => ({ ...prev, zoom: Math.min(2.5, parseFloat((prev.zoom + 0.08).toFixed(2))) }))}
                        className="p-1 rounded-md bg-white border border-[#D8CFF0] hover:border-[#8E0E75] hover:bg-[#8E0E75] hover:text-white text-[#8E0E75] transition-all cursor-pointer shadow-2xs"
                        title="Acercar foto"
                      >
                        <ZoomIn className="h-4 w-4" />
                      </button>
                    </div>
                  </div>

                </div>

              </div>

              {/* Previsualización en Vivo de los 3 Avatares de la Suite */}
              {compressionResult && (
                <div className="p-3.5 rounded-2xl bg-[#FAF8FD] border border-[#D8CFF0] space-y-3">
                  
                  <div className="flex items-center justify-between border-b border-[#EAE4F5] pb-2">
                    <span className="text-xs font-black text-[#8E0E75] uppercase tracking-wider flex items-center gap-1.5">
                      <Sparkles className="h-4 w-4" />
                      <span>Vista Previa con tu Encuadre</span>
                    </span>
                    <span className="text-xs font-black text-emerald-700 bg-emerald-100 px-2.5 py-0.5 rounded-full border border-emerald-300">
                      -{compressionResult.compressionRatioPercent}% de peso ({formatBytes(compressionResult.compressedBytes)})
                    </span>
                  </div>

                  {/* 3 Avatares Reales de la Suite que se actualizan a 60 fps */}
                  <div className="flex items-center gap-4 p-3 rounded-xl bg-white border border-[#D8CFF0] justify-around">
                    <div className="text-center space-y-1">
                      <UserAvatar src={compressionResult.dataUrl} name={user?.full_name} size="md" />
                      <span className="block text-[10px] font-bold text-slate-400">Barra superior</span>
                    </div>
                    <div className="text-center space-y-1">
                      <UserAvatar src={compressionResult.dataUrl} name={user?.full_name} size="lg" />
                      <span className="block text-[10px] font-bold text-slate-400">Menú usuario</span>
                    </div>
                    <div className="text-center space-y-1">
                      <UserAvatar src={compressionResult.dataUrl} name={user?.full_name} size="xl" />
                      <span className="block text-[10px] font-bold text-slate-400">Detalle</span>
                    </div>
                  </div>

                </div>
              )}

              {/* Botones de Acción */}
              <div className="flex items-center gap-2.5 pt-1">
                <button
                  type="button"
                  onClick={handleSavePhoto}
                  disabled={isSaving}
                  className="flex-1 py-3 px-4 rounded-xl bg-[#8E0E75] hover:bg-[#700B5C] text-white text-xs font-black uppercase tracking-wider transition-all shadow-md hover:scale-[1.01] active:scale-[0.99] cursor-pointer flex items-center justify-center gap-2"
                >
                  <Check className="h-4 w-4 stroke-[3]" />
                  <span>{isSaving ? 'Guardando en perfil...' : 'Aplicar esta Fotografía'}</span>
                </button>

                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={isSaving}
                  className="py-3 px-3.5 rounded-xl border-2 border-[#D8CFF0] bg-white hover:bg-[#FAF8FD] text-[#8E0E75] text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5"
                  title="Seleccionar otra fotografía diferente"
                >
                  <Camera className="h-4 w-4" />
                  <span className="hidden sm:inline">Otra foto</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setLoadedImage(null);
                    setCompressionResult(null);
                  }}
                  disabled={isSaving}
                  className="py-3 px-3.5 rounded-xl border border-slate-300 bg-white hover:bg-slate-100 text-slate-700 text-xs font-bold transition-all cursor-pointer"
                >
                  Descartar
                </button>
              </div>

            </div>
          )}

        </div>

      </div>
    </div>
  );
}
