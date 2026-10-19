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
  Calendar
} from 'lucide-react';
import { Channel, ChatMessage } from '@/types/chat';
import { Profile } from '@/types/database';

interface ChatViewProps {
  channel: Channel;
  messages: ChatMessage[];
  currentUser: Profile | null;
  profiles: Profile[];
  onSendMessage: (
    content: string,
    isActionItem: boolean,
    assignedTo?: string | null,
    priority?: 'normal' | 'urgent'
  ) => void;
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

  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Auto-scroll al final con cada mensaje nuevo
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const channelTasks = messages.filter((m) => m.is_action_item);
  const channelPinned = messages.filter((m) => m.is_pinned);

  const handleSend = (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputText.trim()) return;

    onSendMessage(
      inputText.trim(),
      isActionItem,
      isActionItem ? selectedAssignee : undefined,
      taskPriority
    );

    setInputText('');
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
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-2xs bg-[#8E0E75]/10 text-[#8E0E75] border border-[#8E0E75]/20 truncate">
                  {channel.company.name}
                </span>
              )}
            </div>
            {channel.description && (
              <p className="text-[10px] text-[#4A4A4A] truncate max-w-md">
                {channel.description}
              </p>
            )}
          </div>
        </div>

        {/* Botones de Cabecera: Tareas y Fijados */}
        <div className="flex items-center gap-2 shrink-0">
          <button
            type="button"
            onClick={() => {
              setShowTasksDrawer(!showTasksDrawer);
              setShowPinnedDrawer(false);
            }}
            className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-sm text-xs font-bold transition-all cursor-pointer border ${
              showTasksDrawer
                ? 'bg-[#8E0E75] text-white border-[#8E0E75] shadow-xs'
                : 'bg-[#F8F6FC] text-[#292929] border-[#D8CFF0] hover:bg-white hover:border-[#8E0E75]'
            }`}
            title="Ver tareas de este cliente/canal"
          >
            <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" />
            <span>Tareas ({channelTasks.filter(t => !t.is_completed).length})</span>
          </button>

          <button
            type="button"
            onClick={() => {
              setShowPinnedDrawer(!showPinnedDrawer);
              setShowTasksDrawer(false);
            }}
            className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-sm text-xs font-bold transition-all cursor-pointer border ${
              showPinnedDrawer
                ? 'bg-[#8E0E75] text-white border-[#8E0E75] shadow-xs'
                : 'bg-[#F8F6FC] text-[#292929] border-[#D8CFF0] hover:bg-white hover:border-[#8E0E75]'
            }`}
            title="Ver información fijada importante"
          >
            <Pin className="h-3.5 w-3.5 text-amber-600" />
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
                className="group relative flex items-start gap-3 p-2 rounded-sm hover:bg-[#F8F6FC] transition-colors"
              >
                {/* Avatar */}
                <div className="h-8 w-8 rounded-full bg-[#191654] text-white text-xs font-bold flex items-center justify-center shrink-0 ring-1 ring-white/50">
                  {initials}
                </div>

                {/* Contenido Principal */}
                <div className="flex-1 min-w-0 space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-extrabold text-[#292929]">
                      {msg.sender_name || 'Compañero Brain Up'}
                    </span>
                    <span className="text-[10px] text-slate-400">
                      {new Date(msg.created_at).toLocaleTimeString('es-ES', {
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </span>
                    {msg.is_pinned && (
                      <span className="inline-flex items-center gap-1 text-[9px] font-bold px-1.5 py-0.2 rounded-2xs bg-amber-50 text-amber-800 border border-amber-200">
                        <Pin className="h-2.5 w-2.5" />
                        <span>Fijado</span>
                      </span>
                    )}
                  </div>

                  {/* Texto ordinario o Tarjeta de Tarea Accionable */}
                  {msg.is_action_item ? (
                    <div className="rounded-sm border-l-4 border-l-[#8E0E75] bg-[#F8F6FC] border border-[#D8CFF0] p-3 space-y-2 max-w-xl">
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-1.5">
                          <CheckCircle2 className="h-3.5 w-3.5 text-[#8E0E75]" />
                          <span className="text-[10px] font-black uppercase tracking-wider text-[#8E0E75]">
                            Tarea para: {msg.assigned_name || (isAssignedToMe ? 'Ti' : 'Equipo')}
                          </span>
                        </div>
                        <span className={`text-[9px] font-extrabold uppercase px-1.5 py-0.5 rounded-2xs ${
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

                      <div className="flex items-center justify-between pt-1 text-[10px]">
                        <button
                          type="button"
                          onClick={() => onToggleCompleteActionItem(msg.id, msg.is_completed)}
                          className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-xs font-extrabold uppercase text-[10px] transition-all cursor-pointer ${
                            msg.is_completed
                              ? 'bg-emerald-600 text-white'
                              : 'bg-white border border-[#3BB54A] text-[#3BB54A] hover:bg-emerald-50'
                          }`}
                        >
                          <Check className="h-3 w-3" />
                          <span>{msg.is_completed ? 'Hecho' : 'Marcar como Revisado'}</span>
                        </button>

                        {msg.priority === 'urgent' && (
                          <span className="text-red-600 font-extrabold uppercase text-[9px] tracking-wider">
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
                </div>

                {/* Barra Flotante de Acciones Rápidas en Hover (Slack Style) */}
                <div className="opacity-0 group-hover:opacity-100 transition-opacity absolute right-2 top-2 bg-white border border-[#D8CFF0] rounded-sm shadow-xs flex items-center p-0.5 gap-0.5 z-10">
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
                  <div className="absolute right-2 top-10 bg-white border border-[#8E0E75] p-3 rounded-sm shadow-xl z-20 w-64 space-y-2 animate-in fade-in duration-150">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-black uppercase text-[#8E0E75]">
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
                    className="p-2.5 rounded-sm bg-white border border-[#D8CFF0] space-y-1.5 shadow-2xs"
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-bold text-[#8E0E75]">
                        @{task.assigned_name || 'Equipo'}
                      </span>
                      <span className={`text-[8px] font-bold uppercase px-1 py-0.2 rounded-2xs ${
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
                      className="text-[10px] font-bold text-[#3BB54A] hover:underline cursor-pointer"
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
                    className="p-2.5 rounded-sm bg-white border border-[#D8CFF0] space-y-1 shadow-2xs"
                  >
                    <div className="flex items-center justify-between text-[10px] text-slate-400">
                      <span className="font-bold text-[#191654]">{msg.sender_name}</span>
                      <span>{new Date(msg.created_at).toLocaleDateString('es-ES', { day: 'numeric', month: 'short' })}</span>
                    </div>
                    <p className="text-xs font-medium text-[#292929] leading-snug">
                      {msg.content}
                    </p>
                    <button
                      type="button"
                      onClick={() => onTogglePinMessage(msg.id, true)}
                      className="text-[10px] font-bold text-slate-400 hover:text-red-600 transition-colors cursor-pointer"
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
        <form onSubmit={handleSend} className="rounded-sm border border-[#D8CFF0] focus-within:border-[#8E0E75] focus-within:ring-1 focus-within:ring-[#8E0E75] transition-all bg-white shadow-2xs">
          
          {/* Fila Superior de Configuración: Toggle de Tarea Accionable */}
          {isActionItem && (
            <div className="p-2 bg-[#F8F6FC] border-b border-[#D8CFF0] flex flex-wrap items-center justify-between gap-2 text-xs">
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-black uppercase text-[#8E0E75] flex items-center gap-1">
                  <CheckCircle2 className="h-3 w-3" />
                  <span>Crear como Tarea para:</span>
                </span>
                <select
                  value={selectedAssignee}
                  onChange={(e) => setSelectedAssignee(e.target.value)}
                  className="px-2 py-0.5 rounded-xs bg-white border border-[#D8CFF0] text-xs font-bold text-[#292929] outline-none"
                >
                  <option value="current_user">A mí (Alejandro Ramos)</option>
                  <option value="user-albert-1">Albert Barceló (Coordinación)</option>
                  <option value="user-denilson-1">Denilson Diseñador</option>
                  <option value="team-all">Todo el Equipo</option>
                </select>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setTaskPriority(taskPriority === 'urgent' ? 'normal' : 'urgent')}
                  className={`px-2 py-0.5 rounded-xs text-[10px] font-black uppercase tracking-wider transition-all cursor-pointer border ${
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
          <div className="px-3 py-1.5 bg-[#F8F6FC] border-t border-slate-100 flex items-center justify-between gap-2">
            <div className="flex items-center gap-1.5 text-slate-500">
              
              {/* Toggle de Tarea Accionable */}
              <button
                type="button"
                onClick={() => setIsActionItem(!isActionItem)}
                className={`inline-flex items-center gap-1 px-2 py-1 rounded-sm text-xs font-bold transition-all cursor-pointer border ${
                  isActionItem
                    ? 'bg-[#8E0E75] text-white border-[#8E0E75] shadow-2xs'
                    : 'bg-white text-[#4A4A4A] border-[#D8CFF0] hover:text-[#8E0E75]'
                }`}
                title="Convertir este mensaje en una tarea / revisión obligatoria"
              >
                <CheckCircle2 className="h-3.5 w-3.5" />
                <span>Marcar como Tarea</span>
              </button>

              {/* Botón Mención Rápida */}
              <button
                type="button"
                onClick={() => setInputText((prev) => prev + ' @')}
                className="p-1 rounded-sm hover:bg-white text-slate-500 hover:text-[#8E0E75] transition-colors cursor-pointer"
                title="Mencionar a un compañero"
              >
                <AtSign className="h-3.5 w-3.5" />
              </button>
            </div>

            {/* Botón de Envío */}
            <button
              type="submit"
              disabled={!inputText.trim()}
              className="inline-flex items-center gap-1.5 px-3 py-1 rounded-sm bg-[#8E0E75] hover:bg-[#700B5C] disabled:opacity-40 text-white text-xs font-extrabold uppercase tracking-wider transition-all cursor-pointer shadow-xs"
            >
              <span>Enviar</span>
              <Send className="h-3 w-3" />
            </button>
          </div>

        </form>
      </footer>

    </div>
  );
}
