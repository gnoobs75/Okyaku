export type CalendarProvider = "google" | "outlook";

export type CalendarConnectionStatus = "active" | "expired" | "revoked" | "error";

export type EventSyncStatus = "synced" | "pending" | "failed" | "local_only";

export interface CalendarConnection {
  id: string;
  owner_id: string;
  provider: CalendarProvider;
  status: CalendarConnectionStatus;
  provider_email?: string;
  calendar_id?: string;
  sync_enabled: boolean;
  sync_direction: string;
  last_synced_at?: string;
  error_count: number;
  created_at: string;
  updated_at?: string;
}

export interface CalendarConnectionCreate {
  provider: CalendarProvider;
  access_token: string;
  refresh_token?: string;
  token_expires_at?: string;
  provider_account_id?: string;
  provider_email?: string;
  calendar_id?: string;
}

export interface CalendarConnectionUpdate {
  status?: CalendarConnectionStatus;
  sync_enabled?: boolean;
  sync_direction?: string;
  calendar_id?: string;
}

export interface CalendarEvent {
  id: string;
  owner_id: string;
  connection_id: string;
  external_id?: string;
  external_link?: string;
  title: string;
  description?: string;
  location?: string;
  start_time: string;
  end_time: string;
  all_day: boolean;
  timezone: string;
  is_recurring: boolean;
  contact_id?: string;
  attendees: Record<string, { name?: string; response?: string }>;
  meeting_link?: string;
  sync_status: EventSyncStatus;
  activity_id?: string;
  created_at: string;
  updated_at?: string;
}

export interface CalendarEventCreate {
  connection_id: string;
  title: string;
  description?: string;
  location?: string;
  start_time: string;
  end_time: string;
  all_day?: boolean;
  timezone?: string;
  contact_id?: string;
  attendees?: Record<string, { name?: string; response?: string }>;
  meeting_link?: string;
}

export interface CalendarEventUpdate {
  title?: string;
  description?: string;
  location?: string;
  start_time?: string;
  end_time?: string;
  all_day?: boolean;
  timezone?: string;
  contact_id?: string;
  attendees?: Record<string, { name?: string; response?: string }>;
  meeting_link?: string;
}

export interface SchedulingLink {
  id: string;
  owner_id: string;
  connection_id?: string;
  name: string;
  slug: string;
  description?: string;
  duration_minutes: number;
  buffer_before: number;
  buffer_after: number;
  availability: Record<string, Array<{ start: string; end: string }>>;
  timezone: string;
  min_notice_hours: number;
  max_days_ahead: number;
  location_type: string;
  location?: string;
  meeting_provider?: string;
  questions: Record<string, unknown>;
  confirmation_message?: string;
  is_active: boolean;
  booking_count: number;
  created_at: string;
  updated_at?: string;
}

export interface SchedulingLinkCreate {
  name: string;
  slug: string;
  description?: string;
  duration_minutes?: number;
  buffer_before?: number;
  buffer_after?: number;
  availability?: Record<string, Array<{ start: string; end: string }>>;
  timezone?: string;
  min_notice_hours?: number;
  max_days_ahead?: number;
  location_type?: string;
  location?: string;
  meeting_provider?: string;
  questions?: Record<string, unknown>;
  confirmation_message?: string;
  connection_id?: string;
}

export interface SchedulingLinkUpdate {
  name?: string;
  slug?: string;
  description?: string;
  duration_minutes?: number;
  buffer_before?: number;
  buffer_after?: number;
  availability?: Record<string, Array<{ start: string; end: string }>>;
  timezone?: string;
  min_notice_hours?: number;
  max_days_ahead?: number;
  location_type?: string;
  location?: string;
  meeting_provider?: string;
  questions?: Record<string, unknown>;
  confirmation_message?: string;
  is_active?: boolean;
  connection_id?: string;
}

export interface ScheduledMeeting {
  id: string;
  owner_id: string;
  link_id: string;
  guest_name: string;
  guest_email: string;
  guest_phone?: string;
  guest_notes?: string;
  contact_id?: string;
  start_time: string;
  end_time: string;
  timezone: string;
  meeting_link?: string;
  calendar_event_id?: string;
  responses: Record<string, unknown>;
  status: string;
  cancelled_at?: string;
  cancellation_reason?: string;
  created_at: string;
  updated_at?: string;
}

export interface ScheduledMeetingCreate {
  link_id: string;
  guest_name: string;
  guest_email: string;
  guest_phone?: string;
  guest_notes?: string;
  start_time: string;
  end_time: string;
  timezone: string;
  responses?: Record<string, unknown>;
}

export interface TimeSlot {
  start: string;
  end: string;
}

export interface BookingPageInfo {
  name: string;
  description?: string;
  duration_minutes: number;
  timezone: string;
  questions: Record<string, unknown>;
  owner_name: string;
}
