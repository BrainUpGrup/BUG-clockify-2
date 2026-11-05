'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/context/auth-context';
import { canUserAccessHubApp } from '@/lib/hub-apps';
import { HostingService, HostingMetrics, HostingAlert } from '@/types/hosting';
import { 
  getHostingServices, 
  saveHostingService, 
  deleteHostingService, 
  renewHostingService, 
  computeHostingMetrics, 
  getHostingAlerts,
  calculateDaysRemaining,
  exportHostingToCSV,
  markNotificationSent
} from '@/lib/hosting-service';
import { HostingStats } from '@/components/hosting/hosting-stats';
import { HostingNotificationsDrawer } from '@/components/hosting/hosting-notifications-drawer';
import { HostingModal } from '@/components/hosting/hosting-modal';
import { HostingEmailModal } from '@/components/hosting/hosting-email-modal';
import { HostingImportModal } from '@/components/hosting/hosting-import-modal';
import { HostingRenewalConfirmModal } from '@/components/hosting/hosting-renewal-confirm-modal';
import { notify } from '@/lib/feedback';
import { 
  Server, 
  Globe, 
  Search, 
  Plus, 
  Download, 
  Upload, 
  Bell, 
  RefreshCw, 
  Mail, 
  Edit3, 
  Trash2, 
  Filter, 
  ArrowUpDown, 
  Clock, 
  CheckCircle2, 
  AlertTriangle,
  ExternalLink,
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  Layers,
  CornerDownRight
} from 'lucide-react';
import { AppSelect } from '@/components/ui/app-select';

