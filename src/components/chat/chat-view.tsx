'use client';

import React, { useState, useRef, useEffect } from 'react';
import { 
  Building2, 
  Hash, 
  Pin, 
  CheckCircle2, 
  Circle, 
  Send, 
  Plus, 
  AtSign, 
  AlertCircle, 
  Clock, 
  Check, 
  X, 
  Layers, 
  ChevronDown, 
  MoreVertical,
  UserCheck,
  Calendar,
  Paperclip,
  Image as ImageIcon,
  FileVideo,
  Download,
  Play,
  Maximize2,
  FileText
} from 'lucide-react';
import { Channel, ChatMessage, ChatAttachment } from '@/types/chat';
import { compressImageForChat, generateVideoPoster, formatFileSize, getAttachmentType } from '@/lib/chat-attachments';
import { Profile } from '@/types/database';
import { AppSelect, SelectOption } from '@/components/ui/app-select';
import { UserAvatar } from '@/components/ui/user-avatar';

interface ChatViewProps {
  channel: Channel;
  messages: ChatMessage[];
  currentUser: Profile | null;
  profiles: Profile[];
  onSendMessage: (
    content: string,
    isActionItem: boolean,
    assignedTo?: string | null,
    priority?: 'normal' | 'urgent',
    attachments?: ChatAttachment[]
  ) => void | Promise<void>;
  onToggleCompleteActionItem: (messageId: string, currentStatus: boolean) => void;
  onTogglePinMessage: (messageId: string, currentStatus: boolean) => void;
  onConvertToTask: (messageId: string, assignedTo: string, assignedName: string) => void;
}

