export type ServiceType = 
  | 'Hosting' 
  | 'Dominio' 
  | 'Correo' 
  | 'Subhosting';

export type RenewalCycle = 
  | 'Anual' 
  | 'Semestral' 
  | 'Trimestral' 
  | 'Mensual' 
  | 'Bienal' 
  | 'Trienal';

export type HostingStatus = 'active' | 'expired' | 'renewed' | 'cancelled';

export interface NotificationStages {
  '7': boolean;
  '15': boolean;
  '30': boolean;
  '60': boolean;
  '90': boolean;
}

export interface HostingService {
  id: string;
  name: string; // ej: artedanceterrassa.com
  service_type: ServiceType | string;
  renewal_cycle: RenewalCycle | string;
  expiration_date: string; // ISO YYYY-MM-DD
  auto_renew: boolean;
  payment_method: string;
  provider: string; // 'Cdmon', 'OVH', 'SiteGround', etc.
  parent_id?: string | null; // ID del Hosting principal si es un Subhosting (Multihosting)
  client_name?: string; // Nombre del cliente asignado
  company_id?: string | null; // ID de empresa en Supabase si está enlazada
  price_cost?: number; // Coste proveedor en €
  price_client?: number; // Precio cobrado al cliente en €
  status: HostingStatus;
  notes?: string;
  last_notified_at?: string | null;
  notification_stages?: NotificationStages;
  created_at?: string;
  updated_at?: string;
}

export interface HostingAlert {
  service: HostingService;
  daysRemaining: number;
  urgency: 'expired' | 'critical_7' | 'warning_15' | 'notice_30' | 'pre_60' | 'pre_90' | 'future';
  stageKey: '7' | '15' | '30' | '60' | '90' | null;
  isNotified: boolean;
}

export interface HostingMetrics {
  totalServices: number;
  expiredCount: number;
  critical7Days: number;
  warning15Days: number;
  notice30Days: number;
  notice60Days: number;
  notice90Days: number;
  autoRenewDisabled: number;
  totalHostings: number;
  totalDomains: number;
  totalEmails: number;
  totalSubhostings: number;
}