export default function HostingPage() {
  const router = useRouter();
  const { user, isLoading: authLoading } = useAuth();

  const [services, setServices] = useState<HostingService[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Multihosting: IDs de hostings padre actualmente expandidos
  const [expandedHostingIds, setExpandedHostingIds] = useState<Set<string>>(new Set());
  const [defaultParentForCreate, setDefaultParentForCreate] = useState<string | null>(null);

  // Filtros y Búsqueda
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [providerFilter, setProviderFilter] = useState<string>('all');
  const [serviceTypeFilter, setServiceTypeFilter] = useState<string>('all');
  const [autoRenewFilter, setAutoRenewFilter] = useState<string>('all');
  const [sortBy, setSortBy] = useState<'expiration_asc' | 'expiration_desc' | 'name_asc'>('expiration_asc');

  // Alternar desplegable de Hosting con subhostings
  const toggleExpandHosting = (id: string) => {
    setExpandedHostingIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  // Paginación compacta para 150+ registros
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 25;

  // Modales y Paneles
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [editingService, setEditingService] = useState<HostingService | null>(null);
  const [isEmailModalOpen, setIsEmailModalOpen] = useState(false);
  const [emailServiceTarget, setEmailServiceTarget] = useState<{ service: HostingService; days: number } | null>(null);
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [renewalConfirmService, setRenewalConfirmService] = useState<HostingService | null>(null);

  // Protección de ruta
  useEffect(() => {
    if (!authLoading && !user) {
      router.replace('/login');
    }
  }, [user, authLoading, router]);

  // Cargar servicios
  const loadData = async () => {
    setIsLoading(true);
    try {
      const data = await getHostingServices();
      setServices(data);
    } catch (e) {
      console.error('Error cargando servicios de hosting:', e);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();

    const handleUpdate = () => loadData();
    window.addEventListener('bug_hosting_updated', handleUpdate);
    return () => window.removeEventListener('bug_hosting_updated', handleUpdate);
  }, []);

  // Métricas y Alertas calculadas en tiempo real
  const metrics = useMemo(() => computeHostingMetrics(services), [services]);
  const alerts = useMemo(() => getHostingAlerts(services), [services]);

  // Multihosting: Mapeo de Subhostings por ID de Hosting Padre
  const subhostingsByParent = useMemo(() => {
    const map = new Map<string, HostingService[]>();
    services.forEach((s) => {
      if (s.service_type === 'Subhosting' && s.parent_id) {
        const list = map.get(s.parent_id) || [];
        list.push(s);
        map.set(s.parent_id, list);
      }
    });
    return map;
  }, [services]);

  // Lista de Hostings disponibles para actuar como servidores padre
  const parentHostingsList = useMemo(() => {
    return services.filter((s) => s.service_type === 'Hosting');
  }, [services]);

  // Filtrado y ordenación
  const filteredServices = useMemo(() => {
    return services.filter((s) => {
      // Si no estamos filtrando expresamente por 'Subhosting', y este servicio es un Subhosting asignado a un padre existente,
      // no lo mostramos suelto en la raíz (se muestra anidado dentro del desplegable de su Hosting principal).
      if (serviceTypeFilter !== 'Subhosting' && s.service_type === 'Subhosting' && s.parent_id) {
        const hasParent = services.some((p) => p.id === s.parent_id);
        if (hasParent) return false;
      }

      // 1. Búsqueda por texto (nombre de dominio, cliente o proveedor)
      if (searchTerm.trim()) {
        const query = searchTerm.toLowerCase();
        const matchesName = (s.name || '').toLowerCase().includes(query);
        const matchesClient = (s.client_name || '').toLowerCase().includes(query);
        const matchesProvider = (s.provider || '').toLowerCase().includes(query);

        // También comprobar si alguno de sus subhostings hijos coincide
        const childMatches = (subhostingsByParent.get(s.id) || []).some(
          (child) =>
            (child.name || '').toLowerCase().includes(query) ||
            (child.client_name || '').toLowerCase().includes(query) ||
            (child.provider || '').toLowerCase().includes(query)
        );

        if (!matchesName && !matchesClient && !matchesProvider && !childMatches) return false;
      }

      // 2. Filtro por tipo de servicio
      if (serviceTypeFilter !== 'all') {
        if ((s.service_type || '').toLowerCase() !== serviceTypeFilter.toLowerCase()) {
          return false;
        }
      }

      // 3. Filtro por proveedor oficial
      if (providerFilter !== 'all') {
        const provLower = (s.provider || '').toLowerCase();
        if (!provLower.includes(providerFilter.toLowerCase())) {
          return false;
        }
      }

      // 4. Filtro por auto-renovación
      if (autoRenewFilter !== 'all') {
        const isAuto = autoRenewFilter === 'enabled';
        if (Boolean(s.auto_renew) !== isAuto) return false;
      }

      // 5. Filtro por estado de días restantes
      if (statusFilter !== 'all') {
        const days = calculateDaysRemaining(s.expiration_date);
        if (statusFilter === 'expired') return days < 0;
        if (statusFilter === 'critical_7') return days >= 0 && days <= 7;
        if (statusFilter === 'warning_15') return days > 7 && days <= 15;
        if (statusFilter === 'notice_30') return days >= 0 && days <= 30;
        if (statusFilter === 'pre_90') return days > 30 && days <= 90;
      }

      return true;
    }).sort((a, b) => {
      if (sortBy === 'expiration_asc') {
        return (a.expiration_date || '').localeCompare(b.expiration_date || '');
      }
      if (sortBy === 'expiration_desc') {
        return (b.expiration_date || '').localeCompare(a.expiration_date || '');
      }
      return (a.name || '').localeCompare(b.name || '');
    });
  }, [services, searchTerm, statusFilter, providerFilter, serviceTypeFilter, autoRenewFilter, sortBy, subhostingsByParent]);

  // Paginación
  const totalPages = Math.ceil(filteredServices.length / pageSize) || 1;
  const paginatedServices = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filteredServices.slice(start, start + pageSize);
  }, [filteredServices, currentPage, pageSize]);

  // Restablecer a página 1 cuando cambian los filtros
  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, statusFilter, providerFilter, serviceTypeFilter, autoRenewFilter, sortBy]);

  // Manejar guardado de servicio
  const handleSaveService = async (service: HostingService) => {
    await saveHostingService(service);
    await loadData();
    notify(editingService ? 'Servicio actualizado correctamente.' : 'Nuevo servicio creado.', { type: 'success' });
  };

  // Manejar eliminación de servicio
  const handleDeleteService = async (id: string, name: string) => {
    if (window.confirm(`¿Estás seguro de que deseas eliminar el servicio ${name}?`)) {
      await deleteHostingService(id);
      await loadData();
      notify(`Servicio ${name} eliminado.`, { type: 'success' });
    }
  };

  // Manejar renovación (+1 año)
  const handleRenewService = async (id: string) => {
    await renewHostingService(id, 1);
    await loadData();
  };

  // Manejar alternar etapa de notificación
  const handleToggleNotificationStage = async (id: string, stage: '7' | '15' | '30' | '60' | '90') => {
    await markNotificationSent(id, stage);
    await loadData();
    notify(`Etapa de preaviso (${stage} días) marcada como avisada.`, { type: 'success' });
  };

  // Manejar alternar auto-renovación inline
  const handleToggleAutoRenew = async (service: HostingService) => {
    const updated: HostingService = {
      ...service,
      auto_renew: !service.auto_renew,
      updated_at: new Date().toISOString(),
    };
    await saveHostingService(updated);
    await loadData();
    notify(`Renovación automática ${updated.auto_renew ? 'activada' : 'desactivada'} para ${service.name}.`, { type: 'info' });
  };

  // Exportar CSV
  const handleExportCSV = () => {
    try {
      const csv = exportHostingToCSV(services);
      const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `brain_up_hosting_${new Date().toISOString().split('T')[0]}.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
      notify('Exportación CSV completada con éxito.', { type: 'success' });
    } catch {
      notify('Error al exportar a CSV.', { type: 'error' });
    }
  };

  // Importar CSV
  const handleImportCSV = async (importedList: HostingService[], replaceAll: boolean) => {
    if (replaceAll) {
      if (typeof window !== 'undefined') {
        localStorage.setItem('bug_hosting_services_cache', JSON.stringify(importedList));
      }
      setServices(importedList);
    } else {
      const existingMap = new Map(services.map((s) => [s.name.toLowerCase(), s]));
      importedList.forEach((imp) => {
        existingMap.set(imp.name.toLowerCase(), imp);
      });
      const combined = Array.from(existingMap.values());
      if (typeof window !== 'undefined') {
        localStorage.setItem('bug_hosting_services_cache', JSON.stringify(combined));
      }
      setServices(combined);
    }
    await loadData();
  };

  // Abrir modal de email
  const handleOpenEmail = (service: HostingService, days: number) => {
    setEmailServiceTarget({ service, days });
    setIsEmailModalOpen(true);
  };

  if (authLoading || !user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#F8F6FC]">
        <div className="flex flex-col items-center gap-3">
          <div className="h-10 w-10 animate-spin rounded-full border-4 border-[#D8CFF0] border-t-[#8E0E75]" />
          <p className="text-xs font-bold uppercase tracking-wider text-[#292929]">
            Cargando Brain Up Hosting...
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col w-full font-sans pb-12">
      <main className="page-transition flex-1 w-full max-w-[1600px] mx-auto px-4 sm:px-8 lg:px-12 py-5 sm:py-6 space-y-6">
        
        {/* Cabecera Principal con Identidad La Abuela */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2.5">
              <span className="p-2 rounded-xl bg-white border border-[#D8CFF0] text-[#8E0E75] shadow-xs">
                <Server className="h-5 w-5" />
              </span>
              <h1 className="text-2xl sm:text-3xl font-black uppercase tracking-tight text-[#292929]">
                Brain Up <span className="text-[#8E0E75]">Hosting & Dominios</span>
              </h1>
            </div>
            <p className="text-xs sm:text-sm text-[#4A4A4A]">
              Centro de control de servidores, dominios de clientes y alertas de vencimiento (7, 15, 30, 60 y 90 días).
            </p>
          </div>

          {/* Acciones Principales */}
          <div className="flex flex-wrap items-center gap-2.5">
            {/* Botón Centro de Notificaciones */}
            <button
              type="button"
              onClick={() => setIsDrawerOpen(true)}
              className="relative inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-white border-2 border-[#8E0E75] text-[#8E0E75] hover:bg-[#F8F6FC] text-xs font-black uppercase tracking-wider transition-all cursor-pointer shadow-xs hover:scale-105 active:scale-95"
            >
              <Bell className="h-4 w-4 text-[#8E0E75]" />
              <span>Centro de Notificaciones</span>
              {alerts.length > 0 && (
                <span className="ml-1 px-2 py-0.5 rounded-full text-[11px] font-black bg-red-600 text-white">
                  {alerts.length}
                </span>
              )}
            </button>

            {/* Importar CSV */}
            <button
              type="button"
              onClick={() => setIsImportModalOpen(true)}
              className="inline-flex items-center gap-2 px-3.5 py-2.5 rounded-xl border border-[#D8CFF0] bg-white hover:bg-[#F8F6FC] text-[#4A4A4A] hover:text-[#8E0E75] text-xs font-extrabold uppercase tracking-tight transition-all cursor-pointer shadow-xs"
              title="Importar archivo CSV de Cdmon u otros proveedores"
            >
              <Upload className="h-4 w-4" />
              <span>Importar CSV</span>
            </button>

            {/* Exportar CSV */}
            <button
              type="button"
              onClick={handleExportCSV}
              className="inline-flex items-center gap-2 px-3.5 py-2.5 rounded-xl border border-[#D8CFF0] bg-white hover:bg-[#F8F6FC] text-[#4A4A4A] hover:text-[#8E0E75] text-xs font-extrabold uppercase tracking-tight transition-all cursor-pointer shadow-xs"
              title="Descargar listado completo en archivo CSV"
            >
              <Download className="h-4 w-4" />
              <span>Exportar CSV</span>
            </button>

            {/* Crear Manual */}
            <button
              type="button"
              onClick={() => {
                setEditingService(null);
                setIsCreateModalOpen(true);
              }}
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-[#8E0E75] hover:bg-[#700B5C] text-white text-xs font-black uppercase tracking-wider transition-all cursor-pointer shadow-md shadow-[#8E0E75]/25 hover:scale-105 active:scale-95"
            >
              <Plus className="h-4 w-4" />
              <span>Nuevo Servicio</span>
            </button>
          </div>
        </div>

        {/* Tarjetas de Métricas Ejecutivas */}
        <HostingStats
          metrics={metrics}
          activeFilter={statusFilter}
          onSelectFilter={setStatusFilter}
          onOpenNotifications={() => setIsDrawerOpen(true)}
        />

        {/* Barra de Búsqueda y Filtros */}
        <div className="p-4 rounded-2xl bg-white border border-[#D8CFF0] shadow-xs space-y-3">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-12 gap-3">
            {/* Buscador de texto */}
            <div className="lg:col-span-4 relative">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
              <input
                type="text"
                placeholder="Buscar por dominio, cliente o proveedor..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-[#D8CFF0] bg-[#F8F6FC] text-xs text-[#292929] focus:outline-hidden focus:border-[#8E0E75]"
              />
            </div>

            {/* Filtro por Proveedor Oficial */}
            <div className="lg:col-span-2">
              <AppSelect
                value={providerFilter}
                onChange={setProviderFilter}
                options={[
                  { value: 'all', label: 'Proveedores: Todos' },
                  { value: 'cdmon', label: 'Cdmon' },
                  { value: 'hostinger', label: 'Hostinger' },
                  { value: 'raiola', label: 'Raiola Networks' },
                ]}
              />
            </div>

            {/* Filtro por tipo de servicio */}
            <div className="lg:col-span-2">
              <AppSelect
                value={serviceTypeFilter}
                onChange={setServiceTypeFilter}
                options={[
                  { value: 'all', label: 'Todos los servicios' },
                  { value: 'Hosting', label: 'Solo Hostings' },
                  { value: 'Dominio', label: 'Solo Dominios' },
                  { value: 'Correo', label: 'Solo Correos' },
                  { value: 'Subhosting', label: 'Solo Subhostings' },
                ]}
              />
            </div>

            {/* Filtro por auto-renovación */}
            <div className="lg:col-span-2">
              <AppSelect
                value={autoRenewFilter}
                onChange={setAutoRenewFilter}
                options={[
                  { value: 'all', label: 'Auto-renovación: Todas' },
                  { value: 'enabled', label: 'Activada' },
                  { value: 'disabled', label: 'Desactivada' },
                ]}
              />
            </div>

            {/* Ordenación */}
            <div className="lg:col-span-2">
              <AppSelect
                value={sortBy}
                onChange={(val) => setSortBy(val as any)}
                options={[
                  { value: 'expiration_asc', label: 'Vence antes (Urgentes)' },
                  { value: 'expiration_desc', label: 'Vence más tarde' },
                  { value: 'name_asc', label: 'Nombre (A - Z)' },
                ]}
              />
            </div>
          </div>

          {/* Resumen de resultados filtrados */}
          <div className="flex items-center justify-between text-xs text-[#4A4A4A] pt-1">
            <span>
              Mostrando <strong>{filteredServices.length}</strong> de {services.length} servicios registrados
              {statusFilter !== 'all' && <span className="ml-1 text-[#8E0E75] font-bold">(filtro activo: {statusFilter})</span>}
              {providerFilter !== 'all' && <span className="ml-1 text-[#191654] font-bold">(proveedor: {providerFilter})</span>}
            </span>
            {(searchTerm || statusFilter !== 'all' || providerFilter !== 'all' || serviceTypeFilter !== 'all' || autoRenewFilter !== 'all') && (
              <button
                type="button"
                onClick={() => {
                  setSearchTerm('');
                  setStatusFilter('all');
                  setProviderFilter('all');
                  setServiceTypeFilter('all');
                  setAutoRenewFilter('all');
                }}
                className="text-[#8E0E75] font-bold hover:underline cursor-pointer"
              >
                Limpiar todos los filtros
              </button>
            )}
          </div>
        </div>

        {/* Tabla de Servicios de Alta Densidad */}
        <div className="rounded-2xl border border-[#D8CFF0] bg-white shadow-xs overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-[#F8F6FC] border-b border-[#D8CFF0] text-[11px] font-black uppercase tracking-wider text-[#4A4A4A]">
                <tr>
                  <th className="py-3.5 px-4">Dominio / Servicio</th>
                  <th className="py-3.5 px-3">Tipo</th>
                  <th className="py-3.5 px-3">Proveedor</th>
                  <th className="py-3.5 px-3">Cliente Asignado</th>
                  <th className="py-3.5 px-3">Ciclo</th>
                  <th className="py-3.5 px-4">Tiempo Restante / Vencimiento</th>
                  <th className="py-3.5 px-3 text-center">Auto-Renovación</th>
                  <th className="py-3.5 px-4 text-right">Acciones</th>
                </tr>
              </thead>

              <tbody className="divide-y divide-[#EAE4F5]">
                {paginatedServices.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="py-12 text-center text-[#4A4A4A]">
                      No se encontraron servicios de hosting que coincidan con los criterios.
                    </td>
                  </tr>
                ) : (
                  paginatedServices.map((service) => {
                    const days = calculateDaysRemaining(service.expiration_date);
                    const isExpired = days < 0;
                    const isCritical = days >= 0 && days <= 7;
                    const isWarning = days > 7 && days <= 15;
                    const isNotice = days > 15 && days <= 30;

                    // Multihosting: calcular si es Hosting y tiene subhostings anidados debajo
                    const childSubhostings = subhostingsByParent.get(service.id) || [];
                    const hasSubhostings = service.service_type === 'Hosting' && childSubhostings.length > 0;
                    const isExpanded = expandedHostingIds.has(service.id);

                    return (
                      <React.Fragment key={service.id}>
                        <tr 
                          className={`hover:bg-[#F8F6FC]/70 transition-colors ${
                            isExpired ? 'bg-red-50/40' : isCritical ? 'bg-amber-50/40' : ''
                          }`}
                        >
                          {/* Dominio / Servicio con icono y desplegable condicional */}
                          <td className="py-3.5 px-4">
                            <div className="flex items-center gap-2.5">
                              {/* Desplegable SOLO se genera si es Hosting con subhostings */}
                              {hasSubhostings ? (
                                <button
                                  type="button"
                                  onClick={() => toggleExpandHosting(service.id)}
                                  className="p-1 rounded-lg hover:bg-purple-100 text-[#8E0E75] transition-colors cursor-pointer shrink-0"
                                  title={isExpanded ? 'Ocultar subhostings' : 'Ver subhostings alojados'}
                                  aria-label={isExpanded ? 'Ocultar subhostings' : 'Ver subhostings alojados'}
                                >
                                  {isExpanded ? (
                                    <ChevronDown className="h-4 w-4 stroke-[2.5]" />
                                  ) : (
                                    <ChevronRight className="h-4 w-4 stroke-[2.5]" />
                                  )}
                                </button>
                              ) : null}

                              <span className="p-1.5 rounded-lg bg-[#F8F6FC] border border-[#D8CFF0] text-[#8E0E75] shrink-0">
                                {service.service_type?.toLowerCase() === 'dominio' ? (
                                  <Globe className="h-4 w-4" />
                                ) : service.service_type?.toLowerCase() === 'correo' ? (
                                  <Mail className="h-4 w-4" />
                                ) : service.service_type?.toLowerCase() === 'subhosting' ? (
                                  <Layers className="h-4 w-4" />
                                ) : (
                                  <Server className="h-4 w-4" />
                                )}
                              </span>

                              <div className="min-w-0">
                                <div className="flex items-center gap-2">
                                  <span className="font-black text-[#292929] block truncate hover:text-[#8E0E75]">
                                    {service.name}
                                  </span>
                                  {hasSubhostings && (
                                    <button
                                      type="button"
                                      onClick={() => toggleExpandHosting(service.id)}
                                      className="px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-purple-100 hover:bg-purple-200 text-[#8E0E75] border border-purple-200 transition-colors cursor-pointer shrink-0"
                                    >
                                      Multihosting ({childSubhostings.length})
                                    </button>
                                  )}
                                </div>
                                {service.notes && (
                                  <span className="text-[10px] text-slate-400 block truncate max-w-[200px]">
                                    {service.notes}
                                  </span>
                                )}
                              </div>
                            </div>
                          </td>

                          {/* Tipo de Servicio */}
                          <td className="py-3.5 px-3">
                            <span className="px-2 py-0.5 rounded-lg text-[10px] font-black uppercase tracking-wider bg-white border border-[#D8CFF0] text-[#8E0E75]">
                              {service.service_type}
                            </span>
                          </td>

                          {/* Proveedor Más Grande y Destacado */}
                          <td className="py-3.5 px-3">
                            <span className="inline-flex items-center px-2.5 py-1 rounded-xl text-xs font-black uppercase tracking-wider bg-[#F8F6FC] border border-[#D8CFF0] text-[#191654] shadow-2xs">
                              {service.provider || 'Cdmon'}
                            </span>
                          </td>

                          {/* Cliente Asignado */}
                          <td className="py-3.5 px-3">
                            <span className="font-bold text-[#292929] block truncate max-w-[180px]">
                              {service.client_name || '-'}
                            </span>
                          </td>

                          {/* Ciclo */}
                          <td className="py-3.5 px-3 text-[#4A4A4A] font-semibold">
                            {service.renewal_cycle || 'Anual'}
                          </td>

                          {/* Tiempo Restante / Fecha */}
                          <td className="py-3.5 px-4">
                            <div className="flex flex-col gap-0.5">
                              <span
                                className={`inline-flex items-center gap-1 font-black tabular-nums text-xs ${
                                  isExpired
                                    ? 'text-red-600 font-extrabold'
                                    : isCritical
                                    ? 'text-red-500'
                                    : isWarning
                                    ? 'text-amber-600'
                                    : isNotice
                                    ? 'text-[#191654]'
                                    : 'text-emerald-700'
                                }`}
                              >
                                {isExpired
                                  ? `${Math.abs(days)} días caducado`
                                  : days === 0
                                  ? 'Caduca hoy'
                                  : `${days} días para caducar`}
                              </span>
                              <span className="text-[11px] text-slate-400 font-mono">
                                {service.expiration_date.split('-').reverse().join('/')}
                              </span>
                            </div>
                          </td>

                          {/* Renovación Automática */}
                          <td className="py-3.5 px-3 text-center">
                            <button
                              type="button"
                              onClick={() => handleToggleAutoRenew(service)}
                              className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-extrabold uppercase tracking-wider border cursor-pointer transition-colors ${
                                service.auto_renew
                                  ? 'bg-emerald-50 text-emerald-800 border-emerald-300 hover:bg-emerald-100'
                                  : 'bg-red-50 text-red-700 border-red-200 hover:bg-red-100'
                              }`}
                              title="Haz clic para alternar el estado de auto-renovación"
                            >
                              <span className={`h-1.5 w-1.5 rounded-full ${service.auto_renew ? 'bg-emerald-500' : 'bg-red-500'}`} />
                              <span>{service.auto_renew ? 'Activada' : 'Desactivada'}</span>
                            </button>
                          </td>

                          {/* Acciones */}
                          <td className="py-3.5 px-4 text-right">
                            <div className="inline-flex items-center gap-1.5">
                              {/* Botón rápido "+ Subhosting" solo para Hostings */}
                              {service.service_type === 'Hosting' && (
                                <button
                                  type="button"
                                  onClick={() => {
                                    setEditingService(null);
                                    setDefaultParentForCreate(service.id);
                                    setIsCreateModalOpen(true);
                                  }}
                                  className="px-2 py-1 rounded-lg border border-purple-300 bg-purple-50 hover:bg-purple-100 text-[#8E0E75] text-[10px] font-black uppercase tracking-tight transition-colors cursor-pointer"
                                  title="Añadir un subhosting dentro de este servidor"
                                >
                                  + Subhosting
                                </button>
                              )}

                              {/* Plantilla de Email */}
                              <button
                                type="button"
                                onClick={() => handleOpenEmail(service, days)}
                                className="p-1.5 rounded-lg border border-[#D8CFF0] hover:border-[#8E0E75] hover:bg-[#F8F6FC] text-[#8E0E75] transition-colors cursor-pointer"
                                title="Generar correo de aviso para el cliente"
                              >
                                <Mail className="h-4 w-4" />
                              </button>

                              {/* Renovar +1 año con ventana de confirmación */}
                              <button
                                type="button"
                                onClick={() => setRenewalConfirmService(service)}
                                className="px-2.5 py-1 rounded-lg bg-[#8E0E75] hover:bg-[#700B5C] text-white text-[11px] font-black uppercase tracking-tight transition-all cursor-pointer shadow-2xs hover:scale-105 active:scale-95"
                                title="Extender fecha de vencimiento +1 año"
                              >
                                Renovar
                              </button>

                              {/* Editar */}
                              <button
                                type="button"
                                onClick={() => {
                                  setEditingService(service);
                                  setDefaultParentForCreate(null);
                                  setIsCreateModalOpen(true);
                                }}
                                className="p-1.5 rounded-lg border border-[#D8CFF0] hover:border-[#8E0E75] hover:bg-[#F8F6FC] text-[#4A4A4A] hover:text-[#8E0E75] transition-colors cursor-pointer"
                                title="Editar datos del servicio"
                              >
                                <Edit3 className="h-4 w-4" />
                              </button>

                              {/* Eliminar */}
                              <button
                                type="button"
                                onClick={() => handleDeleteService(service.id, service.name)}
                                className="p-1.5 rounded-lg border border-[#D8CFF0] hover:border-red-400 hover:bg-red-50 text-[#4A4A4A] hover:text-red-600 transition-colors cursor-pointer"
                                title="Eliminar servicio"
                              >
                                <Trash2 className="h-4 w-4" />
                              </button>
                            </div>
                          </td>
                        </tr>

                        {/* Desplegable Multihosting: solo si es Hosting y tiene subhostings asociados */}
                        {hasSubhostings && isExpanded && (
                          <tr className="bg-[#FAF7FD]">
                            <td colSpan={8} className="p-0 border-b border-[#D8CFF0]">
                              <div className="pl-6 sm:pl-10 pr-4 py-3 bg-[#FAF7FD] border-l-4 border-l-[#8E0E75] space-y-2.5">
                                <div className="flex items-center justify-between">
                                  <div className="flex items-center gap-2">
                                    <span className="p-1 rounded-md bg-purple-100 text-[#8E0E75]">
                                      <Layers className="h-3.5 w-3.5" />
                                    </span>
                                    <span className="text-xs font-black uppercase tracking-wider text-[#191654]">
                                      Subhostings alojados en {service.name} ({childSubhostings.length})
                                    </span>
                                  </div>

                                  <button
                                    type="button"
                                    onClick={() => {
                                      setEditingService(null);
                                      setDefaultParentForCreate(service.id);
                                      setIsCreateModalOpen(true);
                                    }}
                                    className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-white border border-[#D8CFF0] hover:border-[#8E0E75] text-[#8E0E75] text-[10px] font-black uppercase tracking-wider transition-all cursor-pointer shadow-2xs hover:scale-102"
                                  >
                                    <Plus className="h-3 w-3" />
                                    <span>Añadir Subhosting</span>
                                  </button>
                                </div>

                                {/* Tabla anidada con toda la información del Subhosting */}
                                <div className="rounded-xl border border-[#D8CFF0] bg-white overflow-hidden shadow-2xs">
                                  <table className="w-full text-left text-xs">
                                    <thead className="bg-[#F8F6FC] border-b border-[#D8CFF0] text-[10px] font-black uppercase tracking-wider text-[#4A4A4A]">
                                      <tr>
                                        <th className="py-2.5 px-3">Subhosting / Dominio</th>
                                        <th className="py-2.5 px-3">Tipo</th>
                                        <th className="py-2.5 px-3">Proveedor</th>
                                        <th className="py-2.5 px-3">Cliente</th>
                                        <th className="py-2.5 px-3">Ciclo</th>
                                        <th className="py-2.5 px-3">Tiempo Restante</th>
                                        <th className="py-2.5 px-3 text-center">Auto-Renovación</th>
                                        <th className="py-2.5 px-3 text-right">Acciones</th>
                                      </tr>
                                    </thead>
                                    <tbody className="divide-y divide-[#EAE4F5]">
                                      {childSubhostings.map((child) => {
                                        const childDays = calculateDaysRemaining(child.expiration_date);
                                        const childExpired = childDays < 0;
                                        const childCritical = childDays >= 0 && childDays <= 7;
                                        const childWarning = childDays > 7 && childDays <= 15;
                                        const childNotice = childDays > 15 && childDays <= 30;

                                        return (
                                          <tr key={child.id} className="hover:bg-[#F8F6FC]/80 transition-colors">
                                            {/* Nombre */}
                                            <td className="py-2.5 px-3">
                                              <div className="flex items-center gap-2">
                                                <CornerDownRight className="h-3.5 w-3.5 text-[#8E0E75] shrink-0" />
                                                <span className="font-black text-[#292929]">
                                                  {child.name}
                                                </span>
                                              </div>
                                            </td>

                                            {/* Tipo */}
                                            <td className="py-2.5 px-3">
                                              <span className="px-2 py-0.5 rounded-lg text-[10px] font-black uppercase tracking-wider bg-purple-50 border border-purple-200 text-[#8E0E75]">
                                                Subhosting
                                              </span>
                                            </td>

                                            {/* Proveedor */}
                                            <td className="py-2.5 px-3">
                                              <span className="inline-flex items-center px-2 py-0.5 rounded-lg text-[11px] font-black uppercase tracking-wider bg-[#F8F6FC] border border-[#D8CFF0] text-[#191654]">
                                                {child.provider || service.provider || 'Cdmon'}
                                              </span>
                                            </td>

                                            {/* Cliente */}
                                            <td className="py-2.5 px-3 font-semibold text-[#292929]">
                                              {child.client_name || service.client_name || '-'}
                                            </td>

                                            {/* Ciclo */}
                                            <td className="py-2.5 px-3 text-[#4A4A4A]">
                                              {child.renewal_cycle || 'Anual'}
                                            </td>

                                            {/* Vencimiento */}
                                            <td className="py-2.5 px-3">
                                              <div className="flex flex-col">
                                                <span
                                                  className={`font-black tabular-nums text-[11px] ${
                                                    childExpired
                                                      ? 'text-red-600 font-extrabold'
                                                      : childCritical
                                                      ? 'text-red-500'
                                                      : childWarning
                                                      ? 'text-amber-600'
                                                      : childNotice
                                                      ? 'text-[#191654]'
                                                      : 'text-emerald-700'
                                                  }`}
                                                >
                                                  {childExpired
                                                    ? `${Math.abs(childDays)} días caducado`
                                                    : childDays === 0
                                                    ? 'Caduca hoy'
                                                    : `${childDays} días`}
                                                </span>
                                                <span className="text-[10px] text-slate-400 font-mono">
                                                  {child.expiration_date.split('-').reverse().join('/')}
                                                </span>
                                              </div>
                                            </td>

                                            {/* Auto-renovación */}
                                            <td className="py-2.5 px-3 text-center">
                                              <button
                                                type="button"
                                                onClick={() => handleToggleAutoRenew(child)}
                                                className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[9px] font-extrabold uppercase tracking-wider border cursor-pointer ${
                                                  child.auto_renew
                                                    ? 'bg-emerald-50 text-emerald-800 border-emerald-300 hover:bg-emerald-100'
                                                    : 'bg-red-50 text-red-700 border-red-200 hover:bg-red-100'
                                                }`}
                                              >
                                                <span className={`h-1.5 w-1.5 rounded-full ${child.auto_renew ? 'bg-emerald-500' : 'bg-red-500'}`} />
                                                <span>{child.auto_renew ? 'Activa' : 'Desact.'}</span>
                                              </button>
                                            </td>

                                            {/* Acciones */}
                                            <td className="py-2.5 px-3 text-right">
                                              <div className="inline-flex items-center gap-1">
                                                <button
                                                  type="button"
                                                  onClick={() => handleOpenEmail(child, childDays)}
                                                  className="p-1 rounded-md border border-[#D8CFF0] hover:border-[#8E0E75] hover:bg-[#F8F6FC] text-[#8E0E75] transition-colors cursor-pointer"
                                                  title="Generar correo"
                                                >
                                                  <Mail className="h-3.5 w-3.5" />
                                                </button>
                                                <button
                                                  type="button"
                                                  onClick={() => setRenewalConfirmService(child)}
                                                  className="px-2 py-0.5 rounded-md bg-[#8E0E75] hover:bg-[#700B5C] text-white text-[10px] font-black uppercase transition-all cursor-pointer shadow-2xs"
                                                  title="Renovar +1 año"
                                                >
                                                  Renovar
                                                </button>
                                                <button
                                                  type="button"
                                                  onClick={() => {
                                                    setEditingService(child);
                                                    setDefaultParentForCreate(service.id);
                                                    setIsCreateModalOpen(true);
                                                  }}
                                                  className="p-1 rounded-md border border-[#D8CFF0] hover:border-[#8E0E75] hover:bg-[#F8F6FC] text-[#4A4A4A] hover:text-[#8E0E75] transition-colors cursor-pointer"
                                                  title="Editar"
                                                >
                                                  <Edit3 className="h-3.5 w-3.5" />
                                                </button>
                                                <button
                                                  type="button"
                                                  onClick={() => handleDeleteService(child.id, child.name)}
                                                  className="p-1 rounded-md border border-[#D8CFF0] hover:border-red-400 hover:bg-red-50 text-[#4A4A4A] hover:text-red-600 transition-colors cursor-pointer"
                                                  title="Eliminar"
                                                >
                                                  <Trash2 className="h-3.5 w-3.5" />
                                                </button>
                                              </div>
                                            </td>
                                          </tr>
                                        );
                                      })}
                                    </tbody>
                                  </table>
                                </div>
                              </div>
                            </td>
                          </tr>
                        )}
                      </React.Fragment>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>

          {/* Paginación Inferior */}
          {totalPages > 1 && (
            <div className="p-3.5 bg-[#F8F6FC] border-t border-[#D8CFF0] flex items-center justify-between">
              <span className="text-xs text-[#4A4A4A]">
                Página <strong>{currentPage}</strong> de <strong>{totalPages}</strong> ({filteredServices.length} servicios)
              </span>

              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  disabled={currentPage <= 1}
                  onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                  className="p-1.5 rounded-lg border border-[#D8CFF0] bg-white text-[#4A4A4A] hover:text-[#8E0E75] disabled:opacity-40 cursor-pointer"
                  aria-label="Página anterior"
                >
                  <ChevronLeft className="h-4 w-4" />
                </button>
                
                <span className="text-xs font-bold px-2 text-[#292929]">
                  {currentPage} / {totalPages}
                </span>

                <button
                  type="button"
                  disabled={currentPage >= totalPages}
                  onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                  className="p-1.5 rounded-lg border border-[#D8CFF0] bg-white text-[#4A4A4A] hover:text-[#8E0E75] disabled:opacity-40 cursor-pointer"
                  aria-label="Página siguiente"
                >
                  <ChevronRight className="h-4 w-4" />
                </button>
              </div>
            </div>
          )}
        </div>
      </main>

      {/* Drawer de Notificaciones & Alertas (7, 15, 30, 60, 90 días) */}
      <HostingNotificationsDrawer
        isOpen={isDrawerOpen}
        onClose={() => setIsDrawerOpen(false)}
        alerts={alerts}
        onOpenEmailModal={handleOpenEmail}
        onRenewService={handleRenewService}
        onToggleNotificationStage={handleToggleNotificationStage}
      />

      {/* Modal de Creación / Edición */}
      <HostingModal
        isOpen={isCreateModalOpen}
        onClose={() => {
          setIsCreateModalOpen(false);
          setDefaultParentForCreate(null);
        }}
        onSave={handleSaveService}
        serviceToEdit={editingService}
        parentHostings={parentHostingsList}
        defaultParentId={defaultParentForCreate}
      />

      {/* Modal de Redacción de Email para Cliente */}
      <HostingEmailModal
        isOpen={isEmailModalOpen}
        onClose={() => setIsEmailModalOpen(false)}
        service={emailServiceTarget?.service || null}
        daysRemaining={emailServiceTarget?.days || 0}
      />

      {/* Modal de Importación CSV */}
      <HostingImportModal
        isOpen={isImportModalOpen}
        onClose={() => setIsImportModalOpen(false)}
        onImport={handleImportCSV}
      />

      {/* Modal de Confirmación de Renovación */}
      <HostingRenewalConfirmModal
        isOpen={Boolean(renewalConfirmService)}
        onClose={() => setRenewalConfirmService(null)}
        service={renewalConfirmService}
        onConfirm={async (id) => {
          await handleRenewService(id);
          notify(`Servicio ${renewalConfirmService?.name} renovado con éxito por 1 año.`, { type: 'success' });
        }}
      />
    </div>
  );
}

