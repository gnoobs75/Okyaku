export type CampaignStatus =
  | "draft"
  | "scheduled"
  | "sending"
  | "sent"
  | "paused"
  | "cancelled";

export type DeliveryStatus =
  | "pending"
  | "sent"
  | "delivered"
  | "opened"
  | "clicked"
  | "bounced"
  | "complained"
  | "unsubscribed"
  | "failed";

export interface EmailTemplate {
  id: string;
  name: string;
  subject: string;
  html_content: string;
  text_content?: string;
  description?: string;
  variables: Record<string, string>;
  is_active: boolean;
  created_at: string;
  updated_at?: string;
}

export interface EmailTemplateCreate {
  name: string;
  subject: string;
  html_content: string;
  text_content?: string;
  description?: string;
  variables?: Record<string, string>;
}

export interface EmailCampaign {
  id: string;
  name: string;
  description?: string;
  status: CampaignStatus;
  template_id: string;
  subject?: string;
  scheduled_at?: string;
  started_at?: string;
  completed_at?: string;
  recipient_filter: Record<string, unknown>;
  track_opens: boolean;
  track_clicks: boolean;
  created_at: string;
  updated_at?: string;
}

export interface EmailCampaignWithMetrics extends EmailCampaign {
  total_recipients: number;
  sent_count: number;
  delivered_count: number;
  opened_count: number;
  clicked_count: number;
  bounced_count: number;
  open_rate: number;
  click_rate: number;
}

export interface EmailCampaignCreate {
  name: string;
  description?: string;
  template_id: string;
  subject?: string;
  scheduled_at?: string;
  recipient_filter?: Record<string, unknown>;
  track_opens?: boolean;
  track_clicks?: boolean;
}

export interface EmailRecipient {
  id: string;
  campaign_id: string;
  contact_id?: string;
  email: string;
  first_name?: string;
  last_name?: string;
  status: DeliveryStatus;
  sent_at?: string;
  delivered_at?: string;
  opened_at?: string;
  clicked_at?: string;
  error_message?: string;
}

export interface CampaignMetrics {
  campaign_id: string;
  total_recipients: number;
  sent_count: number;
  delivered_count: number;
  opened_count: number;
  clicked_count: number;
  bounced_count: number;
  complained_count: number;
  unsubscribed_count: number;
  failed_count: number;
  unique_opens: number;
  unique_clicks: number;
  open_rate: number;
  click_rate: number;
  bounce_rate: number;
  last_calculated_at: string;
}
