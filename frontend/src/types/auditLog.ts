export type AuditAction =
  | "create"
  | "update"
  | "delete"
  | "view"
  | "export"
  | "import"
  | "login"
  | "logout"
  | "password_change"
  | "permission_change"
  | "bulk_update"
  | "bulk_delete"
  | "restore"
  | "archive";

export type EntityType =
  | "contact"
  | "company"
  | "deal"
  | "activity"
  | "task"
  | "user"
  | "pipeline"
  | "stage"
  | "email_campaign"
  | "email_template"
  | "social_post"
  | "social_account"
  | "calendar_event"
  | "scheduling_link"
  | "file"
  | "import"
  | "export"
  | "automation_rule"
  | "ab_test"
  | "report"
  | "settings";

export interface AuditLog {
  id: string;
  user_id?: string;
  user_email?: string;
  user_name?: string;
  entity_type: EntityType;
  entity_id: string;
  entity_name?: string;
  action: AuditAction;
  old_values?: Record<string, unknown>;
  new_values?: Record<string, unknown>;
  changed_fields?: string[];
  description?: string;
  ip_address?: string;
  request_id?: string;
  extra_data: Record<string, unknown>;
  created_at: string;
}

export interface AuditLogFilter {
  user_id?: string;
  entity_type?: EntityType;
  entity_id?: string;
  action?: AuditAction;
  date_from?: string;
  date_to?: string;
  search?: string;
}

export interface AuditLogStats {
  total_entries: number;
  entries_by_action: Record<string, number>;
  entries_by_entity_type: Record<string, number>;
  active_users: number;
  recent_activity: Array<{
    id: string;
    action: AuditAction;
    entity_type: EntityType;
    entity_name?: string;
    user_name?: string;
    created_at: string;
  }>;
}

export interface DataRetentionPolicy {
  id: string;
  entity_type: EntityType;
  retention_days: number;
  archive_after_days?: number;
  auto_cleanup_enabled: boolean;
  last_cleanup_at?: string;
  records_cleaned: number;
  audit_log_retention_days: number;
  is_active: boolean;
  created_at: string;
  updated_at?: string;
}

export interface DataRetentionPolicyCreate {
  entity_type: EntityType;
  retention_days?: number;
  archive_after_days?: number;
  auto_cleanup_enabled?: boolean;
  audit_log_retention_days?: number;
}

export interface DataRetentionPolicyUpdate {
  retention_days?: number;
  archive_after_days?: number;
  auto_cleanup_enabled?: boolean;
  audit_log_retention_days?: number;
  is_active?: boolean;
}

export interface GDPRExportRequest {
  id: string;
  user_id: string;
  requested_at: string;
  requested_by: string;
  include_contacts: boolean;
  include_companies: boolean;
  include_deals: boolean;
  include_activities: boolean;
  include_emails: boolean;
  include_audit_logs: boolean;
  status: string;
  started_at?: string;
  completed_at?: string;
  file_size?: number;
  error_message?: string;
  expires_at?: string;
  download_count: number;
  created_at: string;
}

export interface GDPRExportRequestCreate {
  user_id: string;
  include_contacts?: boolean;
  include_companies?: boolean;
  include_deals?: boolean;
  include_activities?: boolean;
  include_emails?: boolean;
  include_audit_logs?: boolean;
}

export interface ActionOption {
  value: AuditAction;
  label: string;
}

export interface EntityTypeOption {
  value: EntityType;
  label: string;
}
