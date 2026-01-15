export type SocialPlatform = "linkedin" | "twitter" | "facebook";

export type AccountStatus = "connected" | "disconnected" | "token_expired" | "error";

export type PostStatus =
  | "draft"
  | "scheduled"
  | "queued"
  | "publishing"
  | "published"
  | "failed"
  | "cancelled";

export type MediaType = "image" | "video" | "gif" | "link";

export interface SocialAccount {
  id: string;
  platform: SocialPlatform;
  platform_user_id: string;
  platform_username: string;
  display_name?: string;
  profile_image_url?: string;
  status: AccountStatus;
  error_message?: string;
  token_expires_at?: string;
  created_at: string;
}

export interface SocialPost {
  id: string;
  account_id: string;
  content: string;
  link_url?: string;
  link_title?: string;
  link_description?: string;
  status: PostStatus;
  scheduled_at?: string;
  published_at?: string;
  timezone: string;
  platform_post_id?: string;
  platform_post_url?: string;
  error_message?: string;
  retry_count: number;
  created_at: string;
}

export interface SocialPostWithAnalytics extends SocialPost {
  impressions: number;
  reach: number;
  likes: number;
  comments: number;
  shares: number;
  clicks: number;
  engagement_rate: number;
}

export interface SocialPostCreate {
  account_id: string;
  content: string;
  link_url?: string;
  link_title?: string;
  link_description?: string;
  scheduled_at?: string;
  timezone?: string;
}

export interface MediaAttachment {
  id: string;
  post_id: string;
  media_type: MediaType;
  file_url: string;
  thumbnail_url?: string;
  alt_text?: string;
  file_size?: number;
  width?: number;
  height?: number;
  duration_seconds?: number;
  order: number;
}

export interface MediaAttachmentCreate {
  media_type: MediaType;
  file_url: string;
  thumbnail_url?: string;
  alt_text?: string;
  order?: number;
}

// Calendar event representation
export interface CalendarEvent {
  id: string;
  post: SocialPost;
  account: SocialAccount;
  date: Date;
}

// Inbox types
export type MessageType = "direct_message" | "mention" | "comment" | "reply";
export type MessageStatus = "unread" | "read" | "responded" | "archived";

export interface SocialMessage {
  id: string;
  account_id: string;
  platform: SocialPlatform;
  platform_message_id: string;
  thread_id?: string;
  message_type: MessageType;
  content: string;
  sender_platform_id: string;
  sender_username: string;
  sender_display_name?: string;
  sender_profile_image?: string;
  received_at: string;
  status: MessageStatus;
  read_at?: string;
  responded_at?: string;
  assigned_to?: string;
  contact_id?: string;
  company_id?: string;
  created_at: string;
}

export interface SocialMessageReply {
  id: string;
  message_id: string;
  content: string;
  sent_at: string;
  sent_by: string;
  platform_reply_id?: string;
  send_status: string;
  error_message?: string;
}

export interface InboxStats {
  total: number;
  unread: number;
  responded: number;
  by_platform: Record<string, number>;
  by_type: Record<string, number>;
}

// Analytics types
export interface AnalyticsOverview {
  total_posts: number;
  total_impressions: number;
  total_reach: number;
  total_engagement: number;
  avg_engagement_rate: number;
  total_likes: number;
  total_comments: number;
  total_shares: number;
  total_clicks: number;
}

export interface PlatformAnalytics {
  platform: SocialPlatform;
  posts: number;
  impressions: number;
  reach: number;
  likes: number;
  comments: number;
  shares: number;
  clicks: number;
  engagement_rate: number;
}

export interface TimelineDataPoint {
  period: string;
  posts: number;
  impressions: number;
  reach: number;
  likes: number;
  comments: number;
  shares: number;
  clicks: number;
  engagement: number;
}

export interface TopPost {
  id: string;
  content: string;
  published_at?: string;
  platform?: SocialPlatform;
  platform_username?: string;
  platform_post_url?: string;
  impressions: number;
  reach: number;
  likes: number;
  comments: number;
  shares: number;
  clicks: number;
  engagement_rate: number;
  total_engagement: number;
}

export interface EngagementBreakdown {
  likes: number;
  comments: number;
  shares: number;
  clicks: number;
  saves: number;
}

export interface PostingFrequency {
  by_day_of_week: { day: string; posts: number; engagement: number }[];
  by_hour: { hour: number; posts: number; engagement: number }[];
}

export interface AccountPerformance {
  account_id: string;
  platform: SocialPlatform;
  username: string;
  display_name?: string;
  profile_image?: string;
  posts: number;
  impressions: number;
  reach: number;
  likes: number;
  comments: number;
  shares: number;
  engagement_rate: number;
}
