export type StorageProviderMode = 'simulator' | 'google_drive';

export type InternalFileStatus = 'pending_review' | 'changes_requested' | 'validated';

export type ClientFeedbackStatus = 'pending' | 'approved' | 'adjustment_requested';

export type BriefingStatus = 'new' | 'reviewed' | 'archived';

export type DriveFolderZone =
  | 'internal_pending'
  | 'internal_changes'
  | 'internal_validated'
  | 'client_deliverables'
  | 'client_briefings';

export interface InternalFileVersion {
  id: string;
  work_file_id: string;
  version_number: number;
  file_name: string;
  mime_type: string;
  size_bytes: number;
  drive_file_id: string;
  drive_folder_path: string;
  change_note?: string | null;
  uploaded_by: string;
  uploaded_by_name: string;
  created_at: string;
}

export interface InternalWorkFile {
  id: string;
  company_id: string;
  company_name?: string;
  uploaded_by: string;
  uploaded_by_name: string;
  title: string;
  file_name: string;
  mime_type: string;
  size_bytes: number;
  storage_provider: StorageProviderMode;
  drive_file_id: string;
  drive_folder_path: string;
  current_version: number;
  status: InternalFileStatus;
  is_client_published: boolean;
  worker_note?: string | null;
  review_reason?: string | null;
  reviewed_by?: string | null;
  reviewed_by_name?: string | null;
  reviewed_at?: string | null;
  published_at?: string | null;
  created_at: string;
  updated_at: string;
  versions?: InternalFileVersion[];
}

export interface ClientDeliverable {
  id: string;
  source_work_file_id: string;
  company_id: string;
  company_name?: string;
  title: string;
  file_name: string;
  mime_type: string;
  size_bytes: number;
  version_number: number;
  storage_provider: StorageProviderMode;
  drive_file_id: string;
  drive_folder_path: string;
  published_by?: string | null;
  published_by_name?: string | null;
  client_feedback_status: ClientFeedbackStatus;
  client_feedback_note?: string | null;
  published_at: string;
  updated_at: string;
}

export interface ClientBriefingFile {
  id: string;
  company_id: string;
  company_name?: string;
  title: string;
  description?: string | null;
  file_name: string;
  mime_type: string;
  size_bytes: number;
  storage_provider: StorageProviderMode;
  drive_file_id: string;
  drive_folder_path: string;
  uploaded_by_contact: string;
  status: BriefingStatus;
  reviewed_by?: string | null;
  reviewed_at?: string | null;
  created_at: string;
}

export interface ClientPortalAccessConfig {
  id: string;
  company_id: string;
  company_name?: string;
  portal_token: string;
  /** En modo simulador guardamos hash y opcionalmente pista enmascarada para la coordinadora */
  pin_hash: string;
  pin_hint?: string;
  is_enabled: boolean;
  failed_attempts: number;
  locked_until?: string | null;
  last_access_at?: string | null;
  created_by?: string | null;
  created_at: string;
  updated_at: string;
}

export type FileNotificationType =
  | 'file_changes_requested'
  | 'file_validated'
  | 'file_published'
  | 'new_worker_upload'
  | 'new_client_briefing'
  | 'client_feedback';

export interface FileNotification {
  id: string;
  recipient_user_id?: string | null;
  recipient_role?: 'admin' | 'coordinator' | 'employee' | null;
  company_id?: string | null;
  work_file_id?: string | null;
  briefing_id?: string | null;
  type: FileNotificationType;
  title: string;
  message: string;
  is_read: boolean;
  created_at: string;
}

export interface SimulatedDriveEntry {
  name: string;
  kind: 'folder' | 'file';
  relativePath: string;
  zone?: DriveFolderZone;
  sizeBytes?: number;
  modifiedAt?: string;
  children?: SimulatedDriveEntry[];
}

export interface ClientPortalSessionPayload {
  scope: 'client_portal';
  companyId: string;
  companyName: string;
  portalToken: string;
  exp: number;
}