export function ChatView({
  channel,
  messages,
  currentUser,
  profiles,
  onSendMessage,
  onToggleCompleteActionItem,
  onTogglePinMessage,
  onConvertToTask,
}: ChatViewProps) {
  const [inputText, setInputText] = useState('');
  const [isActionItem, setIsActionItem] = useState(false);
  const [selectedAssignee, setSelectedAssignee] = useState<string>('current_user');
  const [taskPriority, setTaskPriority] = useState<'normal' | 'urgent'>('normal');
  const [showTasksDrawer, setShowTasksDrawer] = useState(false);
  const [showPinnedDrawer, setShowPinnedDrawer] = useState(false);
  const [showAssignModal, setShowAssignModal] = useState<string | null>(null);

  // Estados para subida y procesamiento de adjuntos (fotos y vídeos)
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [pendingAttachment, setPendingAttachment] = useState<{
    file: File;
    type: 'image' | 'video' | 'file';
    previewUrl?: string;
    posterUrl?: string;
  } | null>(null);
  const [isProcessingAttachment, setIsProcessingAttachment] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);

  // Estado para modal visor de medios (lightbox de imagen o reproductor de vídeo)
  const [selectedMedia, setSelectedMedia] = useState<{
    type: 'image' | 'video';
    url: string;
    name: string;
    size: number;
  } | null>(null);

  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Auto-scroll al final con cada mensaje nuevo
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const channelTasks = messages.filter((m) => m.is_action_item);
  const channelPinned = messages.filter((m) => m.is_pinned);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploadError(null);
    setIsProcessingAttachment(true);
    const fileType = getAttachmentType(file.type, file.name);

    try {
      if (fileType === 'image') {
        const { file: compressedFile, dataUrl } = await compressImageForChat(file);
        setPendingAttachment({
          file: compressedFile,
          type: 'image',
          previewUrl: dataUrl,
        });
      } else if (fileType === 'video') {
        const poster = await generateVideoPoster(file);
        setPendingAttachment({
          file,
          type: 'video',
          posterUrl: poster || undefined,
        });
      } else {
        setPendingAttachment({
          file,
          type: 'file',
        });
      }
    } catch (err) {
      console.error('Error procesando archivo:', err);
      setUploadError('No se pudo procesar el archivo seleccionado');
    } finally {
      setIsProcessingAttachment(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleClearPendingAttachment = () => {
    setPendingAttachment(null);
    setUploadError(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputText.trim() && !pendingAttachment) return;

    let uploadedAttachments: ChatAttachment[] | undefined;

    if (pendingAttachment) {
      setIsUploading(true);
      try {
        const formData = new FormData();
        formData.append('file', pendingAttachment.file);
        formData.append('channelId', channel.id);
        formData.append('title', pendingAttachment.file.name);
        if (pendingAttachment.posterUrl) {
          formData.append('posterUrl', pendingAttachment.posterUrl);
        }

        const res = await fetch('/api/slack/files/upload', {
          method: 'POST',
          body: formData,
        });

        const data = await res.json();
        if (data.ok && data.attachment) {
          uploadedAttachments = [data.attachment];
        } else {
          throw new Error(data.error || 'Error al subir el archivo');
        }
      } catch (err: any) {
        console.error('Error subiendo adjunto:', err);
        setUploadError(err.message || 'Error al subir el archivo a Slack');
        setIsUploading(false);
        return;
      }
      setIsUploading(false);
    }

    onSendMessage(
      inputText.trim(),
      isActionItem,
      isActionItem ? selectedAssignee : undefined,
      taskPriority,
      uploadedAttachments
    );

    setInputText('');
    setPendingAttachment(null);
    setIsActionItem(false);
    setTaskPriority('normal');
  };

  return (
    <div className="flex-1 h-full flex flex-col bg-white overflow-hidden select-none">
      
      {/* 1. CABECERA DEL CANAL (ESTILO SLACK CON IDENTIDAD BRAIN UP) */}
      <header className="h-14 px-4 border-b border-[#D8CFF0] bg-white flex items-center justify-between shrink-0 z-10">
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="p-1 rounded-xs bg-[#F8F6FC] text-[#8E0E75] shrink-0 border border-[#D8CFF0]">
            {channel.type === 'client' ? (
              <Building2 className="h-4 w-4" />
            ) : channel.type === 'dm' ? (
              <span className="h-2.5 w-2.5 rounded-full bg-[#3BB54A]" />
            ) : (
              <Hash className="h-4 w-4" />
            )}
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <h2 className="text-sm font-black text-[#292929] uppercase tracking-wide truncate">
                #{channel.name}
              </h2>
              {channel.company && (
                <span className="text-[11px] font-bold px-2 py-0.5 rounded-2xs bg-[#8E0E75]/10 text-[#8E0E75] border border-[#8E0E75]/20 truncate">
                  {channel.company.name}
                </span>
              )}
            </div>
            {channel.description && (
              <p className="text-[11px] text-[#4A4A4A] truncate max-w-md">
                {channel.description}
              </p>
            )}
          </div>
        </div>

        {/* Botones de Cabecera: Tareas y Fijados */}
        <div className="flex items-center gap-2.5 shrink-0">
          <button
            type="button"
            onClick={() => {
              setShowTasksDrawer(!showTasksDrawer);
              setShowPinnedDrawer(false);
            }}
            className={`inline-flex items-center gap-2 px-3.5 py-1.5 rounded-md text-xs font-black uppercase tracking-wider transition-all cursor-pointer border-2 shadow-2xs hover:scale-105 active:scale-95 ${
              showTasksDrawer
                ? 'bg-[#8E0E75] text-white border-[#8E0E75] shadow-xs'
                : 'bg-[#F8F6FC] text-[#292929] border-[#D8CFF0] hover:bg-white hover:border-[#8E0E75]'
            }`}
            title="Ver tareas de este cliente/canal"
          >
            <CheckCircle2 className="h-4 w-4 text-emerald-600" />
            <span>Tareas ({channelTasks.filter(t => !t.is_completed).length})</span>
          </button>

          <button
            type="button"
            onClick={() => {
              setShowPinnedDrawer(!showPinnedDrawer);
              setShowTasksDrawer(false);
            }}
            className={`inline-flex items-center gap-2 px-3.5 py-1.5 rounded-md text-xs font-black uppercase tracking-wider transition-all cursor-pointer border-2 shadow-2xs hover:scale-105 active:scale-95 ${
              showPinnedDrawer
                ? 'bg-[#8E0E75] text-white border-[#8E0E75] shadow-xs'
                : 'bg-[#F8F6FC] text-[#292929] border-[#D8CFF0] hover:bg-white hover:border-[#8E0E75]'
            }`}
            title="Ver información fijada importante"
          >
            <Pin className="h-4 w-4 text-amber-600" />
            <span>Fijados ({channelPinned.length})</span>
          </button>
        </div>
      </header>

      {/* 2. ÁREA CENTRAL: STREAM DE MENSAJES + PANELES DESPLEGABLES */}
      <div className="flex-1 flex overflow-hidden relative">
        
        {/* Stream de Mensajes */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-4 custom-scrollbar">
          
          {/* Mensaje de Bienvenida al Canal */}
          <div className="py-4 text-center border-b border-[#F8F6FC] space-y-1">
            <div className="h-10 w-10 rounded-full bg-[#F8F6FC] border border-[#D8CFF0] text-[#8E0E75] flex items-center justify-center mx-auto">
              {channel.type === 'client' ? <Building2 className="h-5 w-5" /> : <Hash className="h-5 w-5" />}
            </div>
            <h3 className="text-sm font-black uppercase text-[#292929]">
              Inicio de #{channel.name}
            </h3>
            <p className="text-[11px] text-[#4A4A4A] max-w-sm mx-auto">
              {channel.description || 'Canal para coordinar entregables y comunicarse en tiempo real.'}
            </p>
          </div>

          {/* Lista de Mensajes */}
          {messages.map((msg) => {
            const isAssignedToMe = msg.assigned_to === 'current_user' || msg.assigned_to === currentUser?.id;
            const initials = msg.sender_name
              ? msg.sender_name
                  .split(' ')
                  .map((n) => n[0])
                  .join('')
                  .slice(0, 2)
                  .toUpperCase()
              : 'BU';

            return (
              <div
                key={msg.id}
                className="group relative flex items-start gap-3 p-2 rounded-lg hover:bg-[#F8F6FC] transition-colors"
              >
                {/* Avatar */}
                <UserAvatar
                  src="/abuela-avatar.png"
                  name={msg.sender_name}
                  size="sm"
                  className="ring-1 ring-[#D8CFF0]"
                />

                {/* Contenido Principal */}
                <div className="flex-1 min-w-0 space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-extrabold text-[#292929]">
                      {msg.sender_name || 'Compañero Brain Up'}
                    </span>
                    <span className="text-[11px] text-slate-400">
                      {new Date(msg.created_at).toLocaleTimeString('es-ES', {
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </span>
                    {msg.is_pinned && (
                      <span className="inline-flex items-center gap-1 text-[11px] font-bold px-1.5 py-0.2 rounded-2xs bg-amber-50 text-amber-800 border border-amber-200">
                        <Pin className="h-2.5 w-2.5" />
                        <span>Fijado</span>
                      </span>
                    )}
                  </div>

                  {/* Texto ordinario o Tarjeta de Tarea Accionable */}
                  {msg.is_action_item ? (
                    <div className="rounded-2xl border-l-4 border-l-[#8E0E75] bg-[#F8F6FC] border border-[#D8CFF0] p-3 space-y-2 max-w-xl">
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-1.5">
                          <CheckCircle2 className="h-3.5 w-3.5 text-[#8E0E75]" />
                          <span className="text-[11px] font-black uppercase tracking-wider text-[#8E0E75]">
                            Tarea para: {msg.assigned_name || (isAssignedToMe ? 'Ti' : 'Equipo')}
                          </span>
                        </div>
                        <span className={`text-[11px] font-extrabold uppercase px-1.5 py-0.5 rounded-2xs ${
                          msg.is_completed
                            ? 'bg-emerald-100 text-emerald-800'
                            : 'bg-amber-100 text-amber-800'
                        }`}>
                          {msg.is_completed ? 'Completado' : 'Pendiente'}
                        </span>
                      </div>

                      <p className="text-xs font-medium text-[#292929] leading-relaxed">
                        {msg.content}
                      </p>

                      <div className="flex items-center justify-between pt-1 text-[11px]">
                        <button
                          type="button"
                          onClick={() => onToggleCompleteActionItem(msg.id, msg.is_completed)}
                          className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-xs font-extrabold uppercase text-[11px] transition-all cursor-pointer ${
                            msg.is_completed
                              ? 'bg-emerald-600 text-white'
                              : 'bg-white border border-[#3BB54A] text-[#3BB54A] hover:bg-emerald-50'
                          }`}
                        >
                          <Check className="h-3 w-3" />
                          <span>{msg.is_completed ? 'Hecho' : 'Marcar como Revisado'}</span>
                        </button>

                        {msg.priority === 'urgent' && (
                          <span className="text-red-600 font-extrabold uppercase text-[11px] tracking-wider">
                            Prioridad Urgente
                          </span>
                        )}
                      </div>
                    </div>
                  ) : (
                    <p className="text-xs text-[#292929] leading-relaxed break-words font-medium">
                      {msg.content}
                    </p>
                  )}

                  {/* Adjuntos del Mensaje: Fotos y Vídeos */}
                  {msg.attachments && msg.attachments.length > 0 && (
                    <div className="pt-2 flex flex-wrap gap-3">
                      {msg.attachments.map((att) => {
                        if (att.type === 'image') {
                          return (
                            <div
                              key={att.id}
                              className="group/img relative rounded-2xl overflow-hidden border-2 border-[#D0C4EB] bg-[#F8F6FC] shadow-2xs hover:shadow-md transition-all max-w-xs sm:max-w-sm"
                            >
                              {/* eslint-disable-next-line @next/next/no-img-element */}
                              <img
                                src={att.url}
                                alt={att.name}
                                className="w-full max-h-64 object-cover cursor-pointer hover:opacity-95 transition-opacity"
                                onClick={() => setSelectedMedia({ type: 'image', url: att.url, name: att.name, size: att.size })}
                              />
                              <div className="p-2 bg-white/95 border-t border-[#EAE4F5] flex items-center justify-between text-[11px] gap-2">
                                <span className="font-bold text-[#292929] truncate" title={att.name}>
                                  {att.name}
                                </span>
                                <span className="font-mono tabular-nums text-slate-500 shrink-0">
                                  {formatFileSize(att.size)}
                                </span>
                              </div>
                            </div>
                          );
                        }

                        if (att.type === 'video') {
                          return (
                            <div
                              key={att.id}
                              className="w-full max-w-md rounded-2xl border-2 border-[#D0C4EB] bg-[#FAF8FD] p-3 shadow-2xs hover:shadow-md transition-all space-y-2"
                            >
                              <div className="flex items-center gap-3">
                                {/* Miniatura / Póster del vídeo */}
                                <div
                                  onClick={() => setSelectedMedia({ type: 'video', url: att.url, name: att.name, size: att.size })}
                                  className="relative h-18 w-28 sm:h-20 sm:w-32 rounded-xl bg-slate-900 border border-[#D8CFF0] overflow-hidden shrink-0 flex items-center justify-center cursor-pointer group/vid shadow-2xs"
                                  title="Reproducir vídeo"
                                >
                                  {att.poster_url ? (
                                    /* eslint-disable-next-line @next/next/no-img-element */
                                    <img src={att.poster_url} alt="" className="h-full w-full object-cover group-hover/vid:scale-105 transition-transform" />
                                  ) : (
                                    <FileVideo className="h-7 w-7 text-white/70" />
                                  )}
                                  <div className="absolute inset-0 bg-black/35 flex items-center justify-center group-hover/vid:bg-black/20 transition-colors">
                                    <div className="h-8 w-8 rounded-full bg-white/95 text-[#8E0E75] flex items-center justify-center shadow-md">
                                      <Play className="h-4 w-4 fill-[#8E0E75] translate-x-0.5" />
                                    </div>
                                  </div>
                                </div>

                                {/* Metadatos y acciones */}
                                <div className="flex-1 min-w-0 space-y-1.5">
                                  <div className="flex items-center gap-1.5 text-xs font-black text-[#191654]">
                                    <FileVideo className="h-3.5 w-3.5 text-[#8E0E75] shrink-0" />
                                    <span className="truncate" title={att.name}>{att.name}</span>
                                  </div>
                                  <p className="text-[11px] font-mono tabular-nums text-slate-500 font-medium">
                                    {formatFileSize(att.size)} · Vídeo en Slack
                                  </p>

                                  <div className="flex items-center gap-2 pt-0.5">
                                    {/* Botón Descargar (Zero-DOM-Bloat) */}
                                    <a
                                      href={`${att.url}${att.url.includes('?') ? '&' : '?'}download=1`}
                                      download={att.name}
                                      className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-white border border-[#D8CFF0] text-[#8E0E75] hover:bg-[#8E0E75] hover:text-white text-[11px] font-bold uppercase tracking-wider transition-all shadow-2xs"
                                    >
                                      <Download className="h-3 w-3" />
                                      <span>Descargar</span>
                                    </a>

                                    {/* Botón Ver */}
                                    <button
                                      type="button"
                                      onClick={() => setSelectedMedia({ type: 'video', url: att.url, name: att.name, size: att.size })}
                                      className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-[#8E0E75] text-white hover:bg-[#700B5C] text-[11px] font-bold uppercase tracking-wider transition-all shadow-xs cursor-pointer"
                                    >
                                      <Play className="h-3 w-3 fill-white" />
                                      <span>Ver</span>
                                    </button>
                                  </div>
                                </div>
                              </div>
                            </div>
                          );
                        }

                        // Archivo genérico
                        return (
                          <div
                            key={att.id}
                            className="inline-flex items-center gap-2 p-2.5 rounded-xl border border-[#D8CFF0] bg-white shadow-2xs text-xs font-medium"
                          >
                            <FileText className="h-4 w-4 text-[#8E0E75]" />
                            <span className="font-bold text-[#292929] max-w-xs truncate">{att.name}</span>
                            <span className="text-[11px] font-mono text-slate-400">({formatFileSize(att.size)})</span>
                            <a
                              href={`${att.url}${att.url.includes('?') ? '&' : '?'}download=1`}
                              download={att.name}
                              className="p-1 rounded-md text-[#8E0E75] hover:bg-[#F8F6FC] transition-colors"
                              title="Descargar archivo"
                            >
                              <Download className="h-3.5 w-3.5" />
                            </a>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>

                {/* Barra Flotante de Acciones Rápidas en Hover (Slack Style) */}
                <div className="opacity-0 group-hover:opacity-100 transition-opacity absolute right-2 top-2 bg-white border border-[#D8CFF0] rounded-xl shadow-xs flex items-center p-0.5 gap-0.5 z-10">
                  {/* Fijar / Desfijar */}
                  <button
                    type="button"
                    onClick={() => onTogglePinMessage(msg.id, msg.is_pinned)}
                    className="p-1.5 rounded-xs hover:bg-[#F8F6FC] text-[#4A4A4A] hover:text-[#8E0E75] transition-all cursor-pointer"
                    title={msg.is_pinned ? 'Desfijar de este canal' : 'Fijar información importante'}
                  >
                    <Pin className={`h-3.5 w-3.5 ${msg.is_pinned ? 'text-[#8E0E75] fill-[#8E0E75]' : ''}`} />
                  </button>

                  {/* Convertir en Tarea si aún no lo es */}
                  {!msg.is_action_item && (
                    <button
                      type="button"
                      onClick={() => setShowAssignModal(msg.id)}
                      className="p-1.5 rounded-xs hover:bg-[#F8F6FC] text-[#4A4A4A] hover:text-[#8E0E75] transition-all cursor-pointer"
                      title="Convertir en tarea accionable para..."
                    >
                      <CheckCircle2 className="h-3.5 w-3.5" />
                    </button>
                  )}
                </div>

                {/* Modal Rápido de Conversión en Tarea */}
                {showAssignModal === msg.id && (
                  <div className="absolute right-2 top-10 bg-white border border-[#8E0E75] p-3 rounded-2xl shadow-xl z-20 w-64 space-y-2 animate-in fade-in duration-150">
                    <div className="flex items-center justify-between">
                      <span className="text-[11px] font-black uppercase text-[#8E0E75]">
                        Asignar Tarea A:
                      </span>
                      <button
                        type="button"
                        onClick={() => setShowAssignModal(null)}
                        className="text-slate-400 hover:text-slate-600"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </div>
                    <div className="space-y-1">
                      <button
                        type="button"
                        onClick={() => {
                          onConvertToTask(msg.id, 'current_user', 'Alejandro Ramos');
                          setShowAssignModal(null);
                        }}
                        className="w-full text-left px-2 py-1 text-xs rounded-xs hover:bg-[#F8F6FC] text-[#292929] font-bold"
                      >
                        A mí (Alejandro Ramos)
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          onConvertToTask(msg.id, 'user-albert-1', 'Albert Barceló');
                          setShowAssignModal(null);
                        }}
                        className="w-full text-left px-2 py-1 text-xs rounded-xs hover:bg-[#F8F6FC] text-[#292929] font-bold"
                      >
                        Albert Barceló (Coordinación)
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          onConvertToTask(msg.id, 'user-denilson-1', 'Denilson Diseñador');
                          setShowAssignModal(null);
                        }}
                        className="w-full text-left px-2 py-1 text-xs rounded-xs hover:bg-[#F8F6FC] text-[#292929] font-bold"
                      >
                        Denilson (Diseño)
                      </button>
                    </div>
                  </div>
                )}
              </div>
            );
          })}

          <div ref={messagesEndRef} />
        </div>

        {/* 3. PANEL LATERAL DESPLEGABLE: TAREAS DE ESTE CLIENTE */}
        {showTasksDrawer && (
          <aside className="w-72 border-l border-[#D8CFF0] bg-[#F8F6FC] p-3.5 flex flex-col space-y-3 shrink-0 z-10 animate-in slide-in-from-right duration-200">
            <div className="flex items-center justify-between border-b border-[#D8CFF0] pb-2">
              <div className="flex items-center gap-1.5">
                <CheckCircle2 className="h-4 w-4 text-[#8E0E75]" />
                <h3 className="text-xs font-black uppercase tracking-wider text-[#292929]">
                  Tareas del Canal ({channelTasks.length})
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setShowTasksDrawer(false)}
                className="p-1 rounded-xs hover:bg-white text-slate-400 hover:text-slate-600 cursor-pointer"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto space-y-2 custom-scrollbar text-xs">
              {channelTasks.length === 0 ? (
                <p className="text-slate-400 italic text-center py-6">
                  No hay tareas registradas en este canal.
                </p>
              ) : (
                channelTasks.map((task) => (
                  <div
                    key={task.id}
                    className="p-2.5 rounded-xl bg-white border border-[#D8CFF0] space-y-1.5 shadow-2xs"
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-[11px] font-bold text-[#8E0E75]">
                        @{task.assigned_name || 'Equipo'}
                      </span>
                      <span className={`text-[11px] font-bold uppercase px-1 py-0.2 rounded-2xs ${
                        task.is_completed ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'
                      }`}>
                        {task.is_completed ? 'Hecho' : 'Pendiente'}
                      </span>
                    </div>
                    <p className="text-xs font-medium text-[#292929] leading-snug">
                      {task.content}
                    </p>
                    <button
                      type="button"
                      onClick={() => onToggleCompleteActionItem(task.id, task.is_completed)}
                      className="text-[11px] font-bold text-[#3BB54A] hover:underline cursor-pointer"
                    >
                      {task.is_completed ? 'Desmarcar' : 'Completar ahora'}
                    </button>
                  </div>
                ))
              )}
            </div>
          </aside>
        )}

        {/* 4. PANEL LATERAL DESPLEGABLE: MENSAJES FIJADOS */}
        {showPinnedDrawer && (
          <aside className="w-72 border-l border-[#D8CFF0] bg-[#F8F6FC] p-3.5 flex flex-col space-y-3 shrink-0 z-10 animate-in slide-in-from-right duration-200">
            <div className="flex items-center justify-between border-b border-[#D8CFF0] pb-2">
              <div className="flex items-center gap-1.5">
                <Pin className="h-4 w-4 text-amber-600" />
                <h3 className="text-xs font-black uppercase tracking-wider text-[#292929]">
                  Fijados ({channelPinned.length})
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setShowPinnedDrawer(false)}
                className="p-1 rounded-xs hover:bg-white text-slate-400 hover:text-slate-600 cursor-pointer"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto space-y-2 custom-scrollbar text-xs">
              {channelPinned.length === 0 ? (
                <p className="text-slate-400 italic text-center py-6">
                  No hay mensajes fijados en este canal.
                </p>
              ) : (
                channelPinned.map((msg) => (
                  <div
                    key={msg.id}
                    className="p-2.5 rounded-xl bg-white border border-[#D8CFF0] space-y-1 shadow-2xs"
                  >
                    <div className="flex items-center justify-between text-[11px] text-slate-400">
                      <span className="font-bold text-[#191654]">{msg.sender_name}</span>
                      <span>{new Date(msg.created_at).toLocaleDateString('es-ES', { day: 'numeric', month: 'short' })}</span>
                    </div>
                    <p className="text-xs font-medium text-[#292929] leading-snug">
                      {msg.content}
                    </p>
                    <button
                      type="button"
                      onClick={() => onTogglePinMessage(msg.id, true)}
                      className="text-[11px] font-bold text-slate-400 hover:text-red-600 transition-colors cursor-pointer"
                    >
                      Desfijar
                    </button>
                  </div>
                ))
              )}
            </div>
          </aside>
        )}

      </div>

      {/* 5. CAJA DE ENVÍO DE MENSAJES INTELIGENTE (ESTILO SLACK) */}
      <footer className="p-3 border-t border-[#D8CFF0] bg-white shrink-0">
        <form onSubmit={handleSend} className="rounded-2xl border border-[#D8CFF0] focus-within:border-[#8E0E75] focus-within:ring-1 focus-within:ring-[#8E0E75] transition-all bg-white shadow-2xs">
          
          {/* Fila Superior de Configuración: Toggle de Tarea Accionable */}
          {isActionItem && (
            <div className="p-2 bg-[#F8F6FC] border-b border-[#D8CFF0] flex flex-wrap items-center justify-between gap-2 text-xs">
              <div className="flex items-center gap-2">
                <span className="text-[11px] font-black uppercase text-[#8E0E75] flex items-center gap-1">
                  <CheckCircle2 className="h-3 w-3" />
                  <span>Crear como Tarea para:</span>
                </span>
                {(() => {
                  const assigneeOptions: SelectOption[] = [
                    { value: 'current_user', label: `A mí (${currentUser?.full_name || 'Yo'})` },
                    ...(profiles && profiles.length > 0
                      ? profiles
                          .filter((p) => p.id !== currentUser?.id)
                          .map((p) => ({
                            value: p.id,
                            label: `${p.full_name} (${p.role === 'coordinator' ? 'Coordinación' : p.role === 'admin' ? 'Admin' : 'Equipo'})`,
                          }))
                      : [
                          { value: 'user-albert-1', label: 'Albert Barceló (Coordinación)' },
                          { value: 'user-denilson-1', label: 'Denilson Diseñador' },
                        ]),
                    { value: 'team-all', label: 'Todo el Equipo' },
                  ];

                  return (
                    <AppSelect
                      value={selectedAssignee}
                      onChange={(val) => setSelectedAssignee(val)}
                      options={assigneeOptions}
                      className="w-56 text-xs font-bold"
                      ariaLabel="Asignar tarea a"
                    />
                  );
                })()}
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setTaskPriority(taskPriority === 'urgent' ? 'normal' : 'urgent')}
                  className={`px-2 py-0.5 rounded-xs text-[11px] font-black uppercase tracking-wider transition-all cursor-pointer border ${
                    taskPriority === 'urgent'
                      ? 'bg-red-600 text-white border-red-600'
                      : 'bg-white text-slate-600 border-slate-300 hover:bg-slate-100'
                  }`}
                >
                  {taskPriority === 'urgent' ? 'Urgente' : 'Normal'}
                </button>
                <button
                  type="button"
                  onClick={() => setIsActionItem(false)}
                  className="text-slate-400 hover:text-slate-600 text-xs"
                >
                  Cancelar
                </button>
              </div>
            </div>
          )}

          {/* Previsualización de Adjunto Pendiente */}
          {pendingAttachment && (
            <div className="p-2.5 bg-[#FAF8FD] border-b border-[#D8CFF0] flex items-center justify-between gap-3 animate-in fade-in duration-150">
              <div className="flex items-center gap-2.5 min-w-0">
                {pendingAttachment.type === 'image' ? (
                  <div className="h-10 w-10 rounded-lg overflow-hidden border border-[#D8CFF0] shrink-0 bg-slate-100 flex items-center justify-center">
                    {pendingAttachment.previewUrl ? (
                      /* eslint-disable-next-line @next/next/no-img-element */
                      <img src={pendingAttachment.previewUrl} alt="" className="h-full w-full object-cover" />
                    ) : (
                      <ImageIcon className="h-5 w-5 text-[#8E0E75]" />
                    )}
                  </div>
                ) : (
                  <div className="h-10 w-14 rounded-lg overflow-hidden border border-[#D8CFF0] shrink-0 bg-slate-900 flex items-center justify-center relative">
                    {pendingAttachment.posterUrl ? (
                      /* eslint-disable-next-line @next/next/no-img-element */
                      <img src={pendingAttachment.posterUrl} alt="" className="h-full w-full object-cover" />
                    ) : (
                      <FileVideo className="h-5 w-5 text-white/80" />
                    )}
                    <Play className="h-3 w-3 fill-white text-white absolute" />
                  </div>
                )}
                <div className="min-w-0">
                  <p className="text-xs font-bold text-[#292929] truncate max-w-xs sm:max-w-md">
                    {pendingAttachment.file.name}
                  </p>
                  <p className="text-[11px] font-mono tabular-nums text-slate-500">
                    {formatFileSize(pendingAttachment.file.size)} · {pendingAttachment.type === 'image' ? 'Fotografía optimizada' : 'Vídeo'}
                    {isProcessingAttachment && ' (Procesando miniatura...)'}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={handleClearPendingAttachment}
                className="p-1 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-white transition-colors cursor-pointer"
                title="Quitar archivo adjunto"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          )}

          {uploadError && (
            <div className="px-3 py-1.5 bg-red-50 border-b border-red-200 text-red-700 text-xs font-medium flex items-center justify-between">
              <span>{uploadError}</span>
              <button type="button" onClick={() => setUploadError(null)} className="text-red-500 hover:text-red-700">
                <X className="h-3.5 w-3.5" />
              </button>
            </div>
          )}

          {/* Campo de Texto Principal */}
          <textarea
            rows={2}
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                handleSend(e);
              }
            }}
            placeholder={`Enviar mensaje a #${channel.name}... (Enter para enviar)`}
            className="w-full px-3 py-2 text-xs text-[#292929] placeholder-slate-400 outline-none resize-none bg-transparent font-medium"
          />

          {/* Barra de Herramientas Inferior */}
          <div className="px-3.5 py-2 bg-[#F8F6FC] border-t border-[#D8CFF0] flex items-center justify-between gap-3">
            <div className="flex items-center gap-2 text-slate-500">
              
              {/* Toggle de Tarea Accionable */}
              <button
                type="button"
                onClick={() => setIsActionItem(!isActionItem)}
                className={`inline-flex items-center gap-1.5 px-3.5 py-2 rounded-md text-xs font-black transition-all cursor-pointer border-2 ${
                  isActionItem
                    ? 'bg-[#8E0E75] text-white border-[#8E0E75] shadow-xs'
                    : 'bg-white text-[#4A4A4A] border-[#D8CFF0] hover:text-[#8E0E75] hover:border-[#8E0E75]'
                }`}
                title="Convertir este mensaje en una tarea / revisión obligatoria"
              >
                <CheckCircle2 className="h-4 w-4" />
                <span>Marcar como Tarea</span>
              </button>

              {/* Botón Mención Rápida */}
              <button
                type="button"
                onClick={() => setInputText((prev) => prev + ' @')}
                className="p-2 rounded-md hover:bg-white text-slate-500 hover:text-[#8E0E75] border border-transparent hover:border-[#D8CFF0] transition-colors cursor-pointer"
                title="Mencionar a un compañero"
              >
                <AtSign className="h-4 w-4" />
              </button>

              {/* Botón Adjuntar Foto / Vídeo para Slack */}
              <input
                type="file"
                ref={fileInputRef}
                onChange={handleFileChange}
                accept="image/*,video/mp4,video/webm,video/quicktime"
                className="hidden"
              />
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                disabled={isUploading || isProcessingAttachment}
                className="p-2 rounded-md hover:bg-white text-slate-500 hover:text-[#8E0E75] border border-transparent hover:border-[#D8CFF0] transition-colors cursor-pointer disabled:opacity-40"
                title="Adjuntar fotografía o vídeo para Slack"
              >
                <Paperclip className="h-4 w-4" />
              </button>
            </div>

            {/* Botón de Envío Grande y Visual */}
            <button
              type="submit"
              disabled={(!inputText.trim() && !pendingAttachment) || isUploading || isProcessingAttachment}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-md bg-[#8E0E75] hover:bg-[#700B5C] disabled:opacity-40 text-white text-xs sm:text-sm font-black uppercase tracking-wider transition-all cursor-pointer shadow-md shadow-[#8E0E75]/25 hover:shadow-lg hover:shadow-[#8E0E75]/35 hover:scale-105 active:scale-95"
            >
              {isUploading ? (
                <>
                  <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                  <span>Subiendo...</span>
                </>
              ) : (
                <>
                  <span>Enviar</span>
                  <Send className="h-4 w-4" />
                </>
              )}
            </button>
          </div>

        </form>
      </footer>

      {/* 6. MODAL VISOR DE MEDIOS (LIGHTBOX DE IMAGEN Y REPRODUCTOR DE VÍDEO SEGURO) */}
      {selectedMedia && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 bg-black/85 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-200"
          onClick={() => setSelectedMedia(null)}
        >
          <div
            className="relative max-w-4xl w-full bg-[#191654] rounded-2xl overflow-hidden border-2 border-[#D0C4EB]/40 shadow-2xl flex flex-col max-h-[90vh]"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Barra Superior del Visor */}
            <div className="px-4 py-3 bg-black/40 border-b border-white/10 flex items-center justify-between text-white">
              <div className="flex items-center gap-2 min-w-0">
                {selectedMedia.type === 'video' ? (
                  <FileVideo className="h-4 w-4 text-[#D8CFF0] shrink-0" />
                ) : (
                  <ImageIcon className="h-4 w-4 text-[#D8CFF0] shrink-0" />
                )}
                <span className="text-xs font-bold truncate max-w-xs sm:max-w-md">
                  {selectedMedia.name}
                </span>
                <span className="text-[11px] font-mono text-white/60 shrink-0">
                  ({formatFileSize(selectedMedia.size)})
                </span>
              </div>

              <div className="flex items-center gap-2">
                <a
                  href={`${selectedMedia.url}${selectedMedia.url.includes('?') ? '&' : '?'}download=1`}
                  download={selectedMedia.name}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-white text-xs font-bold uppercase tracking-wider transition-colors"
                  title="Descargar archivo en su tamaño original"
                >
                  <Download className="h-3.5 w-3.5" />
                  <span>Descargar</span>
                </a>
                <button
                  type="button"
                  onClick={() => setSelectedMedia(null)}
                  className="p-1.5 rounded-lg text-white/70 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
                  title="Cerrar visor"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>
            </div>

            {/* Contenido Visual */}
            <div className="flex-1 flex items-center justify-center p-3 sm:p-5 bg-black/60 overflow-hidden min-h-[300px]">
              {selectedMedia.type === 'image' ? (
                /* eslint-disable-next-line @next/next/no-img-element */
                <img
                  src={selectedMedia.url}
                  alt={selectedMedia.name}
                  className="max-h-[75vh] max-w-full object-contain rounded-lg shadow-lg"
                />
              ) : (
                <video
                  src={selectedMedia.url}
                  controls
                  autoPlay
                  playsInline
                  className="max-h-[75vh] max-w-full rounded-lg shadow-lg outline-none"
                />
              )}
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
