'use client';

import React, { useState, useEffect } from 'react';
import { HostingService } from '@/types/hosting';
import { generateClientNotificationEmail } from '@/lib/hosting-service';
import { notify } from '@/lib/feedback';
import { X, Copy, Mail, Check, Send } from 'lucide-react';

interface HostingEmailModalProps {
  isOpen: boolean;
  onClose: () => void;
  service: HostingService | null;
  daysRemaining: number;
}

export function HostingEmailModal({
  isOpen,
  onClose,
  service,
  daysRemaining,
}: HostingEmailModalProps) {
  const [subject, setSubject] = useState('');
  const [body, setBody] = useState('');
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (service) {
      const email = generateClientNotificationEmail(service, daysRemaining);
      setSubject(email.subject);
      setBody(email.body);
    }
  }, [service, daysRemaining]);

  if (!isOpen || !service) return null;

  const handleCopy = async () => {
    const fullText = `Asunto: ${subject}\n\n${body}`;
    try {
      await navigator.clipboard.writeText(fullText);
      setCopied(true);
      notify('Plantilla copiada al portapapeles.', { type: 'success' });
      setTimeout(() => setCopied(false), 2000);
    } catch {
      notify('No se pudo copiar automáticamente al portapapeles.', { type: 'error' });
    }
  };

  const handleOpenMailto = () => {
    const mailtoUrl = `mailto:?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
    window.open(mailtoUrl, '_blank');
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs">
      <div 
        className="w-full max-w-2xl bg-white rounded-3xl shadow-2xl border border-[#D8CFF0] overflow-hidden flex flex-col max-h-[90vh] animate-in zoom-in-95 duration-200"
        role="dialog"
        aria-modal="true"
      >
        {/* Cabecera */}
        <div className="p-5 sm:p-6 border-b border-[#D8CFF0] bg-[#191654] bg-gradient-to-r from-[#191654] to-[#8E0E75] text-white flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-white/20 border border-white/30 flex items-center justify-center shrink-0">
              <Mail className="h-5 w-5 text-white" />
            </div>
            <div>
              <h3 className="text-base font-black uppercase tracking-tight">
                Plantilla de Aviso para el Cliente
              </h3>
              <p className="text-xs text-white/80 font-light mt-0.5">
                {service.name} · {service.client_name || 'Cliente'}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="h-9 w-9 rounded-xl bg-white/10 hover:bg-white/20 flex items-center justify-center text-white transition-colors cursor-pointer"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Formulario editable de previsualización */}
        <div className="p-5 sm:p-6 space-y-4 overflow-y-auto flex-1 font-sans">
          <div>
            <label className="block text-xs font-black uppercase tracking-wider text-[#292929] mb-1.5">
              Línea de Asunto
            </label>
            <input
              type="text"
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-xl border border-[#D8CFF0] bg-[#F8F6FC] text-xs font-bold text-[#292929] focus:outline-hidden focus:border-[#8E0E75]"
            />
          </div>

          <div>
            <label className="block text-xs font-black uppercase tracking-wider text-[#292929] mb-1.5">
              Cuerpo del Mensaje
            </label>
            <textarea
              rows={11}
              value={body}
              onChange={(e) => setBody(e.target.value)}
              className="w-full p-3.5 rounded-xl border border-[#D8CFF0] bg-[#F8F6FC] text-xs text-[#292929] leading-relaxed font-sans focus:outline-hidden focus:border-[#8E0E75] resize-y"
            />
          </div>
        </div>

        {/* Botones de acción */}
        <div className="p-4 sm:p-5 border-t border-[#D8CFF0] bg-[#F8F6FC] flex flex-wrap items-center justify-between gap-3">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-xl border border-[#D8CFF0] bg-white text-xs font-bold text-[#4A4A4A] hover:bg-slate-50 cursor-pointer"
          >
            Cerrar
          </button>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleOpenMailto}
              className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl border border-[#D8CFF0] bg-white hover:bg-slate-50 text-[#8E0E75] text-xs font-extrabold transition-all cursor-pointer shadow-2xs hover:border-[#8E0E75]"
            >
              <Send className="h-3.5 w-3.5" />
              <span>Abrir en Email</span>
            </button>

            <button
              type="button"
              onClick={handleCopy}
              className="inline-flex items-center gap-1.5 px-5 py-2.5 rounded-xl bg-[#8E0E75] hover:bg-[#700B5C] text-white text-xs font-extrabold uppercase tracking-wider transition-all cursor-pointer shadow-md shadow-[#8E0E75]/25"
            >
              {copied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
              <span>{copied ? '¡Copiado!' : 'Copiar Texto'}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

