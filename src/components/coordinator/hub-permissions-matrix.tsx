'use client';

import React, { useState, useEffect } from 'react';
import { 
  ShieldCheck, 
  Search, 
  Check, 
  CheckSquare, 
  Square, 
  Sparkles, 
  Users, 
  Info, 
  Clock, 
  Image, 
  Receipt, 
  BookOpen, 
  Share2, 
  Filter,
  CheckCircle2,
  MessageSquare,
  Video
} from 'lucide-react';
import { Profile } from '@/types/database';
import { notify } from '@/lib/feedback';
import { 
  BRAIN_UP_HUB_APPS, 
  HubApp, 
  getStoredPermissionsMap, 
  saveUserAppPermissions,
  DEFAULT_EMPLOYEE_APPS
} from '@/lib/hub-apps';

interface HubPermissionsMatrixProps {
  employees: Profile[];
}

export function HubPermissionsMatrix({ employees }: HubPermissionsMatrixProps) {
  const [permissionsMap, setPermissionsMap] = useState<Record<string, string[]>>({});
  const [searchTerm, setSearchTerm] = useState('');
  const [savedUserId, setSavedUserId] = useState<string | null>(null);

  // Cargar mapa inicial de permisos
  useEffect(() => {
    const stored = getStoredPermissionsMap();
    setPermissionsMap(stored);
  }, []);

  // Iconos por aplicación
  const renderAppIcon = (iconName: HubApp['iconName'], className = 'h-4 w-4') => {
    switch (iconName) {
      case 'Clock':
        return <Clock className={className} />;
      case 'CheckSquare':
        return <CheckSquare className={className} />;
      case 'MessageSquare':
        return <MessageSquare className={className} />;
      case 'Image':
        return <Image className={className} />;
      case 'Users':
        return <Users className={className} />;
      case 'Receipt':
        return <Receipt className={className} />;
      case 'BookOpen':
        return <BookOpen className={className} />;
      case 'Share2':
        return <Share2 className={className} />;
      case 'Video':
        return <Video className={className} />;
      default:
        return <CheckSquare className={className} />;
    }
  };

  // Obtener permisos efectivos para un usuario (por defecto: DEFAULT_EMPLOYEE_APPS si no tiene configuración)
  const getUserAllowedApps = (userId: string): string[] => {
    const list = permissionsMap[userId];
    if (list && Array.isArray(list)) return list;
    return DEFAULT_EMPLOYEE_APPS;
  };

  // Alternar permiso de una app para un usuario
  const handleToggleApp = (userId: string, appId: string) => {
    const current = getUserAllowedApps(userId);
    const updated = current.includes(appId)
      ? current.filter((id) => id !== appId)
      : [...current, appId];

    // No permitir dejar al usuario con 0 aplicaciones (mínimo 1)
    if (updated.length === 0) {
      notify('Cada trabajador debe tener al menos una aplicación asignada en el Hub.', { type: 'warning' });
      return;
    }

    const newMap = { ...permissionsMap, [userId]: updated };
    setPermissionsMap(newMap);
    saveUserAppPermissions(userId, updated);

    // Feedback visual momentáneo
    setSavedUserId(userId);
    setTimeout(() => setSavedUserId(null), 1500);
  };

  // Conceder todas las aplicaciones
  const handleSelectAll = (userId: string) => {
    const allIds = BRAIN_UP_HUB_APPS.map((a) => a.id);
    const newMap = { ...permissionsMap, [userId]: allIds };
    setPermissionsMap(newMap);
    saveUserAppPermissions(userId, allIds);
    setSavedUserId(userId);
    setTimeout(() => setSavedUserId(null), 1500);
  };

  // Asignar solo básicas por defecto (Clockify + TaskFlow)
  const handleSelectBasicOnly = (userId: string) => {
    const basicIds = [...DEFAULT_EMPLOYEE_APPS];
    const newMap = { ...permissionsMap, [userId]: basicIds };
    setPermissionsMap(newMap);
    saveUserAppPermissions(userId, basicIds);
    setSavedUserId(userId);
    setTimeout(() => setSavedUserId(null), 1500);
  };

  // Filtrado de empleados
  const filteredEmployees = employees.filter((emp) => {
    const term = searchTerm.toLowerCase();
    const nameMatch = emp.full_name?.toLowerCase().includes(term);
    const emailMatch = emp.email?.toLowerCase().includes(term);
    const deptMatch = emp.department?.toLowerCase().includes(term);
    return nameMatch || emailMatch || deptMatch;
  });

  return (
    <div className="w-full space-y-6">
      {/* Cabecera Informativa */}
      <div className="w-full rounded-sm border border-[#D8CFF0] bg-white p-6 shadow-sm">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-3 border-b border-[#EAE4F5] gap-3">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-sm bg-[#8E0E75] text-white shadow-xs">
              <ShieldCheck className="h-5 w-5" />
            </div>
            <div>
              <h3 className="font-extrabold uppercase tracking-tight text-base text-[#292929]">
                MATRIZ DE PERMISOS <span className="text-[#8E0E75]">DE APLICACIONES</span>
              </h3>
              <p className="text-xs text-[#4A4A4A] font-light">
                Controla qué herramientas de la Suite Brain Up son visibles para cada trabajador en su Hub personal.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-sm bg-[#F8F6FC] border border-[#D8CFF0] text-[11px] font-extrabold uppercase tracking-wider text-[#8E0E75]">
              <Sparkles className="h-3.5 w-3.5 text-[#8E0E75]" />
              {BRAIN_UP_HUB_APPS.length} Herramientas Integradas
            </span>
          </div>
        </div>

        {/* Explicación Operativa */}
        <div className="pt-3 flex items-start gap-2 text-xs text-[#4A4A4A] leading-relaxed">
          <Info className="h-4 w-4 text-[#8E0E75] shrink-0 mt-0.5" />
          <span>
            <strong>Gestión Limpia y Eficiente:</strong> Si un empleado solo precisa 3 herramientas (ej. Clockify, TaskFlow y Media Hub), desmarca las restantes para que su panel permanezca ordenado y libre de distracciones. Los cambios se sincronizan al instante en el Hub del trabajador.
          </span>
        </div>
      </div>

      {/* Buscador de Empleados */}
      <div className="bg-white border border-[#D8CFF0] p-4 rounded-sm shadow-xs flex flex-col sm:flex-row items-center justify-between gap-3">
        <div className="relative w-full sm:max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[#4A4A4A]" />
          <input
            type="text"
            placeholder="Buscar trabajador por nombre, email o departamento..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-4 py-2 border border-[#D8CFF0] rounded-sm text-xs bg-[#F8F6FC] focus:bg-white focus:border-[#8E0E75] focus:outline-none transition-all"
          />
        </div>

        <div className="text-xs text-[#4A4A4A] font-medium self-end sm:self-auto">
          Mostrando <span className="font-extrabold text-[#8E0E75]">{filteredEmployees.length}</span> trabajadores
        </div>
      </div>

      {/* Tabla Seleccionable Nativa de Permisos */}
      <div className="w-full rounded-sm border border-[#D8CFF0] bg-white overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            
            {/* Encabezado con las 7 aplicaciones */}
            <thead className="bg-[#F8F6FC] border-b border-[#D8CFF0] text-[11px] font-extrabold uppercase tracking-wider text-[#292929]">
              <tr>
                <th className="py-3.5 px-4 min-w-[200px] border-r border-[#EAE4F5] sticky left-0 bg-[#F8F6FC] z-10 shadow-xs">
                  Trabajador / Usuario
                </th>
                <th className="py-3.5 px-3 min-w-[110px] text-center border-r border-[#EAE4F5]">
                  Herramientas Activas
                </th>
                
                {BRAIN_UP_HUB_APPS.map((app) => (
                  <th
                    key={app.id}
                    className="py-3 px-3 min-w-[130px] text-center border-r border-[#EAE4F5] last:border-r-0"
                    title={app.description}
                  >
                    <div className="flex flex-col items-center gap-1">
                      <div className="p-1.5 rounded-sm bg-white border border-[#D8CFF0] text-[#8E0E75] shadow-xs">
                        {renderAppIcon(app.iconName, 'h-4 w-4')}
                      </div>
                      <span className="font-extrabold text-[#292929] leading-tight block truncate max-w-[120px]">
                        {app.name.replace('Brain Up ', '')}
                      </span>
                      <span className="text-[11px] font-bold text-slate-400 capitalize">
                        {app.badge}
                      </span>
                    </div>
                  </th>
                ))}

                <th className="py-3.5 px-4 text-right min-w-[130px]">
                  Acciones Rápidas
                </th>
              </tr>
            </thead>

            {/* Filas de Empleados */}
            <tbody className="divide-y divide-[#EAE4F5]">
              {filteredEmployees.length === 0 ? (
                <tr>
                  <td colSpan={2 + BRAIN_UP_HUB_APPS.length + 1} className="py-10 text-center text-[#4A4A4A]">
                    No se encontraron trabajadores que coincidan con la búsqueda.
                  </td>
                </tr>
              ) : (
                filteredEmployees.map((emp) => {
                  const allowedApps = getUserAllowedApps(emp.id);
                  const isSavedNow = savedUserId === emp.id;
                  const initials = emp.full_name
                    ? emp.full_name
                        .split(' ')
                        .filter(Boolean)
                        .map((n) => n[0])
                        .join('')
                        .slice(0, 2)
                        .toUpperCase()
                    : 'BU';

                  return (
                    <tr
                      key={emp.id}
                      className={`hover:bg-[#F8F6FC]/60 transition-colors ${
                        isSavedNow ? 'bg-emerald-50/50' : ''
                      }`}
                    >
                      {/* Columna 1: Datos del Trabajador */}
                      <td className="py-3.5 px-4 border-r border-[#EAE4F5] sticky left-0 bg-white z-10">
                        <div className="flex items-center gap-2.5">
                          <div className="h-8 w-8 rounded-full bg-gradient-to-r from-[#191654] to-[#8E0E75] text-white flex items-center justify-center font-extrabold text-[11px] shrink-0">
                            {initials}
                          </div>
                          <div className="min-w-0">
                            <span className="font-bold text-[#292929] block truncate">
                              {emp.full_name}
                            </span>
                            <span className="text-[11px] text-[#4A4A4A] block truncate font-mono">
                              {emp.department || 'Operaciones'} • {emp.role === 'coordinator' ? 'Coordinador' : 'Empleado'}
                            </span>
                          </div>
                        </div>
                      </td>

                      {/* Columna 2: Contador de Herramientas */}
                      <td className="py-3.5 px-3 text-center border-r border-[#EAE4F5]">
                        <span
                          className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-sm text-[11px] font-extrabold uppercase tracking-wider border ${
                            allowedApps.length === BRAIN_UP_HUB_APPS.length
                              ? 'bg-emerald-50 text-emerald-800 border-emerald-300'
                              : allowedApps.length >= 3
                              ? 'bg-[#8E0E75]/10 text-[#8E0E75] border-[#8E0E75]/30'
                              : 'bg-amber-50 text-amber-800 border-amber-300'
                          }`}
                        >
                          {allowedApps.length} de {BRAIN_UP_HUB_APPS.length}
                        </span>
                      </td>

                      {/* Columnas 3 a 9: Checkbox nativo seleccionable por cada app */}
                      {BRAIN_UP_HUB_APPS.map((app) => {
                        const isChecked = allowedApps.includes(app.id);

                        return (
                          <td
                            key={app.id}
                            className="py-3 px-3 text-center border-r border-[#EAE4F5] last:border-r-0"
                          >
                            <label className="inline-flex items-center justify-center cursor-pointer p-1 rounded-sm hover:bg-[#F8F6FC] transition-colors">
                              <input
                                type="checkbox"
                                checked={isChecked}
                                onChange={() => handleToggleApp(emp.id, app.id)}
                                className="h-4 w-4 rounded-xs border-2 border-[#D8CFF0] text-[#8E0E75] focus:ring-[#8E0E75] focus:ring-offset-0 cursor-pointer accent-[#8E0E75]"
                                title={`${isChecked ? 'Quitar' : 'Asignar'} ${app.name} para ${emp.full_name}`}
                              />
                            </label>
                          </td>
                        );
                      })}

                      {/* Columna 10: Botones de Acción Rápida */}
                      <td className="py-3.5 px-4 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            type="button"
                            onClick={() => handleSelectAll(emp.id)}
                            className="px-2 py-1 rounded-sm border border-[#D8CFF0] bg-[#F8F6FC] hover:bg-white text-[11px] font-bold text-[#8E0E75] uppercase tracking-wider transition-colors cursor-pointer"
                            title={`Dar acceso a las ${BRAIN_UP_HUB_APPS.length} herramientas`}
                          >
                            Todas ({BRAIN_UP_HUB_APPS.length})
                          </button>
                          <button
                            type="button"
                            onClick={() => handleSelectBasicOnly(emp.id)}
                            className="px-2 py-1 rounded-sm border border-[#D8CFF0] bg-white hover:bg-[#F8F6FC] text-[11px] font-bold text-[#4A4A4A] uppercase tracking-wider transition-colors cursor-pointer"
                            title={`Asignar solo las básicas (${DEFAULT_EMPLOYEE_APPS.join(', ')})`}
                          >
                            Básicas ({DEFAULT_EMPLOYEE_APPS.length})
                          </button>
                        </div>
                      </td>

                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
