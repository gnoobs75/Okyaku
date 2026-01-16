export type ReportType =
  | "social_performance"
  | "engagement_summary"
  | "content_analysis"
  | "audience_insights"
  | "competitor_comparison"
  | "ab_test_results"
  | "campaign_report"
  | "custom";

export type ReportFormat = "pdf" | "csv" | "excel" | "json";

export type ReportStatus =
  | "pending"
  | "generating"
  | "completed"
  | "failed"
  | "expired";

export type ReportFrequency =
  | "daily"
  | "weekly"
  | "biweekly"
  | "monthly"
  | "quarterly";

export interface Report {
  id: string;
  owner_id: string;
  name: string;
  report_type: ReportType;
  format: ReportFormat;
  description?: string;
  date_from: string;
  date_to: string;
  platforms?: string;
  account_ids?: string;
  include_charts: boolean;
  include_raw_data: boolean;
  compare_previous_period: boolean;
  status: ReportStatus;
  file_path?: string;
  file_size?: number;
  error_message?: string;
  requested_at: string;
  started_at?: string;
  completed_at?: string;
  expires_at?: string;
  download_count: number;
  last_downloaded_at?: string;
  created_at: string;
}

export interface ReportCreate {
  name: string;
  report_type: ReportType;
  format?: ReportFormat;
  description?: string;
  date_from: string;
  date_to: string;
  platforms?: string;
  account_ids?: string;
  include_charts?: boolean;
  include_raw_data?: boolean;
  compare_previous_period?: boolean;
}

export interface ScheduledReport {
  id: string;
  owner_id: string;
  name: string;
  report_type: ReportType;
  format: ReportFormat;
  frequency: ReportFrequency;
  platforms?: string;
  account_ids?: string;
  include_charts: boolean;
  compare_previous_period: boolean;
  email_recipients?: string;
  is_active: boolean;
  next_run_at?: string;
  last_run_at?: string;
  last_report_id?: string;
  run_count: number;
  failure_count: number;
  created_at: string;
  updated_at: string;
}

export interface ScheduledReportCreate {
  name: string;
  report_type: ReportType;
  format?: ReportFormat;
  frequency: ReportFrequency;
  platforms?: string;
  account_ids?: string;
  include_charts?: boolean;
  compare_previous_period?: boolean;
  email_recipients?: string;
}

export interface ReportTemplate {
  id: string;
  owner_id?: string;
  name: string;
  description?: string;
  report_type: ReportType;
  format: ReportFormat;
  default_days: number;
  platforms?: string;
  include_charts: boolean;
  compare_previous_period: boolean;
  is_system: boolean;
  times_used: number;
  last_used_at?: string;
  created_at: string;
}

export interface ReportTemplateCreate {
  name: string;
  description?: string;
  report_type: ReportType;
  format?: ReportFormat;
  default_days?: number;
  platforms?: string;
  include_charts?: boolean;
  compare_previous_period?: boolean;
}

export interface ReportingStats {
  total_reports: number;
  completed_reports: number;
  active_schedules: number;
  total_downloads: number;
  type_breakdown: Record<string, number>;
  recent_reports: Array<{
    id: string;
    name: string;
    type: ReportType;
    format: ReportFormat;
    status: ReportStatus;
    created_at: string;
  }>;
}
